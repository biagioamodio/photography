#!/usr/bin/env python3
"""
resize_images.py – Down-scale images in a folder while archiving originals.

Usage:
    python resize_images.py /path/to/folder            # default 2000 px
    python resize_images.py /path/to/folder --max 1200 # custom size

A sub-folder called “Full” is created inside the target folder and receives
an untouched copy of every processed image.
"""

import argparse
import shutil
import sys
from pathlib import Path

from PIL import Image  # pip install pillow


def shrink_images(folder: Path, max_edge: int = 2000) -> None:
    """Resize every image in *folder* whose longest side exceeds *max_edge* px."""
    full_dir = folder / "Full"
    full_dir.mkdir(exist_ok=True)

    # Basic extension filter – feel free to add more.
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}

    for file in folder.iterdir():
        if file.is_dir() or file.suffix.lower() not in exts:
            continue

        # 1) Archive the original (only once)
        backup = full_dir / file.name
        if not backup.exists():
            shutil.copy2(file, backup)

        # 2) Open and decide whether it needs shrinking
        try:
            with Image.open(file) as im:
                width, height = im.size
                longest = max(width, height)
                if longest <= max_edge:
                    continue  # already small enough

                # Preserve aspect ratio; Image.thumbnail mutates in-place
                im.thumbnail((max_edge, max_edge), Image.LANCZOS)

                # For JPEGs with alpha or palette, convert to RGB first
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")

                im.save(file, quality=90, optimize=True)
                print(f"Resized {file.name} → {im.width}×{im.height}")
        except Exception as exc:
            print(f"Skipped {file.name}: {exc}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Shrink images in a folder while keeping originals in Full/."
    )
    parser.add_argument("folder", type=Path, help="Folder containing the images")
    parser.add_argument(
        "--max",
        "-m",
        type=int,
        default=2000,
        metavar="PX",
        help="Longest edge in pixels (default 2000)",
    )
    args = parser.parse_args()

    if not args.folder.is_dir():
        sys.exit("Error: the provided path is not a folder.")

    shrink_images(args.folder, args.max)


if __name__ == "__main__":
    main()
