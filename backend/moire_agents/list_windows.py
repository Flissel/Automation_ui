import ctypes
import ctypes.wintypes

user32 = ctypes.windll.user32
EnumWindows = user32.EnumWindows
GetWindowText = user32.GetWindowTextW
GetWindowTextLength = user32.GetWindowTextLengthW
IsWindowVisible = user32.IsWindowVisible

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)


def enum_all(hwnd, lParam):
    if IsWindowVisible(hwnd):
        length = GetWindowTextLength(hwnd)
        if length > 2:
            buf = ctypes.create_unicode_buffer(length + 1)
            GetWindowText(hwnd, buf, length + 1)
            print(f"  '{buf.value}'")
    return True


cb = WNDENUMPROC(enum_all)
EnumWindows(cb, 0)
