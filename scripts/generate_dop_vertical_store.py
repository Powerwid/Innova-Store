from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "diagrams" / "dop_vertical_metodo_manual_tienda.png"

activities = [
    ("O", 1, "Revisión visual de las existencias"),
    ("O", 2, "Preparación del pedido al proveedor"),
    ("O", 3, "Recepción de la mercadería y los documentos"),
    ("I", 1, "Verificación de cantidades y estado de los productos"),
    ("I", 2, "Revisión del comprobante y de la percepción"),
    ("O", 4, "Registro manual de la compra y del gasto"),
    ("O", 5, "Colocación de los productos en estantes o refrigeradoras"),
    ("O", 6, "Atención al cliente y selección de los productos"),
    ("O", 7, "Cálculo manual del importe de la venta"),
    ("I", 3, "Comprobación del total calculado"),
    ("O", 8, "Elaboración manual del ticket interno"),
    ("O", 9, "Cobro de la venta o anotación del fiado"),
    ("O", 10, "Archivo del ticket o de la anotación realizada"),
    ("I", 4, "Revisión de caja, existencias y cuentas pendientes"),
    ("O", 11, "Consolidación manual de compras, ventas, gastos y fiados"),
]


def load_font(size: int):
    candidates = [
        Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\calibri.ttf"),
        Path(r"C:\Windows\Fonts\segoeui.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


W, H = 1900, 2480
img = Image.new("RGB", (W, H), "white")
draw = ImageDraw.Draw(img)
font = load_font(41)
number_font = load_font(42)
small_font = load_font(30)

line_color = "#202020"
node_x = 180
text_x = 340
start_y = 105
gap = 151
radius = 56
line_width = 5


def wrapped_lines(text: str):
    return textwrap.wrap(text, width=55, break_long_words=False, break_on_hyphens=False)


for idx, (kind, number, description) in enumerate(activities):
    y = start_y + idx * gap

    if idx < len(activities) - 1:
        next_y = start_y + (idx + 1) * gap
        draw.line((node_x, y + radius, node_x, next_y - radius - 15), fill=line_color, width=line_width)
        arrow_y = next_y - radius - 15
        draw.polygon(
            [(node_x, arrow_y + 14), (node_x - 13, arrow_y - 8), (node_x + 13, arrow_y - 8)],
            fill=line_color,
        )

    bbox = (node_x - radius, y - radius, node_x + radius, y + radius)
    if kind == "O":
        draw.ellipse(bbox, outline=line_color, width=line_width)
    else:
        draw.rectangle(bbox, outline=line_color, width=line_width)

    number_text = str(number)
    nb = draw.textbbox((0, 0), number_text, font=number_font)
    draw.text(
        (node_x - (nb[2] - nb[0]) / 2, y - (nb[3] - nb[1]) / 2 - nb[1]),
        number_text,
        fill="#111111",
        font=number_font,
    )

    lines = wrapped_lines(description)
    line_height = 49
    block_h = len(lines) * line_height
    ty = y - block_h / 2
    for line in lines:
        draw.text((text_x, ty), line, fill="#111111", font=font)
        ty += line_height

draw.text((125, H - 90), "○ Operación     □ Inspección", fill="#444444", font=small_font)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, dpi=(300, 300), optimize=True)
print(OUT)
