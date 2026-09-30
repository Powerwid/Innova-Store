from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import hashlib
import math
import re
import shutil
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont


SOURCE = Path(r"C:\Users\Power\Downloads\diagrama_store.mwb")
OUTPUT = Path(r"C:\Users\Power\Downloads\diagrama_store_ordenado.mwb")
BACKUP = Path(r"C:\Users\Power\Downloads\diagrama_store_original_backup.mwb")
PREVIEW = Path(
    r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Store\tmp\mwb-layout\diagrama_store_ordenado.png"
)


# Las coordenadas se agrupan por dominios funcionales. No se modifica ningún
# objeto de base de datos: solo left/top de cada TableFigure del diagrama EER.
POSITIONS = {
    # Seguridad, usuarios y configuración.
    "estados": (50, 50),
    "roles": (260, 50),
    "permisos": (470, 50),
    "roles_permisos": (450, 215),
    "configuraciones_globales": (650, 50),
    "tipos_documento": (930, 50),
    "usuarios_perfiles": (1140, 50),
    "_prisma_migrations": (1420, 50),
    "usuarios": (650, 320),
    "usuarios_sucursales": (860, 370),
    "sucursales": (1090, 350),
    "sucursales_perfiles": (1285, 350),
    # Catálogos, productos e inventario.
    "tipos_producto": (1740, 50),
    "categorias": (1945, 50),
    "unidades_medida": (2150, 50),
    "productos": (1925, 310),
    "producto_sucursal": (1650, 650),
    "almacenes": (1430, 835),
    "inventarios": (1660, 960),
    "tipos_movimiento_inventario": (1900, 1000),
    "inventario_movimientos": (1690, 1285),
    # Compras, proveedores y salidas de dinero.
    "proveedores": (50, 650),
    "compras": (350, 650),
    "compras_detalle": (650, 790),
    "tipos_comprobante": (50, 1060),
    "comprobantes": (350, 1060),
    "compras_percepciones": (590, 1140),
    "motivo_egreso": (570, 1480),
    "egresos": (800, 1480),
    "egresos_detalle_pago": (1070, 1810),
    # Caja y medios de pago compartidos.
    "cajas": (1060, 850),
    "caja_detalle": (1120, 1160),
    "medios_pago": (1270, 1420),
    # Ventas, ingresos, clientes y créditos.
    "motivo_ingreso": (2390, 760),
    "clientes": (2840, 650),
    "ingresos": (2360, 1010),
    "ingresos_productos": (2070, 1370),
    "ingresos_detalle_pago": (2630, 1370),
    "deudas_clientes": (2870, 1050),
    "abonos_deuda_cliente": (2890, 1425),
}

COLORS = {
    "security": "#DDEBF7",
    "catalog": "#E2F0D9",
    "purchase": "#FCE4D6",
    "shared": "#FFF2CC",
    "sales": "#E4DFEC",
}

GROUPS = {
    **{name: "security" for name in [
        "estados", "roles", "permisos", "roles_permisos", "configuraciones_globales",
        "tipos_documento", "usuarios_perfiles", "_prisma_migrations", "usuarios",
        "usuarios_sucursales", "sucursales", "sucursales_perfiles",
    ]},
    **{name: "catalog" for name in [
        "tipos_producto", "categorias", "unidades_medida", "productos",
        "producto_sucursal", "almacenes", "inventarios",
        "tipos_movimiento_inventario", "inventario_movimientos",
    ]},
    **{name: "purchase" for name in [
        "proveedores", "compras", "compras_detalle", "tipos_comprobante",
        "comprobantes", "compras_percepciones", "motivo_egreso", "egresos",
        "egresos_detalle_pago",
    ]},
    **{name: "shared" for name in ["cajas", "caja_detalle", "medios_pago"]},
    **{name: "sales" for name in [
        "motivo_ingreso", "clientes", "ingresos", "ingresos_productos",
        "ingresos_detalle_pago", "deudas_clientes", "abonos_deuda_cliente",
    ]},
}


def child_text(element: ET.Element, key: str) -> str | None:
    child = element.find(f'value[@key="{key}"]')
    return child.text if child is not None else None


def load_model(source: Path):
    with ZipFile(source) as archive:
        xml_bytes = archive.read("document.mwb.xml")
    root = ET.fromstring(xml_bytes)

    table_by_id = {}
    for table in root.findall('.//value[@struct-name="db.mysql.Table"]'):
        name = child_text(table, "name")
        if name:
            table_by_id[table.attrib["id"]] = (name, table)

    figures = {}
    for figure in root.findall('.//value[@struct-name="workbench.physical.TableFigure"]'):
        name = child_text(figure, "name")
        if name:
            figures[name] = {
                "x": float(child_text(figure, "left")),
                "y": float(child_text(figure, "top")),
                "w": float(child_text(figure, "width")),
                "h": float(child_text(figure, "height")),
            }

    edges = []
    for _, (source_name, table) in table_by_id.items():
        for fk in table.findall('.//value[@struct-name="db.mysql.ForeignKey"]'):
            referenced = fk.find('link[@key="referencedTable"]')
            if referenced is not None and referenced.text in table_by_id:
                edges.append((source_name, table_by_id[referenced.text][0]))
    return xml_bytes, root, figures, edges


def replace_figure_positions(xml_bytes: bytes, positions: dict[str, tuple[int, int]]) -> bytes:
    text = xml_bytes.decode("utf-8")
    signature = '<value type="object" struct-name="workbench.physical.TableFigure"'
    cursor = 0
    parts = []
    discovered = set()

    while True:
        start = text.find(signature, cursor)
        if start < 0:
            parts.append(text[cursor:])
            break
        line_start = text.rfind("\n", 0, start) + 1
        indent = text[line_start:start]
        end_marker = f"\n{indent}</value>"
        end = text.find(end_marker, start)
        if end < 0:
            raise RuntimeError("No se pudo delimitar una figura de tabla.")
        end += len(end_marker)
        block = text[start:end]

        name_match = re.search(r'<value type="string" key="name">([^<]+)</value>', block)
        if not name_match:
            raise RuntimeError("Se encontró una figura sin nombre.")
        name = name_match.group(1)
        discovered.add(name)
        if name not in positions:
            raise RuntimeError(f"Falta una coordenada para {name}.")
        left, top = positions[name]
        block, left_count = re.subn(
            r'(<value type="real" key="left">)[^<]+(</value>)',
            rf'\g<1>{left}\g<2>',
            block,
            count=1,
        )
        block, top_count = re.subn(
            r'(<value type="real" key="top">)[^<]+(</value>)',
            rf'\g<1>{top}\g<2>',
            block,
            count=1,
        )
        if left_count != 1 or top_count != 1:
            raise RuntimeError(f"No se pudieron actualizar las coordenadas de {name}.")

        parts.append(text[cursor:start])
        parts.append(block)
        cursor = end

    if discovered != set(positions):
        missing = sorted(set(positions) - discovered)
        extra = sorted(discovered - set(positions))
        raise RuntimeError(f"Diferencias en figuras. Faltantes={missing}; extras={extra}")
    return "".join(parts).encode("utf-8")


def write_archive(source: Path, output: Path, xml_bytes: bytes) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(source, "r") as original, ZipFile(output, "w") as result:
        for item in original.infolist():
            payload = xml_bytes if item.filename == "document.mwb.xml" else original.read(item.filename)
            result.writestr(item, payload, compress_type=item.compress_type or ZIP_DEFLATED)


def segments_cross(a1, a2, b1, b2) -> bool:
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    return orient(a1, a2, b1) * orient(a1, a2, b2) < 0 and orient(b1, b2, a1) * orient(b1, b2, a2) < 0


def layout_metrics(figures, edges, positions):
    centers = {
        name: (positions[name][0] + data["w"] / 2, positions[name][1] + data["h"] / 2)
        for name, data in figures.items()
    }
    total_length = sum(math.dist(centers[source], centers[target]) for source, target in edges)
    crossings = 0
    for index, (source_a, target_a) in enumerate(edges):
        for source_b, target_b in edges[index + 1 :]:
            if {source_a, target_a} & {source_b, target_b}:
                continue
            crossings += segments_cross(
                centers[source_a], centers[target_a], centers[source_b], centers[target_b]
            )
    return crossings, total_length


def verify_no_overlap(figures, positions, padding=12):
    names = list(figures)
    for index, first in enumerate(names):
        ax, ay = positions[first]
        aw, ah = figures[first]["w"], figures[first]["h"]
        for second in names[index + 1 :]:
            bx, by = positions[second]
            bw, bh = figures[second]["w"], figures[second]["h"]
            separated = (
                ax + aw + padding <= bx
                or bx + bw + padding <= ax
                or ay + ah + padding <= by
                or by + bh + padding <= ay
            )
            if not separated:
                raise RuntimeError(f"Superposición entre {first} y {second}.")


def make_preview(figures, edges, positions, output: Path):
    scale = 0.45
    max_x = max(positions[name][0] + data["w"] for name, data in figures.items())
    max_y = max(positions[name][1] + data["h"] for name, data in figures.items())
    image = Image.new("RGB", (int(max_x * scale + 60), int(max_y * scale + 60)), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", 10)
    except OSError:
        font = ImageFont.load_default()

    centers = {
        name: (
            int((positions[name][0] + data["w"] / 2) * scale + 20),
            int((positions[name][1] + data["h"] / 2) * scale + 20),
        )
        for name, data in figures.items()
    }
    for source, target in edges:
        draw.line([centers[source], centers[target]], fill="#A6A6A6", width=1)

    for name, data in figures.items():
        x = int(positions[name][0] * scale + 20)
        y = int(positions[name][1] * scale + 20)
        width = max(72, int(data["w"] * scale))
        height = max(32, int(data["h"] * scale))
        color = COLORS[GROUPS[name]]
        draw.rounded_rectangle((x, y, x + width, y + height), radius=4, fill=color, outline="#1F4E78", width=1)
        label = name if len(name) <= 23 else name[:21] + "…"
        draw.text((x + 4, y + 4), label, fill="#111111", font=font)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    xml_before, root_before, figures_before, edges_before = load_model(SOURCE)
    if set(figures_before) != set(POSITIONS):
        raise RuntimeError("La lista de tablas del modelo no coincide con el diseño previsto.")
    verify_no_overlap(figures_before, POSITIONS)

    if not BACKUP.exists():
        shutil.copy2(SOURCE, BACKUP)

    xml_after = replace_figure_positions(xml_before, POSITIONS)
    write_archive(SOURCE, OUTPUT, xml_after)

    _, root_after, figures_after, edges_after = load_model(OUTPUT)
    if len(figures_after) != len(figures_before) or edges_after != edges_before:
        raise RuntimeError("La validación detectó un cambio estructural no permitido.")

    old_positions = {name: (data["x"], data["y"]) for name, data in figures_before.items()}
    new_positions = {name: (data["x"], data["y"]) for name, data in figures_after.items()}
    if new_positions != {name: tuple(map(float, value)) for name, value in POSITIONS.items()}:
        raise RuntimeError("Las posiciones guardadas no coinciden con el diseño previsto.")

    # Verificación semántica: fuera de las coordenadas left/top, el XML debe ser idéntico.
    scrub = lambda data: re.sub(
        rb'(<value type="real" key="(?:left|top)">)[^<]+(</value>)', rb'\1#\2', data
    )
    if hashlib.sha256(scrub(xml_before)).digest() != hashlib.sha256(scrub(xml_after)).digest():
        raise RuntimeError("Se modificó contenido distinto de las coordenadas visuales.")

    old_metrics = layout_metrics(figures_before, edges_before, old_positions)
    new_metrics = layout_metrics(figures_after, edges_after, new_positions)
    make_preview(figures_after, edges_after, POSITIONS, PREVIEW)

    print(f"Archivo ordenado: {OUTPUT}")
    print(f"Copia de seguridad: {BACKUP}")
    print(f"Vista previa: {PREVIEW}")
    print(f"Tablas conservadas: {len(figures_after)}")
    print(f"Relaciones conservadas: {len(edges_after)}")
    print(f"Cruces aproximados: {old_metrics[0]} -> {new_metrics[0]}")
    print(f"Longitud total aproximada: {old_metrics[1]:.0f} -> {new_metrics[1]:.0f}")


if __name__ == "__main__":
    main()
