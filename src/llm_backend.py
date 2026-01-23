#!/usr/bin/env python3
"""
Unified LLM Backend
Supports multiple LLM providers: Ollama, Llama.cpp server, and Gemini API
"""

import os
import time
import json
import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import ollama


class LLMBackend(ABC):
    """Abstract base class for LLM backends"""
    
    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Send a chat request and return the response"""
        pass
    
    @abstractmethod
    def get_backend_name(self) -> str:
        """Return the name of the backend"""
        pass


class OllamaBackend(LLMBackend):
    """Ollama backend implementation"""
    
    def __init__(self, model_name: str = "llama3.1:8b"):
        self.model = model_name
        
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Call Ollama API"""
        options = {
            'num_predict': kwargs.get('max_tokens', 16384),
            'temperature': kwargs.get('temperature', 0.7),
            'top_p': kwargs.get('top_p', 0.9)
        }
        
        response = ollama.chat(
            model=self.model,
            messages=messages,
            options=options
        )
        
        return response['message']['content']
    
    def get_backend_name(self) -> str:
        return f"Ollama ({self.model})"


class LlamaCppBackend(LLMBackend):
    """Llama.cpp server backend implementation"""
    
    def __init__(self, base_url: str = "http://localhost:8080", model_name: str = "llama-cpp"):
        self.base_url = base_url.rstrip('/')
        self.model_name = model_name
        
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Call Llama.cpp server API (OpenAI-compatible endpoint)"""
        
        # Convert messages format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        payload = {
            "messages": formatted_messages,
            "temperature": kwargs.get('temperature', 0.7),
            "max_tokens": kwargs.get('max_tokens', 4096),
            "top_p": kwargs.get('top_p', 0.9),
            "stream": False
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json=payload,
                timeout=300
            )
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content']
            
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Llama.cpp server error: {str(e)}")
    
    def get_backend_name(self) -> str:
        return f"Llama.cpp Server ({self.model_name})"


class GeminiBackend(LLMBackend):
    """Google Gemini API backend with rate limiting"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash",
                 requests_per_minute: int = 10):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY environment variable.")
        
        self.model = model_name
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        # Rate limiting
        self.requests_per_minute = requests_per_minute
        self.min_interval = 60.0 / requests_per_minute
        self.last_request_time = 0
        
    def _wait_for_rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_interval:
            sleep_time = self.min_interval - time_since_last
            print(f"[WAIT] Rate limiting: waiting {sleep_time:.1f}s...")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Call Gemini API with rate limiting"""
        
        self._wait_for_rate_limit()
        
        # Convert messages to Gemini format
        contents = []
        system_instruction = None
        
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                # Map 'user' and 'assistant' to 'user' and 'model'
                role = "model" if msg["role"] == "assistant" else "user"
                contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": kwargs.get('temperature', 0.7),
                "maxOutputTokens": kwargs.get('max_tokens', 8192),
                "topP": kwargs.get('top_p', 0.9),
            }
        }
        
        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }
        
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        
        try:
            response = requests.post(url, json=payload, timeout=300)
            response.raise_for_status()
            
            result = response.json()
            
            if 'candidates' in result and len(result['candidates']) > 0:
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                raise RuntimeError("No response from Gemini API")
                
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Gemini API error: {str(e)}")
    
    def get_backend_name(self) -> str:
        return f"Gemini ({self.model})"


class LLMBackendFactory:
    """Factory for creating LLM backends"""
    
    @staticmethod
    def create_backend(backend_type: str, **kwargs) -> LLMBackend:
        """
        Create an LLM backend based on type
        
        Args:
            backend_type: 'ollama', 'llamacpp', or 'gemini'
            **kwargs: Backend-specific arguments
                - For Ollama: model_name
                - For Llama.cpp: base_url, model_name
                - For Gemini: api_key, model_name, requests_per_minute
        """
        backend_type = backend_type.lower()
        
        if backend_type == 'ollama':
            return OllamaBackend(model_name=kwargs.get('model_name', 'llama3.1:8b'))
        
        elif backend_type == 'llamacpp':
            return LlamaCppBackend(
                base_url=kwargs.get('base_url', 'http://localhost:8080'),
                model_name=kwargs.get('model_name', 'llama-cpp')
            )
        
        elif backend_type == 'gemini':
            return GeminiBackend(
                api_key=kwargs.get('api_key'),
                model_name=kwargs.get('model_name', 'gemini-2.0-flash'),
                requests_per_minute=kwargs.get('requests_per_minute', 10)
            )
        
        else:
            raise ValueError(f"Unknown backend type: {backend_type}. "
                           "Must be 'ollama', 'llamacpp', or 'gemini'")


def test_backend(backend: LLMBackend):
    """Test a backend with a simple query"""
    print(f"\n[TEST] Testing {backend.get_backend_name()}...")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say 'Hello, I am working!' and nothing else."}
    ]
    
    try:
        response = backend.chat(messages, temperature=0.1, max_tokens=50)
        print(f"[OK] Response: {response}")
        return True
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False


def main():
    """Test all backends"""
    print("""
╔════════════════════════════════════════════════════════╗
║          LLM Backend Testing                           ║
╚════════════════════════════════════════════════════════╝
""")
    
    # Test Ollama
    print("\n1. Testing Ollama Backend")
    try:
        ollama_backend = LLMBackendFactory.create_backend('ollama', model_name='llama3.1:8b')
        test_backend(ollama_backend)
    except Exception as e:
        print(f"[FAIL] Ollama test failed: {e}")
    
    # Test Llama.cpp
    print("\n2. Testing Llama.cpp Backend")
    try:
        llamacpp_backend = LLMBackendFactory.create_backend(
            'llamacpp',
            base_url='http://localhost:8080',
            model_name='gemma-3-27B'
        )
        test_backend(llamacpp_backend)
    except Exception as e:
        print(f"[FAIL] Llama.cpp test failed: {e}")
    
    # Test Gemini (if API key available)
    print("\n3. Testing Gemini Backend")
    try:
        gemini_backend = LLMBackendFactory.create_backend(
            'gemini',
            model_name='gemini-2.0-flash',
            requests_per_minute=10
        )
        test_backend(gemini_backend)
    except Exception as e:
        print(f"[FAIL] Gemini test failed: {e}")


if __name__ == "__main__":
    main()
