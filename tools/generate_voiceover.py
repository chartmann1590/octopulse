import asyncio
import subprocess
import pathlib
import json

# Promo script — 7 segments, ~35 seconds total
# Each line will have burn-in captions exactly as spoken (clean, no filler)
SCRIPT = [
    {
        "id": "01-intro",
        "text": "Meet OctoPulse.",
        "caption": "Meet OctoPulse.",
    },
    {
        "id": "02-discover",
        "text": "Your OctoPrint, in your pocket. Auto-discover printers on your Wi-Fi in seconds.",
        "caption": "Your OctoPrint, in your pocket.\nAuto-discover printers on Wi-Fi in seconds.",
    },
    {
        "id": "03-pair",
        "text": "Pair with one tap. Just approve in OctoPrint. No copy, no paste.",
        "caption": "Pair with one tap.\nJust approve in OctoPrint.",
    },
    {
        "id": "04-monitor",
        "text": "Monitor every print. Live camera, progress and temperatures — at a glance.",
        "caption": "Monitor every print.\nLive camera, progress and temperatures.",
    },
    {
        "id": "05-control",
        "text": "Take full control. Move axes, set temperatures, and preview G-code in two D and three D.",
        "caption": "Take full control.\nMove axes, set temperatures, preview G-code.",
    },
    {
        "id": "06-ads",
        "text": "Stay free with respectful ads that never interrupt a print.",
        "caption": "Free, with respectful ads\nthat never interrupt a print.",
    },
    {
        "id": "07-outro",
        "text": "OctoPulse. Monitor, Control, Print. Coming soon to Google Play.",
        "caption": "OctoPulse\nMonitor • Control • Print\nComing soon to Google Play",
    },
]

VOICE = "en-US-AndrewNeural"  # Warm, confident, authentic — great for makers
# Alternative: en-US-AriaNeural for female confident, en-US-GuyNeural for passion
RATE = "+5%"  # Slightly faster for promo pacing
PITCH = "+0Hz"

async def generate():
    out_dir = pathlib.Path("docs/video")
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = pathlib.Path("tools/tmp_audio")
    tmp_dir.mkdir(parents=True, exist_ok=True)

    # Clean previous
    for f in tmp_dir.glob("*.mp3"):
        f.unlink()
    for f in out_dir.glob("*.mp3"):
        # keep final combined only? remove segment mp3s from previous run
        pass

    print(f"Generating voiceover with {VOICE} rate {RATE}...")
    for seg in SCRIPT:
        mp3_path = tmp_dir / f"{seg['id']}.mp3"
        # Use edge-tts
        cmd = [
            "python", "-m", "edge_tts",
            "--voice", VOICE,
            "--rate", RATE,
            "--pitch", PITCH,
            "--text", seg["text"],
            "--write-media", str(mp3_path),
        ]
        print(f"  {seg['id']}: {seg['text'][:60]}...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ERROR {seg['id']}: {result.stderr}")
            raise SystemExit(result.stderr)
        # also write subtitle SRT for reference (edge-tts can generate)
        srt_path = tmp_dir / f"{seg['id']}.srt"
        cmd_srt = [
            "python", "-m", "edge_tts",
            "--voice", VOICE,
            "--rate", RATE,
            "--pitch", PITCH,
            "--text", seg["text"],
            "--write-subtitles", str(srt_path),
        ]
        subprocess.run(cmd_srt, capture_output=True)

        # Probe duration
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", str(mp3_path)],
            capture_output=True, text=True
        )
        try:
            dur = float(json.loads(probe.stdout)["format"]["duration"])
        except:
            dur = 0
        seg["duration"] = dur
        print(f"    -> {mp3_path.name} {dur:.2f}s")

    # Save durations.json for video builder
    with open(tmp_dir / "durations.json", "w") as f:
        json.dump(SCRIPT, f, indent=2)
    print(f"\nDurations saved to tools/tmp_audio/durations.json")

    # Also create a combined audio for preview (concatenated)
    # Build concat list
    concat_list = tmp_dir / "concat.txt"
    with open(concat_list, "w") as f:
        for seg in SCRIPT:
            mp3_path = tmp_dir / f"{seg['id']}.mp3"
            # Need absolute path for ffmpeg
            f.write(f"file '{mp3_path.resolve().as_posix()}'\n")
    combined = out_dir / "voiceover.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy", str(combined)
    ], capture_output=True)
    # Probe combined
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", str(combined)],
        capture_output=True, text=True
    )
    try:
        total = float(json.loads(probe.stdout)["format"]["duration"])
    except:
        total = sum(s["duration"] for s in SCRIPT)
    print(f"Combined voiceover: {combined} — {total:.2f}s total")
    print("Voiceover generation complete.")

if __name__ == "__main__":
    asyncio.run(generate())
