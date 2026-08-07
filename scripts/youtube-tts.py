"""edge-tts で音声と発話タイミングを同時に取得する。

CLI の --write-subtitles は1ファイル1キューしか出さず、字幕を音声に
同期させられない。Python API のイベントストリームから境界情報を拾う。

日本語音声の実測: ja-JP-KeitaNeural は WordBoundary を出さず
SentenceBoundary のみを出す。日本語は分かち書きしないため字幕も
文・句単位が自然なので、文境界を正確なアンカーとして使い、
長い文の分割は呼び出し側で文字数比例に割る。

edge-tts は完全無料なので、このタイミング情報も追加費用なしで得られる。

使い方:
    python youtube-tts.py <出力mp3> <出力json> <voice> [rate]
    テキストは標準入力から UTF-8 で渡す。

出力 JSON:
    {"durationSec": 31.6,
     "boundaryType": "SentenceBoundary",
     "segments": [{"text": "…", "startSec": 0.1, "durationSec": 6.0}, ...]}
"""

import asyncio
import json
import sys

import edge_tts

# edge-tts のオフセットは 100 ナノ秒単位。
TICKS_PER_SECOND = 10_000_000


BOUNDARY_TYPES = ("WordBoundary", "SentenceBoundary")


async def synthesize(text: str, out_audio: str, voice: str, rate: str) -> dict:
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    segments: list[dict] = []
    boundary_type = None
    last_end = 0.0

    with open(out_audio, "wb") as audio_file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_file.write(chunk["data"])
            elif chunk["type"] in BOUNDARY_TYPES:
                # 声によって出るイベントが違う。最初に来た種類を採用する。
                boundary_type = boundary_type or chunk["type"]
                if chunk["type"] != boundary_type:
                    continue
                start = chunk["offset"] / TICKS_PER_SECOND
                duration = chunk["duration"] / TICKS_PER_SECOND
                segments.append(
                    {
                        "text": chunk["text"],
                        "startSec": round(start, 3),
                        "durationSec": round(duration, 3),
                    }
                )
                last_end = max(last_end, start + duration)

    return {
        "durationSec": round(last_end, 3),
        "boundaryType": boundary_type or "none",
        "segments": segments,
    }


def main() -> None:
    out_audio, out_json, voice = sys.argv[1], sys.argv[2], sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
    text = sys.stdin.buffer.read().decode("utf-8")

    result = asyncio.run(synthesize(text, out_audio, voice, rate))

    with open(out_json, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False)

    print(
        json.dumps(
            {
                "segments": len(result["segments"]),
                "boundaryType": result["boundaryType"],
                "durationSec": result["durationSec"],
            }
        )
    )


if __name__ == "__main__":
    main()
