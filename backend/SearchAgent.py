import random
from flask import Flask, request, jsonify
from flask_cors import CORS


from ollama import Client
from googlesearch import get_random_user_agent, search
from playwright.sync_api import sync_playwright
import json
import re
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
from flask_cors import CORS

CORS(app, origins=[
    "https://677d09487a267300089d7d67--aetherview.netlify.app",
    "http://localhost:4200",
    "https://*.ngrok-free.app",
    "https://aetherview.netlify.app",
    "https://www.aether-view.com/",
     "https://aether-view.com",
     "https://api.aether-view.com/",
     "https://32645a22-d952-40ab-a811-cf2fa87bcf6b.cfargotunnel.com"
], supports_credentials=True, allow_headers=["*"], methods=["GET", "POST", "OPTIONS"])

 # Enable CORS for all domains on all routes

@app.before_request
def log_request_info():
    print(f"Request Origin: {request.headers.get('Origin')}")

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
    def __init__(self, llm, temperature=0.8):
        self.llm = llm
        self.temperature = temperature

    TRUSTED_SITES = "site:imdb.com OR site:rottentomatoes.com OR site:metacritic.com"


    def generate_query(self, question):
        """Generates a search query using the LLM."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an expert in crafting concise and effective search queries for movies and TV series. "
                "If the user question explicitly mentions 'movies' or 'series', tailor the query to include only the specified type. "
                "If no specific type is mentioned, include both movies and TV series in the search. "
                "Ensure the search query is optimized for finding the most relevant results. "
                "Do not include explanations or additional text. Output the search query as plain text."
            )
        }
        user_prompt = {"role": "user", "content": question}
        response = self.llm.ask(
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        search_query = response.strip()
        return search_query

# Define the ContentFetcherAgent class
class ContentFetcherAgent:
    def search_internet(self, query, num_results=2):
        """
        Performs a search using Playwright (headless browser) and returns a list of URLs.
        """
        results = []
        with sync_playwright() as p:
            # Launch a headless browser
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            try:
                # Perform Google search
                search_url = f"https://duckduckgo.com/?q={query}"
                print(f"search_url: {search_url}")
                page.goto(search_url)

                # Wait for results to load
                page.wait_for_selector("a")

                # Extract search result links
                links = page.locator("a[href]").evaluate_all(
                    "(elements) => elements.map(el => el.href)"
                )
                print(f"Links: {links}")
                # Filter out non-search-result links (e.g., ads, navigation)
                results = [link for link in links if "google.com" not in link][:num_results]
                print(f"Fetched results: {results}")
            except Exception as e:
                print(f"Error during Playwright search: {e}")
            finally:
                # Close the browser
                browser.close()

        return results
    
    def fetch_content(self, urls):
        """Fetches and aggregates content from URLs."""
        aggregated_content = ""
        for url in urls:
            content = self.fetch_website_content(url)
            if content:
                aggregated_content += content[:5000]  # Limit content per URL to 5000 characters
        return aggregated_content

    def fetch_website_content(self, url):
        """Fetches and returns the text content from the given URL."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            return soup.get_text(separator=' ', strip=True)
        except Exception as e:
            print(f"Error fetching URL {url}: {e}")
            return ""

# Define the ResultParserAgent class
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
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        return response.strip()

# Update the OnlineAgent class to use the separate agents
class OnlineAgent:
    TRUSTED_SITES = [
        "site:imdb.com",
        "site:rottentomatoes.com",
        "site:metacritic.com",
        "site:themoviedb.org",
        "site:letterboxd.com"
    ]

    def __init__(self, llm, temperature=0.8):
        self.query_agent = SearchQueryAgent(llm, temperature)
        self.fetcher_agent = ContentFetcherAgent()
        self.parser_agent = ResultParserAgent(llm, temperature)
        self.llm = llm
        self.temperature = temperature

    def searchOnline(self, prompt):
        """Modified search function to extract string array from response."""
        # Step 1: Generate search query
        search_query = self.query_agent.generate_query(prompt)
        if not search_query:
            print("Failed to generate search query.")
            return []

        # Step 2: Search the internet for each trusted site
        all_urls = set()
        for site in self.TRUSTED_SITES:
            query = f"{search_query} {site}"
            print(f"Searching the internet for: {query}")
            urls = self.fetcher_agent.search_internet(query, num_results=2)
            all_urls.update(urls)

        print(f"Urls {all_urls}")
        if not all_urls:
            print("No search results found.")
            return []

        # Step 3: Fetch content
        aggregated_content = self.fetcher_agent.fetch_content(list(all_urls))
        if not aggregated_content:
            print("No content fetched from URLs.")
            return []

        # Step 4: Parse results
        response = self.parser_agent.parse_results(aggregated_content, prompt)
        return extract_json(response)  
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
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        print('----------------------------------------------------------')
        print(response)
        print('----------------------------------------------------------')
        # Extract the JSON array from the code block in the response
        return extract_json(response)
        


llm = OllamaChat(model="llama3.1:latest")
searcher = OnlineAgent(llm)    

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.get_json()
    user_input = data.get('query', '')
    if not user_input:
        return jsonify({'error': 'No query provided'}), 400

    recommendations = searcher.recommend_series_or_movies(user_input)
    return jsonify({'recommendations': recommendations})

@app.route('/search', methods=['POST'])
def searchOnline():
    data = request.get_json()
    user_input = data.get('query', '')
    if not user_input:
        return jsonify({'error': 'No query provided'}), 400

    search_results = searcher.searchOnline(user_input)
    print(search_results)
    return jsonify({'results': search_results})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000,debug=True )

