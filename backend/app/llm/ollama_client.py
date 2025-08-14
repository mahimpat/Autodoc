import json, requests
from typing import Iterator, Optional, List
from ..settings import settings

def stream_generate(prompt: str, model: Optional[str] = None, system: Optional[str] = None) -> Iterator[str]:
    url = f"{settings.OLLAMA_URL}/api/generate"
    payload = {
        "model": model or settings.OLLAMA_DEFAULT_MODEL,
        "prompt": prompt,
        "stream": True,
    }
    if system:
        payload["system"] = system
    with requests.post(url, json=payload, stream=True, timeout=600) as r:
        r.raise_for_status()
        for line in r.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                data = json.loads(line)
            except Exception:
                continue
            if isinstance(data, dict) and data.get("response"):
                yield data["response"]
            if isinstance(data, dict) and data.get("done"):
                break

def embed_texts(texts: List[str], model: Optional[str] = None) -> List[List[float]]:
    url = f"{settings.OLLAMA_URL}/api/embeddings"
    out = []
    for t in texts:
        payload = {
            "model": model or getattr(settings, "OLLAMA_EMBED_MODEL", "all-minilm"),
            "prompt": t,
        }
        r = requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        out.append(data.get("embedding", []))
    return out
