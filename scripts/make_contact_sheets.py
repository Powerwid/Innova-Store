import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


parser = argparse.ArgumentParser()
parser.add_argument(
    "root",
    nargs="?",
    default=r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Store\tmp\rendered-thesis-24",
)
args = parser.parse_args()

ROOT = Path(args.root)
PAGES = sorted(ROOT.glob("page-*.png"))

thumb_width = 420
label_height = 34
columns = 4
rows = 4
gap = 12

for sheet_index in range(0, len(PAGES), columns * rows):
    group = PAGES[sheet_index : sheet_index + columns * rows]
    thumbnails = []
    for path in group:
        with Image.open(path) as image:
            ratio = thumb_width / image.width
            resized = image.resize((thumb_width, int(image.height * ratio)))
            thumbnails.append((path, resized.copy()))

    cell_height = max(image.height for _, image in thumbnails) + label_height
    sheet = Image.new(
        "RGB",
        (columns * thumb_width + (columns + 1) * gap, rows * cell_height + (rows + 1) * gap),
        "#d7d7d7",
    )
    draw = ImageDraw.Draw(sheet)
    for index, (path, image) in enumerate(thumbnails):
        row, column = divmod(index, columns)
        x = gap + column * (thumb_width + gap)
        y = gap + row * (cell_height + gap)
        page_number = int(path.stem.split("-")[-1])
        draw.text((x + 4, y + 5), f"Página {page_number}", fill="black")
        sheet.paste(image, (x, y + label_height))

    output = ROOT / f"contact-{sheet_index // (columns * rows) + 1:02d}.png"
    sheet.save(output)
    print(output)
