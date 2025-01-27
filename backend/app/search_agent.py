# backend/app/search_agent.py
import os
import json
import re
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
import aiohttp
import structlog
from typing import List, Dict, Any

logger = structlog.get_logger()


class RunpodClient:
    def __init__(self, api_key: str, endpoint_url: str):
        self.api_key = api_key
        self.endpoint_id = endpoint_url.split('/v2/')[1].split('/')[0]
        from openai import OpenAI
        self.openai = OpenAI(
            api_key=api_key,
            base_url=f"https://api.runpod.ai/v2/{self.endpoint_id}/openai/v1"
        )

    def generate(self, prompt: str | list) -> str:
        """Generate response from RunPod API with detailed logging"""
        try:
            logger.info(
                "runpod_generate_request",
                caller=self._get_caller_info(),
                prompt_type=type(prompt).__name__
            )

            if isinstance(prompt, str):
                messages = [{"role": "user", "content": prompt}]
            else:
                messages = prompt

            logger.debug(
                "runpod_request_messages",
                messages=json.dumps(messages, indent=2)
            )

            response = self.openai.chat.completions.create(
                messages=messages,
                model="meta-llama/Llama-3.1-8B-Instruct",
                temperature=0.7,
                max_tokens=1000,
                top_p=0.9
            )

            if hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                result = response_dict['choices'][0]['message']['content']
            else:
                result = response['choices'][0]['message']['content']

            logger.debug(
                "runpod_response",
                response=result
            )

            return result

        except Exception as e:
            logger.error("runpod_api_error", error=str(e))
            return "```json\n[]\n```"

    def _get_caller_info(self) -> str:
        """Get information about which function called generate"""
        import inspect
        stack = inspect.stack()

        for frame in stack[1:]:
            if 'runpod_client.py' not in frame.filename:
                return f"{frame.function} in {os.path.basename(frame.filename)}"
        return "unknown"


def extract_json(response: str) -> list:
    """Extract and validate JSON array from the LLM response."""
    pattern = r'```json\s*(\[\s*.*?\])\s*```'
    match = re.search(pattern, response, re.DOTALL)

    if not match:
        pattern = r'\[\s*\{.*?\}\s*\]'
        match = re.search(pattern, response, re.DOTALL)

    if match:
        try:
            data = json.loads(match.group(
                1) if '```' in response else match.group(0))
            if isinstance(data, list):
                valid_items = []
                for item in data:
                    if isinstance(item, dict) and 'title' in item:
                        valid_item = {
                            'title': str(item['title']),
                            'media_type': str(item.get('media_type', 'movie')).lower()
                        }
                        # Ensure media_type is either 'movie' or 'tv'
                        if valid_item['media_type'] not in ['movie', 'tv']:
                            valid_item['media_type'] = 'movie'
                        valid_items.append(valid_item)
                return valid_items[:20]
        except json.JSONDecodeError:
            print(f"Failed to parse JSON: {response}")

    return []


class OllamaChat:
    def __init__(self, runpod_client: RunpodClient):
        self.runpod_client = runpod_client

    def ask(self, prompt: str | list):
        try:
            result = self.runpod_client.generate(prompt)
            return result
        except Exception as e:
            print(f"Error calling Runpod: {str(e)}")
            return "```json\n[]\n```"


class SearchQueryAgent:
    def __init__(self, llm: any, temperature: float = 0.8):
        self.llm = llm
        self.temperature = temperature

    def generate_query(self, question: str) -> str:
        """Generates a search query using the LLM."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an expert in crafting concise and effective search queries for movies and TV series. "
                "If the user question explicitly mentions 'movies' or 'series', tailor the query to include only the specified type. "
                "If no specific type is mentioned, include both movies and TV series in the search (films OR tv shows) "
                "Ensure the search query is optimized for finding the most relevant results with shortest possible query. "
                "Do not include explanations or additional text. Output the search query as plain text."
            )
        }
        user_prompt = {"role": "user", "content": question}
        response = self.llm.ask(
            [system_prompt, user_prompt]
        )
        return response.strip()


class ContentFetcherAgent:
    async def search_internet(self, query: str, num_results: int = 2):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()

            try:
                search_url = f"https://duckduckgo.com/?q={query}"
                print(f"Searching: {search_url}")
                await page.goto(search_url)
                await page.wait_for_selector("a")

                links = await page.locator('a[data-testid="result-extras-url-link"]').evaluate_all(
                    "(elements) => elements.map(el => el.href)"
                )
                print(links)
                filtered_links = []
                valid_domains = ['letterboxd.com', 'rottentomatoes.com', 'reddit.com',
                                 'themoviedb.org', 'https://www.cnet.com/culture/entertainment/']

                for link in links:
                    print('/n', link)
                    if not isinstance(link, str):
                        continue

                    if ('duckduckgo.com' in link or
                        'javascript:' in link or
                            'decipherinc.com' in link):
                        continue

                    if any(domain in link for domain in valid_domains):
                        filtered_links.append(link)

                        if len(filtered_links) >= num_results:
                            break

                print(f"DEBUG: search_internet - Filtered links:", filtered_links)
                return filtered_links[:num_results]

            finally:
                await browser.close()

    async def fetch_website_content(self, url: str) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=5) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        return soup.get_text(separator=' ', strip=True)
        except Exception as e:
            print(f"Error fetching URL {url}: {e}")
            return ""

    async def fetch_content(self, urls: list) -> str:
        if not urls:
            return ""

        aggregated_content = ""
        for url in urls:
            try:
                print("\n" + "="*80)
                print(f"Content from URL: {url}")
                print("="*80)

                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            content = soup.get_text(separator=' ', strip=True)
                            print(content)
                            aggregated_content += f" {content[:5000]}"
            except Exception as e:
                print(f"Error fetching URL {url}: {e}")
                continue

        print("\n" + "="*80)
        print("AGGREGATED CONTENT:")
        print("="*80)
        print(aggregated_content)
        return aggregated_content.strip()


class ResultParserAgent:
    def __init__(self, llm, temperature=0.8):
        self.llm = llm
        self.temperature = temperature

    def parse_results(self, content, question):
        """Queries the LLM with the provided content and question."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an AI that recommends movies or TV series based on input content and a query. "
                "Provide exactly 20 unique titles in JSON format. Each title must have 'title' and 'media_type' keys. "
                "Respond only with the JSON array, no additional text."
            )
        }

        user_prompt = {
            "role": "user",
            "content": (
                f"Content: {content}. Query: '{question}'. Provide a JSON array of 20 unique objects. "
                "Each object must have 'title' (string) and 'media_type' ('movie' or 'tv') (string) keys. "
                "Enclose the array in a code block starting with ```json."
            )
        }
        response = self.llm.ask(
            [system_prompt, user_prompt]
        )
        return response.strip()


class OnlineAgent:
    TRUSTED_SITES = [
        "site:rottentomatoes.com",
        "site:themoviedb.org",
        "site:letterboxd.com",
        "reddit.com",
    ]

    def __init__(self, llm: any, temperature: float = 0.8):
        self.query_agent = SearchQueryAgent(llm, temperature)
        self.fetcher_agent = ContentFetcherAgent()
        self.parser_agent = ResultParserAgent(llm, temperature)
        self.llm = llm
        self.temperature = temperature

    async def searchOnline(self, prompt):
        """Modified search function to extract string array from response."""

        search_query = self.query_agent.generate_query(prompt)
        search_query = search_query.replace(
            '"', '').replace("'", "").replace("\n", "")

        if not search_query:
            return []

        all_urls = set()

        for site in self.TRUSTED_SITES:
            query = f"{search_query} {site}"
            urls = await self.fetcher_agent.search_internet(query, num_results=2)
            print(f"DEBUG: searchOnline - URLs found for {site}: {urls}")
            all_urls.update(urls)

        if not all_urls:
            print("DEBUG: searchOnline - No search results found.")
            return []

        aggregated_content = await self.fetcher_agent.fetch_content(list(all_urls))
        print(
            f"DEBUG: searchOnline - Aggregated content: {aggregated_content}")
        if not aggregated_content:
            print("DEBUG: searchOnline - No content fetched from URLs.")
            return []

        response = self.parser_agent.parse_results(aggregated_content, prompt)
        print(f"DEBUG: searchOnline - Parser response: {response}")
        result_json = extract_json(response)
        print(f"DEBUG: searchOnline - Extracted JSON: {result_json}")
        print("DEBUG: searchOnline - Completing and returning result.")
        return result_json

    def recommend_series_or_movies(self, user_input):
        """Generates 10 series or movies based on user input using the LLM."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an AI that recommends movies or TV series. "
                "Provide exactly 20 unique recommendations in JSON format. "
                "Each object must include a 'title' and 'media_type' ('movie' or 'tv'). "
                "Respond only with the JSON array, no additional text."
            )
        }

        user_prompt = {
            "role": "user",
            "content": (
                f"Query: '{user_input}'. Provide a JSON array of 20 unique objects. "
                "Each object must have 'title' (string) and 'media_type' (string) keys. "
                "Enclose the array in a code block starting with ```json."
            )
        }
        response = self.llm.ask(
            [system_prompt, user_prompt]
        )
        print('----------------------------------------------------------')
        print(response)
        print('----------------------------------------------------------')
        return extract_json(response)
