"""Genera hojas de contacto para revisar las fotos descargadas
antes de indexarlas.
"""

import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", type=Path)
parser.add_argument("--ids", type=int, nargs="*")
parser.add_argument("--pending", action="store_true")
args = parser.parse_args()
directory = args.directory.resolve()
files = sorted((directory / "productos").glob("*.json"))
if args.ids:
    files = [file for file in files if int(file.stem) in args.ids]
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 15)
heading_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 21)
preview = directory / "revision"
preview.mkdir(exist_ok=True)
all_manifests = []
for file in files:
    manifest = json.loads(file.read_text(encoding="utf-8"))
    manifest["images"] = [
        {**image, "originalIndex": index + 1}
        for index, image in enumerate(manifest["images"])
        if not args.pending or image["reviewStatus"] == "pending"
    ]
    if manifest["images"]:
        all_manifests.append(manifest)
for offset in range(0, len(all_manifests), 2):
    manifests = all_manifests[offset : offset + 2]
    heights = [
        50 + ((len(manifest["images"]) + 4) // 5) * 200
        for manifest in manifests
    ]
    sheet = Image.new("RGB", (1000, sum(heights)), "#e8edf2")
    draw = ImageDraw.Draw(sheet)
    for block, manifest in enumerate(manifests):
        top = sum(heights[:block])
        draw.text(
            (12, top + 8),
            f"{manifest['idProducto']:03d} · {manifest['nombre']}",
            fill="black",
            font=heading_font,
        )
        for index, entry in enumerate(manifest["images"][:10]):
            x, y = (index % 5) * 200, top + 42 + (index // 5) * 200
            with Image.open(directory / entry["file"]) as photo:
                photo = ImageOps.exif_transpose(photo).convert("RGBA")
                background = Image.new("RGBA", photo.size, "white")
                photo = Image.alpha_composite(background, photo).convert("RGB")
                thumb = ImageOps.contain(photo, (188, 156))
                sheet.paste(
                    thumb,
                    (
                        x + 6 + (188 - thumb.width) // 2,
                        y + (156 - thumb.height) // 2,
                    ),
                )
            draw.text(
                (x + 6, y + 159),
                f"{entry['originalIndex']:02d}  {entry['reviewStatus']}",
                fill="black",
                font=font,
            )
            title = entry.get("title", "")[:24]
            draw.text((x + 6, y + 178), title, fill="#394657", font=font)
    prefix = "pending-" if args.pending else ""
    path = preview / (
        f"{prefix}{manifests[0]['idProducto']:03d}"
        f"-{manifests[-1]['idProducto']:03d}.jpg"
    )
    sheet.save(path, quality=90)
    print(path)
