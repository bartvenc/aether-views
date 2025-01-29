#llm_providers.py 
from abc import ABC, abstractmethod
import requests
from ollama import Client
import structlog

logger = structlog.get_logger()


class LLMProvider(ABC):
    @abstractmethod
    def ask(self, prompts: list, format: str = "", temperature: float = 0.8) -> str:
        pass


class OllamaProvider(LLMProvider):
    def __init__(self, host: str, model: str):
        self._ollama = Client(host)
        self._model = model

    def ask(self, prompts: list, format: str = "", temperature: float = 0.8) -> str:
        try:
            response = self._ollama.chat(
                model=self._model,
                messages=prompts,
                format=format,
                options={"temperature": temperature}
            )
            return response["message"]["content"]
        except Exception as e:
            logger.error("ollama_error", error=str(e))
            return "```json\n[]\n```"


class RunpodProvider(LLMProvider):
    def __init__(self, api_key: str, endpoint_url: str):
        from openai import OpenAI
        self.endpoint_id = endpoint_url.split('/v2/')[1].split('/')[0]
        self.client = OpenAI(
            api_key=api_key,
            base_url=f"https://api.runpod.ai/v2/{self.endpoint_id}/openai/v1",
            timeout=180.0
        )

    def ask(self, prompts: list, format: str = "", temperature: float = 0.8) -> str:
        try:
            response = self.client.chat.completions.create(
                messages=prompts,
                model="meta-llama/Llama-3.1-8B-Instruct",
                temperature=temperature,
                max_tokens=1000,
                top_p=0.9,
            )
            logger.info("runpod_response_received", length=len(
                response.choices[0].message.content))
            return response.choices[0].message.content
        except Exception as e:
            logger.error("runpod_error", error=str(e))
            return "```json\n[]\n```"
