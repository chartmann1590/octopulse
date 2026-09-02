import pathlib
import subprocess
import json
import textwrap

# Load script and durations
dur_path = pathlib.Path("tools/tmp_audio/durations.json")
with open(dur_path, "r") as f:
    SCRIPT = json.load(f)

print("Loaded durations:")
for s in SCRIPT:
    print(f"  {s['id']}: {s['duration']:.2f}s -> {s['caption'][:40]}")

# Generate ASS file for burned-in captions
ass_path = pathlib.Path("tools/tmp_audio/captions.ass")
# Build ASS content
ass_header = textwrap.dedent("""\
[Script Info]
Title: OctoPulse Promo
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Arial,42,&H00FFFFFF,&H000000FF,&H00000000,&H88000000,1,0,0,0,100,100,0,0,1,3,1,2,40,40,78,1
Style: Title,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,3,0,5,40,40,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")

# Generate events — each caption timed to its audio segment
def fmt_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    cs = int((sec - int(sec)) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

events = []
cursor = 0.0
pad = 0.12  # tiny lead-in before caption appears, to avoid flash at cut
for seg in SCRIPT:
    dur = seg["duration"]
    start = cursor + pad
    end = cursor + dur - 0.05  # slight before next
    # clamp
    if end <= start:
        end = start + dur - 0.1
    # Caption text: convert \n to \N for ASS, escape
    caption = seg["caption"].replace("\n", r"\N")
    # Also add a subtle fade effect via tags? Use \fad(150,150)
    line = f"Dialogue: 0,{fmt_time(start)},{fmt_time(end)},Caption,,0,0,0,,{{\\fad(120,120)}}{caption}"
    events.append(line)
    cursor += dur  # no extra gap; next starts exactly after previous audio ends

ass_content = ass_header + "\n".join(events) + "\n"
ass_path.write_text(ass_content, encoding="utf-8")
print(f"\nASS captions written to {ass_path}")
print(ass_content[:800])

# Prepare slide and audio paths mapping
slide_map = {
    "01-intro": "tools/tmp_slides/slide-01-intro.png",
    "02-discover": "tools/tmp_slides/slide-02-discover.png",
    "03-pair": "tools/tmp_slides/slide-03-pair.png",
    "04-monitor": "tools/tmp_slides/slide-04-monitor.png",
    "05-control": "tools/tmp_slides/slide-05-control.png",
    "06-ads": "tools/tmp_slides/slide-06-ads.png",
    "07-outro": "tools/tmp_slides/slide-07-outro.png",
}
audio_dir = pathlib.Path("tools/tmp_audio")

tmp_clips = pathlib.Path("tools/tmp_clips")
tmp_clips.mkdir(parents=True, exist_ok=True)
# Clean previous clips
for f in tmp_clips.glob("*.mp4"):
    f.unlink()

print("\nGenerating per-segment clips (video + audio)...")
clip_paths = []
for seg in SCRIPT:
    sid = seg["id"]
    slide = slide_map[sid]
    audio = audio_dir / f"{sid}.mp3"
    dur = seg["duration"]
    clip_out = tmp_clips / f"clip-{sid}.mp4"
    # Build ffmpeg command: loop slide image for audio duration, mux audio
    # Use -loop 1 -framerate 30 -i slide -i audio -c:v libx264 -pix_fmt yuv420p -r 30 -shortest
    # Add a subtle zoom/pan? Keep static for now, but add 0.3s fade transition via xfade later
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-framerate", "30", "-i", slide,
        "-i", str(audio),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-r", "30",
        "-vf", "scale=1920:1080:flags=lanczos",
        str(clip_out)
    ]
    print(f"  {sid} {dur:.2f}s -> {clip_out.name}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-2000:])
        raise SystemExit(f"ffmpeg failed for {sid}")
    clip_paths.append(clip_out)

# Now concat clips with re-encode to allow crossfade and burned captions
# Use concat demuxer first (without transition) then burn captions
concat_list = tmp_clips / "concat.txt"
with open(concat_list, "w") as f:
    for p in clip_paths:
        f.write(f"file '{p.resolve().as_posix()}'\n")

combined = pathlib.Path("tools/tmp_clips/combined.mp4")
print("\nConcatenating clips...")
cmd_concat = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", str(concat_list),
    "-c", "copy",
    str(combined)
]
result = subprocess.run(cmd_concat, capture_output=True, text=True)
if result.returncode != 0:
    # fallback to re-encode concat
    print("Copy concat failed, re-encoding...")
    cmd_concat = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(combined)
    ]
    result = subprocess.run(cmd_concat, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr[-3000:])
        raise SystemExit("concat failed")

# Probe combined duration
probe = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "json", str(combined)], capture_output=True, text=True)
import json as js
try:
    dur_comb = float(js.loads(probe.stdout)["format"]["duration"])
    print(f"Combined video (no captions): {dur_comb:.2f}s")
except:
    dur_comb = sum(s["duration"] for s in SCRIPT)

# Now burn captions and add fade in/out + optional background music
# For now, just burn captions with libass, and add fade t=0.4 out last 0.6
# Use -vf "ass=...,fade=t=in:st=0:d=0.4,fade=t=out:st={dur-0.6}:d=0.6"
# Provide audio copy

out_video = pathlib.Path("docs/video/promo.mp4")
out_video.parent.mkdir(parents=True, exist_ok=True)

fade_out_start = max(0, dur_comb - 0.7)
# Note: do not include fontsdir with colon - it breaks filter parsing; libass will find Arial via fontconfig
vf = f"ass={ass_path.as_posix()},fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out_start:.2f}:d=0.65"

print(f"\nBurning captions and adding fade...")
print(f"  VF: {vf}")

cmd_final = [
    "ffmpeg", "-y", "-i", str(combined),
    "-vf", vf,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    str(out_video)
]
result = subprocess.run(cmd_final, capture_output=True, text=True)
if result.returncode != 0:
    print(result.stderr[-4000:])
    raise SystemExit("final burn failed")

# Also generate poster image (first slide scaled to 1280x720)
poster = pathlib.Path("docs/video/poster.jpg")
cmd_poster = [
    "ffmpeg", "-y", "-i", str(slide_map["01-intro"]),
    "-vf", "scale=1280:720:flags=lanczos",
    "-q:v", "2",
    str(poster)
]
subprocess.run(cmd_poster, capture_output=True)

# Also generate a web-friendly muted autoplay version? Could generate webm?
# For now, also copy voiceover? Already have

# Probe final
probe = subprocess.run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration,size", "-of", "json", str(out_video)], capture_output=True, text=True)
print("\nFinal promo video:")
print(probe.stdout)
try:
    info = js.loads(probe.stdout)["format"]
    print(f"  Duration: {float(info['duration']):.2f}s")
    print(f"  Size: {int(info['size'])/1024/1024:.2f} MB")
except:
    pass
# Check file exists
print(f"\nSaved: {out_video.resolve()} ({out_video.stat().st_size/1024/1024:.2f} MB)")
print(f"Poster: {poster.resolve()} ({poster.stat().st_size/1024:.1f} KB)")
print(f"Captions ASS: {ass_path.resolve()}")

# Also generate a version with no audio for autoplay muted (optional)
muted = pathlib.Path("docs/video/promo-muted.mp4")
cmd_muted = [
    "ffmpeg", "-y", "-i", str(out_video),
    "-an", "-c:v", "copy",
    str(muted)
]
subprocess.run(cmd_muted, capture_output=True)
print(f"Muted version: {muted} ({muted.stat().st_size/1024/1024:.2f} MB)")

print("\nBuild complete.")
