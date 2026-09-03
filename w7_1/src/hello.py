from openai import OpenAI
from w7.config import settings


client = OpenAI(
    base_url=settings.LLM_BASE_URL,
    api_key=settings.LLM_API_KEY,
)

response = client.chat.completions.create(
    model=settings.LLM_MODEL,
    messages=[{"role": "user", "content": "Reply with exactly the word: ready"}]
)

print(response.choices[0].message.content)
