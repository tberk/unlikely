#!/usr/bin/env python3
"""Render the Unlikely icon (a pink heart with a slash) to icons/*.png.

Pure standard library so it runs anywhere: python3 scripts/make_icons.py
"""
import os
import struct
import zlib

PINK = (249, 24, 128)
SIZES = (16, 32, 48, 128)
SS = 4  # supersampling factor for anti-aliasing
OUT = os.path.join(os.path.dirname(__file__), "..", "icons")


def in_heart(x, y):
    # Classic implicit heart: (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0, y up.
    a = x * x + y * y - 1
    return a * a * a - x * x * y * y * y <= 0


def slash_dist(x, y):
    # Distance from the line y = x (bottom-left to top-right in heart space).
    return abs(x - y) / 2 ** 0.5


def coverage(px, py, size):
    """Return (heart_alpha, gap_alpha) for one pixel, both 0..1."""
    hits = gaps = 0
    for sy in range(SS):
        for sx in range(SS):
            # Map pixel to heart space roughly [-1.3, 1.3] x [-1.2, 1.4].
            u = ((px + (sx + 0.5) / SS) / size) * 2.7 - 1.35
            v = 1.42 - ((py + (sy + 0.5) / SS) / size) * 2.7
            if in_heart(u, v):
                if slash_dist(u, v) < 0.13:
                    gaps += 1
                else:
                    hits += 1
    n = SS * SS
    return hits / n, gaps / n


def png(size):
    rows = []
    for py in range(size):
        row = bytearray([0])  # filter: none
        for px in range(size):
            alpha, _ = coverage(px, py, size)
            row += bytes((*PINK, round(alpha * 255)))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for s in SIZES:
        path = os.path.join(OUT, f"icon{s}.png")
        with open(path, "wb") as f:
            f.write(png(s))
        print("wrote", os.path.normpath(path))
