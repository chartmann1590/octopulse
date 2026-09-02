import pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import math

# Paths
SCREENSHOT_DIR = pathlib.Path("docs/screenshots")
SLIDE_DIR = pathlib.Path("tools/tmp_slides")
SLIDE_DIR.mkdir(parents=True, exist_ok=True)

# Canvas size for video (16:9 landscape)
W, H = 1920, 1080

# Colors
BG_DARK = (2, 6, 23)
BG_CARD = (15, 23, 42)
PRIMARY = (14, 165, 233)
ACCENT = (249, 115, 22)

def load_font(size, bold=False):
    # Try to use Arial as fallback for Inter
    try:
        if bold:
            return ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", size)
        else:
            return ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", size)
    except:
        return ImageFont.load_default()

def create_gradient_bg():
    img = Image.new("RGB", (W, H), BG_DARK)
    draw = ImageDraw.Draw(img, "RGBA")
    # Radial gradients simulated via larger ellipses
    # Top left teal glow
    glow = Image.new("RGBA", (W, H), (0,0,0,0))
    gdraw = ImageDraw.Draw(glow, "RGBA")
    gdraw.ellipse([-300, -400, 900, 600], fill=(14,165,233,32))
    gdraw.ellipse([1100, -200, 2100, 800], fill=(249,115,22,22))
    gdraw.ellipse([300, 700, 1600, 1300], fill=(168,85,247,14))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    # Grid overlay subtle
    grid = Image.new("RGBA", (W, H), (0,0,0,0))
    g2 = ImageDraw.Draw(grid, "RGBA")
    for x in range(0, W, 40):
        g2.line([(x,0),(x,H)], fill=(148,163,184,9), width=1)
    for y in range(0, H, 40):
        g2.line([(0,y),(W,y)], fill=(148,163,184,9), width=1)
    # Fade grid via mask
    img = Image.alpha_composite(img.convert("RGBA"), grid).convert("RGB")
    return img

def add_phone_frame(screenshot_path, target_height=950):
    """Load screenshot, resize to target height, add phone frame (rounded rect + shadow + notch)"""
    src = Image.open(screenshot_path).convert("RGBA")
    # screenshot is 1080x2340 originally, but our -1080.webp is 1080x2340 scaled
    # Resize to target_height keeping aspect
    orig_w, orig_h = src.size
    aspect = orig_w / orig_h
    new_h = target_height
    new_w = int(new_h * aspect)
    # For our screenshots aspect = 1080/2340 = 0.4615, so 950h => 438w
    src = src.resize((new_w, new_h), Image.LANCZOS)

    # Create phone frame canvas with shadow and rounded corners
    # Phone outer size slightly larger than screenshot for bezel
    bezel = 14
    outer_w = new_w + bezel*2
    outer_h = new_h + bezel*2 + 24  # extra for top notch area? but screenshot already includes status bar
    # Actually screenshot already includes status bar, so outer includes just bezel
    # Use rounded rectangle for phone body
    # Create shadow
    shadow_offset = 24
    canvas_w = outer_w + shadow_offset*2
    canvas_h = outer_h + shadow_offset*2
    # We'll create just the phone image without extra canvas; shadow will be composited later
    # Simpler: create phone image with rounded corners and border
    phone = Image.new("RGBA", (outer_w, outer_h), (0,0,0,0))
    draw = ImageDraw.Draw(phone, "RGBA")
    # Outer rounded rect (phone body)
    radius = 42
    # Fill with dark bezel
    draw.rounded_rectangle([0,0,outer_w-1,outer_h-1], radius=radius, fill=(15,23,42,255), outline=(255,255,255,26), width=2)
    # Inner shadow highlight
    draw.rounded_rectangle([1,1,outer_w-2,outer_h-2], radius=radius-1, outline=(255,255,255,14), width=1)
    # Paste screenshot centered
    # Apply rounded corners to screenshot itself
    mask = Image.new("L", (new_w, new_h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0,0,new_w-1,new_h-1], radius=32, fill=255)
    src_rounded = Image.new("RGBA", (new_w, new_h), (0,0,0,0))
    src_rounded.paste(src, (0,0), mask)
    # Paste onto phone (centered)
    phone.paste(src_rounded, (bezel, bezel), src_rounded)
    # Add notch (small black pill at top center) — overlay on top of screenshot
    notch_w, notch_h = 96, 22
    notch_x = (outer_w - notch_w)//2
    notch_y = bezel + 6
    draw.rounded_rectangle([notch_x, notch_y, notch_x+notch_w, notch_y+notch_h], radius=notch_h//2, fill=(0,0,0,255))
    # Add speaker/micro hint
    # Return phone image
    return phone

def composite_slide(bg, positions, title=None, subtitle=None):
    """Composite bg with phones at given positions (list of (phone_img, x, y))"""
    img = bg.copy()
    # Add drop shadows for phones
    for phone, x, y in positions:
        # Create shadow layer
        shadow = Image.new("RGBA", img.size, (0,0,0,0))
        shadow_draw = ImageDraw.Draw(shadow, "RGBA")
        # Shadow ellipse under phone
        pw, ph = phone.size
        # Simple shadow: semi-transparent rounded rect offset
        sx, sy = x+12, y+18
        # Use blurred shadow via ImageFilter
        shadow_img = Image.new("RGBA", (pw+40, ph+40), (0,0,0,0))
        sdraw = ImageDraw.Draw(shadow_img)
        sdraw.rounded_rectangle([20,20, pw+20, ph+20], radius=42, fill=(0,0,0,90))
        shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(24))
        img.paste(shadow_img, (sx-20, sy-20), shadow_img)
        img.paste(phone, (x, y), phone)
    if title:
        draw = ImageDraw.Draw(img, "RGBA")
        # Title at top center
        font_bold = load_font(56, bold=True)
        # Subtitle
        # Measure
        bbox = draw.textbbox((0,0), title, font=font_bold)
        tw = bbox[2]-bbox[0]
        tx = (W - tw)//2
        ty = 48
        # Text shadow
        draw.text((tx+2, ty+2), title, font=font_bold, fill=(0,0,0,80))
        draw.text((tx, ty), title, font=font_bold, fill=(248,250,252,255))
        if subtitle:
            font_reg = load_font(26, bold=False)
            bbox2 = draw.textbbox((0,0), subtitle, font=font_reg)
            tw2 = bbox2[2]-bbox2[0]
            tx2 = (W - tw2)//2
            draw.text((tx2, ty+70), subtitle, font=font_reg, fill=(148,163,184,255))
    return img

def main():
    # Generate background once
    bg = create_gradient_bg()

    # Load phone frames
    # Use 1080 webp versions for high quality
    phones = {}
    for name in ["01-dashboard","02-discover","03-pairing","04-detail","05-control","06-gcode"]:
        path = SCREENSHOT_DIR / f"{name}-1080.webp"
        if not path.exists():
            path = SCREENSHOT_DIR / f"{name}.png"
        phones[name] = add_phone_frame(path, target_height=920)

    # Also need smaller for dual: use target_height 880 for side-by-side to fit two
    phones_small = {}
    for name in ["01-dashboard","04-detail","05-control","06-gcode"]:
        path = SCREENSHOT_DIR / f"{name}-1080.webp"
        if not path.exists():
            path = SCREENSHOT_DIR / f"{name}.png"
        phones_small[name] = add_phone_frame(path, target_height=860)

    # Slide 01: Intro — single centered logo phone? But we have no screenshot for intro, create a synthetic hero instead
    # For intro, we will show a centered large logo + title, not a phone.
    # Create intro slide: bg + centered logo card
    intro = bg.copy()
    draw = ImageDraw.Draw(intro, "RGBA")
    # Card centered
    card_w, card_h = 760, 420
    cx, cy = (W-card_w)//2, (H-card_h)//2 - 20
    draw.rounded_rectangle([cx, cy, cx+card_w, cy+card_h], radius=28, fill=(15,23,42,230), outline=(255,255,255,18), width=1)
    # Logo
    logo_size = 96
    logo_x, logo_y = W//2 - logo_size//2, cy + 36
    # Gradient logo background
    logo = Image.new("RGBA", (logo_size, logo_size), (0,0,0,0))
    ldraw = ImageDraw.Draw(logo)
    ldraw.rounded_rectangle([0,0,logo_size-1,logo_size-1], radius=20, fill=(14,165,233,255))
    # overlay gradient approximation: just use solid primary, add accent corner
    # Draw OP text
    font_logo = load_font(42, bold=True)
    bbox = ldraw.textbbox((0,0), "OP", font=font_logo)
    tw = bbox[2]-bbox[0]; th = bbox[3]-bbox[1]
    ldraw.text(((logo_size-tw)//2, (logo_size-th)//2 - 2), "OP", font=font_logo, fill=(255,255,255,255))
    intro.paste(logo, (logo_x, logo_y), logo)
    # Text
    font_title = load_font(72, bold=True)
    title = "OctoPulse"
    bbox = draw.textbbox((0,0), title, font=font_title)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, logo_y + logo_size + 18), title, font=font_title, fill=(248,250,252,255))
    font_sub = load_font(22, bold=True)
    sub = "MONITOR  •  CONTROL  •  PRINT"
    bbox = draw.textbbox((0,0), sub, font=font_sub)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, logo_y + logo_size + 96), sub, font=font_sub, fill=(125,211,252,255))
    # Save intro
    intro.save(SLIDE_DIR / "slide-01-intro.png")
    print("slide-01-intro.png")

    # Slide 02: Discover — single phone centered, title bottom
    bg2 = bg.copy()
    phone = phones["02-discover"]
    px = (W - phone.width)//2
    py = (H - phone.height)//2 - 16
    slide02 = composite_slide(bg2, [(phone, px, py)])
    # Bottom label
    draw = ImageDraw.Draw(slide02, "RGBA")
    label = "Auto-discover printers on your Wi-Fi in seconds"
    font_label = load_font(28, bold=False)
    bbox = draw.textbbox((0,0), label, font=font_label)
    tw = bbox[2]-bbox[0]
    # Pill background
    pill_pad_x, pill_pad_y = 28, 14
    pill_w, pill_h = tw + pill_pad_x*2, 48
    pill_x, pill_y = (W - pill_w)//2, H - 88
    draw.rounded_rectangle([pill_x, pill_y, pill_x+pill_w, pill_y+pill_h], radius=pill_h//2, fill=(15,23,42,210), outline=(255,255,255,14), width=1)
    draw.text((pill_x + pill_pad_x, pill_y + 11), label, font=font_label, fill=(248,250,252,255))
    slide02.save(SLIDE_DIR / "slide-02-discover.png")
    print("OK slide-02-discover.png")

    # Slide 03: Pairing
    bg3 = bg.copy()
    phone = phones["03-pairing"]
    px = (W - phone.width)//2
    py = (H - phone.height)//2 - 16
    slide03 = composite_slide(bg3, [(phone, px, py)])
    draw = ImageDraw.Draw(slide03, "RGBA")
    label = "Pair with one tap — approve in OctoPrint"
    bbox = draw.textbbox((0,0), label, font=font_label)
    tw = bbox[2]-bbox[0]
    pill_w = tw + 56
    pill_x = (W - pill_w)//2
    draw.rounded_rectangle([pill_x, H-88, pill_x+pill_w, H-88+48], radius=24, fill=(15,23,42,210), outline=(255,255,255,14), width=1)
    draw.text((pill_x+28, H-77), label, font=font_label, fill=(248,250,252,255))
    slide03.save(SLIDE_DIR / "slide-03-pair.png")
    print("OK slide-03-pair.png")

    # Slide 04: Monitor — dual phones: dashboard + detail
    bg4 = bg.copy()
    p1 = phones_small["01-dashboard"]
    p2 = phones_small["04-detail"]
    gap = 60
    total_w = p1.width + p2.width + gap
    start_x = (W - total_w)//2
    y = (H - p1.height)//2 - 10
    slide04 = composite_slide(bg4, [(p1, start_x, y), (p2, start_x + p1.width + gap, y)])
    draw = ImageDraw.Draw(slide04, "RGBA")
    label = "Monitor every print — camera, progress & temps at a glance"
    bbox = draw.textbbox((0,0), label, font=font_label)
    tw = bbox[2]-bbox[0]
    pill_w = tw + 56
    pill_x = (W - pill_w)//2
    draw.rounded_rectangle([pill_x, H-88, pill_x+pill_w, H-88+48], radius=24, fill=(15,23,42,210), outline=(255,255,255,14), width=1)
    draw.text((pill_x+28, H-77), label, font=font_label, fill=(248,250,252,255))
    slide04.save(SLIDE_DIR / "slide-04-monitor.png")
    print("OK slide-04-monitor.png")

    # Slide 05: Control — dual phones: control + gcode
    bg5 = bg.copy()
    p1 = phones_small["05-control"]
    p2 = phones_small["06-gcode"]
    gap = 60
    total_w = p1.width + p2.width + gap
    start_x = (W - total_w)//2
    y = (H - p1.height)//2 - 10
    slide05 = composite_slide(bg5, [(p1, start_x, y), (p2, start_x + p1.width + gap, y)])
    draw = ImageDraw.Draw(slide05, "RGBA")
    label = "Full control — jog, temps, fan & G-code 2D/3D preview"
    bbox = draw.textbbox((0,0), label, font=font_label)
    tw = bbox[2]-bbox[0]
    pill_w = tw + 56
    pill_x = (W - pill_w)//2
    draw.rounded_rectangle([pill_x, H-88, pill_x+pill_w, H-88+48], radius=24, fill=(15,23,42,210), outline=(255,255,255,14), width=1)
    draw.text((pill_x+28, H-77), label, font=font_label, fill=(248,250,252,255))
    slide05.save(SLIDE_DIR / "slide-05-control.png")
    print("OK slide-05-control.png")

    # Slide 06: Ads — single phone (dashboard) with ad highlighted, plus text
    bg6 = bg.copy()
    phone = phones["01-dashboard"]
    px = (W - phone.width)//2
    py = (H - phone.height)//2 - 16
    slide06 = composite_slide(bg6, [(phone, px, py)])
    draw = ImageDraw.Draw(slide06, "RGBA")
    label = "Free, with respectful ads — never during a print"
    bbox = draw.textbbox((0,0), label, font=font_label)
    tw = bbox[2]-bbox[0]
    pill_w = tw + 56
    pill_x = (W - pill_w)//2
    draw.rounded_rectangle([pill_x, H-88, pill_x+pill_w, H-88+48], radius=24, fill=(34,22,8,210), outline=(251,146,60,28), width=1)
    draw.text((pill_x+28, H-77), label, font=font_label, fill=(254,215,170,255))
    # Small Ad badge at top right of phone to highlight
    slide06.save(SLIDE_DIR / "slide-06-ads.png")
    print("OK slide-06-ads.png")

    # Slide 07: Outro — centered card with Play Store badge, QR placeholder, website
    outro = bg.copy()
    draw = ImageDraw.Draw(outro, "RGBA")
    card_w, card_h = 860, 520
    cx, cy = (W-card_w)//2, (H-card_h)//2 - 30
    draw.rounded_rectangle([cx, cy, cx+card_w, cy+card_h], radius=28, fill=(15,23,42,230), outline=(255,255,255,18), width=1)
    # Logo again
    logo_x = W//2 - 48
    logo_y = cy + 32
    logo = Image.new("RGBA", (96,96), (0,0,0,0))
    ldraw = ImageDraw.Draw(logo)
    ldraw.rounded_rectangle([0,0,95,95], radius=18, fill=(14,165,233,255))
    ldraw.text((22, 26), "OP", font=load_font(38, bold=True), fill=(255,255,255,255))
    outro.paste(logo, (logo_x, logo_y), logo)
    title = "OctoPulse"
    font_title = load_font(56, bold=True)
    bbox = draw.textbbox((0,0), title, font=font_title)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, logo_y+108), title, font=font_title, fill=(248,250,252,255))
    sub = "Monitor • Control • Print"
    font_sub = load_font(20, bold=True)
    bbox = draw.textbbox((0,0), sub, font=font_sub)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, logo_y+170), sub, font=font_sub, fill=(125,211,252,255))
    # Play Store badge mock (black pill with text)
    badge_w, badge_h = 340, 78
    bx, by = W//2 - badge_w//2, cy + 300
    draw.rounded_rectangle([bx, by, bx+badge_w, by+badge_h], radius=14, fill=(0,0,0,255), outline=(255,255,255,18), width=1)
    # Play icon triangle
    draw.polygon([(bx+28, by+20), (bx+28, by+58), (bx+58, by+39)], fill=(52,168,83,255))
    font_small = load_font(14, bold=True)
    draw.text((bx+72, by+16), "GET IT ON", font=font_small, fill=(255,255,255,200))
    font_big = load_font(26, bold=True)
    draw.text((bx+72, by+34), "Google Play", font=font_big, fill=(255,255,255,255))
    # SOON pill
    draw.rounded_rectangle([bx+badge_w+14, by+22, bx+badge_w+86, by+56], radius=20, fill=(34,197,94,38), outline=(34,197,94,36), width=1)
    font_soon = load_font(14, bold=True)
    draw.text((bx+badge_w+26, by+30), "SOON", font=font_soon, fill=(134,239,172,255))
    # Website URL
    font_url = load_font(18, bold=False)
    url = "chartmann1590.github.io/octopulse"
    bbox = draw.textbbox((0,0), url, font=font_url)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, by+108), url, font=font_url, fill=(100,116,139,255))
    # Small disclaimer
    font_disc = load_font(14, bold=False)
    disc = "Free • Contains ads • Privacy-first • MIT"
    bbox = draw.textbbox((0,0), disc, font=font_disc)
    tw = bbox[2]-bbox[0]
    draw.text((W//2 - tw//2, by+136), disc, font=font_disc, fill=(100,116,139,180))

    outro.save(SLIDE_DIR / "slide-07-outro.png")
    print("OK slide-07-outro.png")

    print(f"All slides generated in {SLIDE_DIR}")

if __name__ == "__main__":
    main()
