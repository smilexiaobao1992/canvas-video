# Synthesize one line with edge-tts and record word boundaries.
# Usage: python edge_words.py <voice> <rate> <text> <out.mp3> <out.json>
# out.json: [{"text": "...", "offset": seconds, "duration": seconds}, ...]
import asyncio
import json
import sys

import edge_tts


async def main(voice, rate, text, mp3_path, json_path):
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"text": chunk["text"], "offset": chunk["offset"] / 1e7, "duration": chunk["duration"] / 1e7})
    if not words:
        raise SystemExit(f"edge-tts returned no word boundaries for: {text}")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)


asyncio.run(main(*sys.argv[1:6]))
