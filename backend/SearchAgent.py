from flask import Flask, request, jsonify
from flask_cors import CORS


from ollama import Client
from googlesearch import search
import json
import re
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains on all routes



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

    def generate_query(self, question):
        """Generates a search query using the LLM."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an expert at generating concise and effective search queries. "
                "Given a user question, create the best possible search query to find relevant information. "
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
    def search_internet(self, query, num_results=5):
        """Performs a Google search and returns a list of URLs."""
        try:
            return list(search(query, num=num_results, stop=num_results, pause=2))
        except Exception as e:
            print(f"Search error: {e}")
            return []

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
            headers = {'User-Agent': 'Mozilla/5.0'}
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
                "You are an AI assistant that recommends TV series or movies based on provided content and query."
                "Provide exactly 20 unique titles that match the user's query. "
                "Your response must be a valid JSON array of strings. "
                "Do not include any additional text. "
            )
        }
        user_prompt = {
            "role": "user",
            "content": f"{content}\n query: {question} \n Provide the the response as a valid JSON array of strings enclosed in a code block starting with ```json"
        }
        response = self.llm.ask(
            [system_prompt, user_prompt],
            temperature=self.temperature
        )
        return response.strip()

# Update the OnlineAgent class to use the separate agents
class OnlineAgent:
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

            # Step 2: Search the internet
            print(f"Searching the internet for: {search_query}")
            urls = self.fetcher_agent.search_internet(search_query)
            print(f"Urls {urls}")
            if not urls:
                print("No search results found.")
                return []

            # Step 3: Fetch content
            aggregated_content = self.fetcher_agent.fetch_content(urls)
            if not aggregated_content:
                print("No content fetched from URLs.")
                return []

            # Step 4: Parse results
            response = self.parser_agent.parse_results(aggregated_content, prompt)

            # Extract the JSON array from the code block in the response
            import re
            pattern = r'```json\s*(\[\s*.*?\])\s*```'
            match = re.search(pattern, response, re.DOTALL)
            if match:
                json_str = match.group(1)
                try:
                    results_list = json.loads(json_str)
                    if isinstance(results_list, list):
                        return results_list
                    else:
                        raise ValueError("Invalid response format")
                except (json.JSONDecodeError, ValueError):
                    print(f"Failed to parse results: {json_str}")
                    return []
            else:
                print(f"Failed to extract JSON from response: {response}")
                return []

    
    def recommend_series_or_movies(self, user_input):
        """Generates 10 series or movies based on user input using the LLM."""
        system_prompt = {
            "role": "system",
            "content": (
                "You are an AI assistant that recommends TV series or movies based on user input. "
                "Provide exactly 10 unique titles that match the user's query. "
                "Your response must be a valid JSON array of strings. "
                "Do not include any additional text. "
                ""
            )
        }

        user_prompt = {
            "role": "user",
            "content": f"User Query: '{user_input}'\n Provide the recommendations. Provide the response as a valid JSON array of strings enclosed in a code block starting with ```json"
        }

        response = self.llm.ask(
            [system_prompt, user_prompt],
            temperature=self.temperature
        )

        # Extract the JSON array from the code block in the response
        import re
        pattern = r'```json\s*(\[\s*.*?\])\s*```'
        match = re.search(pattern, response, re.DOTALL)
        if match:
            json_str = match.group(1)
            try:
                titles_list = json.loads(json_str)
                if isinstance(titles_list, list) and len(titles_list) == 10:
                    return titles_list
                else:
                    raise ValueError("Invalid response format")
            except (json.JSONDecodeError, ValueError):
                print(f"Failed to parse titles: {json_str}")
                return []
        else:
            print(f"Failed to extract JSON from response: {response}")
            return []

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


# Example usage
#if __name__ == "__main__":
#    prompt = (
#        "Provide one list of 10 series titles based on search query: dark sci-fi series "
#        "Provide the response as a valid JSON array of strings enclosed in a code block starting with ```json."
#    )

#    llm = OllamaChat(model="llama3.1:latest")
#    searcher = OnlineAgent(llm)
#    resp = searcher.search(prompt)
#    print(resp)
    #resp1 = searcher.recommend_series_or_movies("dark sci-fi series")
    #print(resp1)
