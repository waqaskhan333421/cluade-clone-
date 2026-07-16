from abc import ABC, abstractmethod
from typing import Generator, List, Dict

class ChatProvider(ABC):
    @abstractmethod
    def stream_chat(self, messages: List[Dict[str, str]], model: str) -> Generator[str, None, None]:
        """
        Stream chat completions from the provider.
        
        :param messages: List of dictionaries with 'role' and 'content' keys.
        :param model: The exact model string to pass to the API.
        :return: A generator yielding chunks of text.
        """
        pass
