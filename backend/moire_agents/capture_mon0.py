"""Capture monitor 0 and save to file for inspection."""

import base64
import io
import sys

sys.path.insert(0, ".")

import mss
from PIL import Image

with mss.mss() as sct:
    monitors = sct.monitors
    print(f"Monitors:")
    for i, m in enumerate(monitors):
        print(f"  [{i}] {m}")

    # Capture monitor index 1 = first physical monitor
    mon = monitors[1]
    img = sct.grab(mon)
    pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
    out_path = r"c:\Users\User\Desktop\Vibemind_V1\mon0_capture.png"
    pil.save(out_path)
    print(f"Saved: {out_path} ({pil.width}x{pil.height})")
