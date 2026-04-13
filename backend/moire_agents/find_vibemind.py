"""Find VibeMind window and bring it to front, then screenshot."""

import ctypes
import ctypes.wintypes

user32 = ctypes.windll.user32
EnumWindows = user32.EnumWindows
GetWindowText = user32.GetWindowTextW
GetWindowTextLength = user32.GetWindowTextLengthW
IsWindowVisible = user32.IsWindowVisible

windows = []


def enum_handler(hwnd, lParam):
    if IsWindowVisible(hwnd):
        length = GetWindowTextLength(hwnd)
        if length > 0:
            buf = ctypes.create_unicode_buffer(length + 1)
            GetWindowText(hwnd, buf, length + 1)
            title = buf.value
            if any(
                kw in title.lower()
                for kw in ["vibemind", "electron", "vibe", "moire", "brain", "minibook"]
            ):
                windows.append((hwnd, title))
    return True


WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
callback = WNDENUMPROC(enum_handler)
EnumWindows(callback, 0)

print("Matching windows:")
for hwnd, title in windows:
    print(f"  hwnd={hwnd}: '{title}'")

if not windows:
    print("No VibeMind window found - listing all visible windows:")

    def enum_all(hwnd, lParam):
        if IsWindowVisible(hwnd):
            length = GetWindowTextLength(hwnd)
            if length > 3:
                buf = ctypes.create_unicode_buffer(length + 1)
                GetWindowText(hwnd, buf, length + 1)
                print(f"  '{buf.value}'")
        return True

    cb2 = WNDENUMPROC(enum_all)
    EnumWindows(cb2, 0)
