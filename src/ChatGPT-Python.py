#Test
import os
import openai

# Load your API key from an environment variable \
openai.api_key = os.getenv("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")
chat_completion = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": "Hello world"}])




print("Hello ChatGPT-Python")