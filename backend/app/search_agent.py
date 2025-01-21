from ollama import Client
from playwright.sync_api import sync_playwright
import json
import re
import requests
from bs4 import BeautifulSoup
import asyncio
from playwright.async_api import async_playwright
import aiohttp
from typing import Optional

def extract_json(response: str) -> list:
    
    """Extract and validate JSON array from the LLM response."""
    pattern = r'```json\s*(\[\s*.*?\])\s*```'
    match = re.search(pattern, response, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, list) and all(
                isinstance(item, dict) and 'title' in item and 'media_type' in item for item in data
            ):
                return data
        except json.JSONDecodeError:
            pass
    print(f"Invalid JSON response: {response}")
    return []

# Define the OllamaChat class
class OllamaChat:
    def __init__(self, host="http://localhost:11434", model=None):
        if model is None:
            raise ValueError("You must provide a model to use OllamaChat.")
        self._host = host
        self._model = model
        self._ollama = Client(host)

    def ask(self, prompts, format="", temperature=0.8):
        """
        Sends prompts to the Ollama LLM and returns the response.

        Args:
            prompts (list): A list of messages as dictionaries with 'role' and 'content'.
            format (str): The format of the response. Defaults to "".
            temperature (float): The temperature of the LLM. Defaults to 0.8.
        """
        response = self._ollama.chat(
            model=self._model,
            messages=prompts,
            format=format,
            options={"temperature": temperature}
        )
        return response["message"]["content"]

# Define the SearchQueryAgent class
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
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        return response.strip()

# Define the ContentFetcherAgent class
class ContentFetcherAgent:
    async def search_internet(self, query: str, num_results: int = 2) -> list:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()

            try:
                search_url = f"https://duckduckgo.com/?q={query}"
                print(f"Searching: {search_url}")
                await page.goto(search_url)
                await page.wait_for_selector("a")
                
                # More specific selector for actual search results
                links = await page.eval_on_selector_all(
                    'a[href^="https://"]',  # Only get https links
                    "elements => elements.map(el => el.href)"
                )
                print(links)
                # Filter out unwanted URLs
                valid_links = [
                    link for link in links 
                    if any(domain in link.lower() for domain in [
                        'imdb.com', 'rottentomatoes.com', 'metacritic.com',
                        'themoviedb.org', 'letterboxd.com'
                    ]) and not any(excluded in link.lower() for excluded in [
                        'javascript:', 'void(0)', 'duckduckgo.com'
                    ])
                ]
                
                return valid_links[:num_results]
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
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=10) as response:
                        if response.status == 200:
                            html = await response.text()
                            soup = BeautifulSoup(html, 'html.parser')
                            content = soup.get_text(separator=' ', strip=True)
                            aggregated_content += f" {content[:5000]}"
            except Exception as e:
                print(f"Error fetching URL {url}: {e}")
                continue
        
        return aggregated_content.strip()

# Define the ResultParserAgent class
class ResultParserAgent:
    def __init__(self, llm: any, temperature: float = 0.8):
        self.llm = llm
        self.temperature = temperature

    def parse_results(self, content: str, question: str) -> str:
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
        return self.llm.ask(
            [system_prompt, user_prompt],
            temperature=self.temperature
        ).strip()

# Update the OnlineAgent class to use the separate agents
class OnlineAgent:
    TRUSTED_SITES = [
        "site:imdb.com",
        "site:rottentomatoes.com",
        "site:metacritic.com",
        "site:themoviedb.org",
        "site:letterboxd.com"
    ]

    def __init__(self, llm: any, temperature: float = 0.8):
        self.llm = llm
        self.temperature = temperature
        self.query_agent = SearchQueryAgent(llm, temperature)
        self.fetcher_agent = ContentFetcherAgent()
        self.parser_agent = ResultParserAgent(llm, temperature)

    async def searchOnline(self, prompt: str) -> list:
        """Async search function"""
        search_query = self.query_agent.generate_query(prompt)
        if not search_query:
            return []

        # Search each site sequentially to avoid rate limiting
        all_urls = set()
        for site in self.TRUSTED_SITES:
            query = f"{search_query} {site}"
            query = query.replace('"', '')
            print(f"Searching: {query}")
            try:
                urls = await self.fetcher_agent.search_internet(query, num_results=2)
                all_urls.update(urls)
            except Exception as e:
                print(f"Error searching {site}: {e}")
                continue

        if not all_urls:
            print("No valid URLs found")
            return []

        content = await self.fetcher_agent.fetch_content(list(all_urls))
        if not content:
            print("No content fetched from URLs")
            return []

        # Parse results with the same format as recommendations
        response = self.parser_agent.parse_results(content, prompt)
        print(extract_json(response))
        return extract_json(response)

    def recommend_series_or_movies(self, user_input: str) -> list:
        """Exact same implementation as original SearchAgent.py"""
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
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        print('----------------------------------------------------------')
        print(response)
        print('----------------------------------------------------------')
        return extract_json(response)
