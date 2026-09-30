from collections import defaultdict
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


SOURCE = Path(r"C:\Users\Power\Downloads\diagrama_store.mwb")


def child_text(element, key):
    child = element.find(f'value[@key="{key}"]')
    return child.text if child is not None else None


with ZipFile(SOURCE) as archive:
    root = ET.fromstring(archive.read("document.mwb.xml"))

tables = {}
for table in root.findall('.//value[@struct-name="db.mysql.Table"]'):
    name = child_text(table, "name")
    if name:
        tables[table.attrib["id"]] = (name, table)

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
for table_id, (source_name, table) in tables.items():
    for fk in table.findall('.//value[@struct-name="db.mysql.ForeignKey"]'):
        referenced = fk.find('link[@key="referencedTable"]')
        if referenced is not None and referenced.text in tables:
            target_name = tables[referenced.text][0]
            fk_name = child_text(fk, "name") or ""
            edges.append((source_name, target_name, fk_name))

degree = defaultdict(int)
for source, target, _ in edges:
    degree[source] += 1
    degree[target] += 1

print(f"Tablas: {len(figures)}; relaciones: {len(edges)}")
print("\nRELACIONES")
for source, target, fk_name in sorted(edges):
    print(f"{source:30} -> {target:30} {fk_name}")

print("\nGRADO")
for name, value in sorted(degree.items(), key=lambda item: (-item[1], item[0])):
    print(f"{name:30} {value}")

print("\nFIGURAS")
for name, data in sorted(figures.items(), key=lambda item: (item[1]["y"], item[1]["x"])):
    print(
        f'{name:30} x={data["x"]:>5.0f} y={data["y"]:>5.0f} '
        f'w={data["w"]:>4.0f} h={data["h"]:>4.0f}'
    )
