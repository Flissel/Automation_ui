"""Quick reconnect: scan for MCP panel already open, click Reconnect."""

import time

import mss as mss_mod
import numpy
import pyautogui
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ocr = RapidOCR()

with mss_mod.mss() as sct:
    monitors = sct.monitors[1:]

for mi, mon in enumerate(monitors):
    x, y = mon["left"], mon["top"]
    with mss_mod.mss() as sct:
        raw = sct.grab(mon)
    img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
    result, _ = ocr(numpy.array(img))
    if not result:
        continue
    for poly, text, conf in result:
        if "desktop-automation" in text.lower() and len(text) < 40:
            xs = [p[0] for p in poly]
            ys = [p[1] for p in poly]
            cx = int(sum(xs) / len(xs)) + x
            cy = int(sum(ys) / len(ys)) + y
            print(f"FOUND desktop-automation on monitor {mi}: ({cx},{cy})")
            pyautogui.click(cx, cy)
            time.sleep(1.5)
            # Rescan for Reconnect
            with mss_mod.mss() as sct:
                raw2 = sct.grab(mon)
            img2 = Image.frombytes("RGB", raw2.size, raw2.bgra, "raw", "BGRX")
            r2, _ = ocr(numpy.array(img2))
            for poly2, text2, conf2 in r2 or []:
                if "reconnect" in text2.lower() and len(text2) < 30:
                    xs2 = [p[0] for p in poly2]
                    ys2 = [p[1] for p in poly2]
                    cx2 = int(sum(xs2) / len(xs2)) + x
                    cy2 = int(sum(ys2) / len(ys2)) + y
                    print(f"RECONNECT at ({cx2},{cy2})")
                    pyautogui.click(cx2, cy2)
                    print("CLICKED! Waiting 20s...")
                    time.sleep(20)
                    pyautogui.press("escape")
                    print("DONE")
                    exit(0)
            print("Reconnect button not found")
            exit(1)

print("desktop-automation not found")
exit(1)
