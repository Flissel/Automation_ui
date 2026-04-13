import mss
from PIL import Image

with mss.mss() as sct:
    mon = sct.monitors[2]  # second physical monitor (right)
    img = sct.grab(mon)
    pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
    pil.save(r"c:\Users\User\Desktop\Vibemind_V1\mon1_capture.png")
    print(f'Monitor 2: {pil.width}x{pil.height} at left={mon["left"]}')
