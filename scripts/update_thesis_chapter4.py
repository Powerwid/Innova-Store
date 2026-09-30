from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


SOURCE = Path(
    r"C:\Users\Power\Downloads\Tesis_JosephKleynMamaniPerez_capitulo3_actualizado.docx"
)
OUTPUT = Path(
    r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Store\output\documentos"
    r"\Tesis_JosephKleynMamaniPerez_capitulo4_actualizado.docx"
)
ASSET_DIR = Path(
    r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Store\tmp\chapter4-assets"
)


PLAN_ROWS = [
    ["1", "Confirmar alcance y requisitos", "Validar procesos, actores, reglas de compra, venta, caja, fiado, clientes y seguridad.", "Responsable del proyecto y propietarios", "Requisitos aprobados y priorizados"],
    ["2", "Diseñar la solución", "Definir arquitectura, modelo de datos, permisos, interfaces y criterios de aceptación.", "Responsable del proyecto", "Diseño técnico y prototipos"],
    ["3", "Configurar la base del sistema", "Preparar autenticación, usuarios, roles, permisos, sucursal y parámetros generales.", "Responsable del proyecto", "Acceso seguro y configuración inicial"],
    ["4", "Implementar compras e inventario", "Registrar proveedores, productos, almacenes, comprobantes recibidos, percepciones y movimientos de stock.", "Responsable del proyecto", "Compras vinculadas al kardex"],
    ["5", "Implementar ventas y caja", "Calcular importes, registrar medios de pago, generar tickets internos y actualizar existencias y caja.", "Responsable del proyecto", "Venta completa y trazable"],
    ["6", "Implementar fiados y clientes", "Controlar deudas, abonos, saldos, historial de clientes frecuentes, promociones y recompensas.", "Responsable del proyecto y propietarios", "Cuentas por cobrar y fidelización"],
    ["7", "Incorporar reportes", "Generar consultas, PDF, XLSX y códigos de barras para productos y operaciones.", "Responsable del proyecto", "Reportes verificables"],
    ["8", "Incorporar eventos en tiempo real", "Notificar cambios de stock, ventas, caja, deudas y alertas mediante Socket.IO.", "Responsable del proyecto", "Eventos autorizados en tiempo real"],
    ["9", "Integrar cámaras e inteligencia artificial", "Conectar flujos autorizados, procesar video y emitir alertas revisables por una persona.", "Responsable del proyecto y propietarios", "Módulo de seguridad integrado"],
    ["10", "Probar, migrar y desplegar", "Ejecutar pruebas, cargar datos iniciales, capacitar usuarios, respaldar información y poner en operación.", "Responsable del proyecto y usuarios", "Sistema validado y operativo"],
]


CONSIDERATION_ROWS = [
    ["Arquitectura", "Separar interfaz, API, base de datos y servicio de video.", "Mantener módulos independientes y contratos de comunicación definidos."],
    ["Seguridad", "Proteger credenciales, información comercial y datos de clientes.", "Aplicar autenticación, roles, permisos, hash de contraseñas, variables de entorno y registros de auditoría."],
    ["Integridad", "Evitar compras, ventas o pagos aplicados de forma parcial.", "Usar validaciones y transacciones para actualizar operación, inventario, caja y deuda como una sola unidad lógica."],
    ["Disponibilidad", "La falla de cámaras o IA no debe detener la gestión comercial.", "Desacoplar el servicio de video y mostrar su estado sin bloquear ventas, compras o caja."],
    ["Usabilidad", "Los propietarios son adultos mayores y requieren una interacción sencilla.", "Emplear textos claros, controles visibles, pocos pasos, confirmaciones y capacitación práctica."],
    ["Operación", "Los datos iniciales provienen de cuadernos y comprobantes físicos.", "Depurar catálogos, validar saldos de stock y deuda, y conservar evidencia de la carga inicial."],
    ["Ambiental", "La solución utiliza equipos, energía y documentos impresos.", "Digitalizar registros internos, imprimir solo cuando sea necesario y reutilizar equipos compatibles en buen estado."],
    ["Videovigilancia", "El análisis de imágenes puede generar falsas alertas.", "Limitar el acceso, definir conservación, ajustar umbrales y exigir revisión humana antes de cualquier acción."],
]


SOFTWARE_ROWS = [
    ["Interfaz web", "Vue.js, TypeScript, Vuetify, Pinia, Vue Router y Vite", "Pantallas, navegación, estado compartido y compilación del frontend"],
    ["Servidor", "Node.js, NestJS y TypeScript", "API, reglas del negocio, autenticación y coordinación de módulos"],
    ["Datos", "MySQL y Prisma ORM", "Persistencia relacional, consultas tipadas, migraciones y transacciones"],
    ["Comunicación", "HTTP, JSON, Axios, WebSocket y Socket.IO", "Intercambio de datos y actualización de eventos en tiempo real"],
    ["Documentos", "pdfmake, ExcelJS y bwip-js", "Tickets internos, reportes PDF/XLSX y códigos de barras"],
    ["Inteligencia artificial", "Python, FastAPI, Pydantic, Uvicorn, OpenCV, PyTorch, YOLOv8, ByteTrack y 3D CNN", "Captura, detección, seguimiento y clasificación de secuencias de video"],
    ["Calidad", "Vitest, Supertest, Oxlint y Prettier", "Pruebas funcionales, validación de endpoints y consistencia del código"],
]


HARDWARE_ROWS = [
    ["Equipo de atención", "Computadora existente o equivalente, navegador actualizado", "Registro de compras, ventas, caja y consultas"],
    ["Servidor", "Equipo local o servicio de alojamiento según el despliegue", "Ejecución del backend y almacenamiento de la base de datos"],
    ["Impresora de tickets", "Impresora térmica compatible", "Entrega opcional del ticket interno"],
    ["Lector de códigos", "Lector USB o cámara compatible", "Búsqueda rápida de productos"],
    ["Cámaras", "Cámaras IP existentes con acceso autorizado", "Visualización y obtención de secuencias para análisis"],
    ["Red", "Router, cableado y conexión estable", "Comunicación entre equipos, cámaras y servidor"],
    ["Respaldo eléctrico", "UPS o estabilizador recomendado", "Reducción del riesgo de interrupción y corrupción de datos"],
    ["Procesamiento de IA", "CPU compatible; GPU opcional según rendimiento requerido", "Inferencia del modelo y procesamiento de video"],
]


HUMAN_ROWS = [
    ["Responsable del proyecto", "Análisis, diseño, programación, pruebas, despliegue y documentación"],
    ["Propietarios", "Validación de reglas, datos iniciales, promociones, límites y aceptación de resultados"],
    ["Usuarios de atención", "Pruebas de ventas, caja, fiados y retroalimentación sobre la facilidad de uso"],
    ["Asesor o especialista", "Orientación académica y revisión de aspectos técnicos, contables o de seguridad cuando corresponda"],
]


PROCESS_ROWS = [
    ["1", "Iniciar sesión y seleccionar contexto de trabajo", "Autenticación, rol, permiso y sucursal", "Sesión autorizada"],
    ["2", "Registrar o consultar proveedor y producto", "Validación de duplicados y datos obligatorios", "Catálogo disponible"],
    ["3", "Registrar compra y documento recibido", "Totales, percepción, forma de pago y estado", "Compra trazable"],
    ["4", "Confirmar recepción de mercadería", "Transacción de entrada y kardex", "Stock actualizado"],
    ["5", "Seleccionar productos para la venta", "Código, precio, unidad y existencia", "Detalle de venta válido"],
    ["6", "Calcular y confirmar el total", "Subtotales, descuentos y monto final", "Importe correcto"],
    ["7", "Registrar pago al contado o fiado", "Medio de pago, caja o cuenta por cobrar", "Operación económica registrada"],
    ["8", "Generar ticket interno", "Correlativo, detalle, cantidades y total", "Constancia operativa"],
    ["9", "Actualizar inventario, caja o deuda", "Transacción única y auditoría", "Saldos consistentes"],
    ["10", "Actualizar historial del cliente", "Frecuencia, acumulación y reglas de promoción", "Información para recompensas"],
    ["11", "Emitir eventos en tiempo real", "Socket autenticado y ámbito autorizado", "Pantallas sincronizadas"],
    ["12", "Consultar reportes y alertas", "Filtros, permisos y revisión humana", "Información para supervisión"],
]


SCHEDULE_ROWS = [
    ["Levantamiento y validación de requisitos", "X", "X", "", "", "", "", "", ""],
    ["Arquitectura, base de datos y prototipos", "", "X", "X", "", "", "", "", ""],
    ["Autenticación, roles y datos maestros", "", "", "X", "X", "", "", "", ""],
    ["Compras, comprobantes, percepciones e inventario", "", "", "", "X", "X", "", "", ""],
    ["Ventas, tickets, caja y medios de pago", "", "", "", "", "X", "X", "", ""],
    ["Fiados, abonos, clientes y promociones", "", "", "", "", "", "X", "X", ""],
    ["Reportes PDF/XLSX, códigos y Socket.IO", "", "", "", "", "", "X", "X", ""],
    ["Cámaras y servicio de inteligencia artificial", "", "", "", "", "", "", "X", "X"],
    ["Pruebas, carga inicial y correcciones", "", "", "", "", "", "", "X", "X"],
    ["Capacitación, despliegue y seguimiento", "", "", "", "", "", "", "", "X"],
]


RISK_ROWS = [
    ["Información inicial incompleta o duplicada", "Media", "Alta", "Depurar productos, proveedores, stock, clientes y deudas antes de la carga.", "Corregir mediante ajustes trazables y conservar el respaldo original."],
    ["Interrupción eléctrica o de red", "Media", "Alta", "Respaldos programados, UPS y monitoreo del servicio.", "Aplicar procedimiento temporal y registrar luego las operaciones pendientes."],
    ["Cámaras incompatibles o sin acceso estable", "Media", "Media", "Probar RTSP, resolución, credenciales y ancho de banda por cámara.", "Mantener visualización independiente e integrar solo dispositivos compatibles."],
    ["Rendimiento insuficiente para procesar video", "Media", "Alta", "Ajustar resolución, fotogramas por segundo, zonas y número de transmisiones.", "Procesar por intervalos o incorporar hardware especializado cuando sea viable."],
    ["Falsas alertas del modelo", "Alta", "Alta", "Entrenar con datos representativos, medir resultados y configurar umbrales.", "Tratar la alerta como apoyo y exigir siempre revisión humana."],
    ["Exposición de datos personales o imágenes", "Baja", "Alta", "Roles, cifrado en tránsito, credenciales protegidas y política de conservación.", "Revocar accesos, aislar el servicio y revisar los registros de auditoría."],
    ["Dificultad de adaptación de los usuarios", "Media", "Alta", "Interfaz simple, pruebas con los propietarios y capacitación por tareas reales.", "Despliegue gradual, guía breve y acompañamiento durante el inicio."],
    ["Confusión entre ticket interno y comprobante tributario", "Media", "Alta", "Rotular claramente el ticket y mantener fuera del alcance la emisión de boletas o facturas.", "Corregir el formato y reforzar la capacitación antes de continuar su uso."],
    ["Tiempo o presupuesto insuficiente", "Media", "Media", "Priorizar módulos críticos y aprobar cambios de alcance antes de ejecutarlos.", "Postergar funciones no esenciales sin afectar compras, ventas, inventario, caja y fiados."],
]


def set_run_font(run, size: float = 12, bold: bool | None = None, italic: bool | None = None, color: str = "000000") -> None:
    run.font.name = "Times New Roman"
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run.font.size = Pt(size)
    run.font.color.rgb = None
    run._element.get_or_add_rPr().get_or_add_color().set(qn("w:val"), color)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def remove_paragraph(paragraph) -> None:
    element = paragraph._element
    element.getparent().remove(element)
    paragraph._p = paragraph._element = None


def format_body(paragraph) -> None:
    paragraph.style = "APA 7MA EDICION"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph.paragraph_format.first_line_indent = Inches(0.5)
    paragraph.paragraph_format.line_spacing = 2
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.widow_control = True


def insert_body(anchor, text: str):
    paragraph = anchor.insert_paragraph_before()
    format_body(paragraph)
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def insert_subheading(anchor, text: str):
    paragraph = anchor.insert_paragraph_before()
    format_body(paragraph)
    paragraph.paragraph_format.first_line_indent = Inches(0)
    paragraph.paragraph_format.keep_with_next = True
    run = paragraph.add_run(text)
    set_run_font(run, bold=True)
    return paragraph


def insert_caption(anchor, label: str, title: str):
    number = anchor.insert_paragraph_before()
    number.style = "Normal"
    number.alignment = WD_ALIGN_PARAGRAPH.LEFT
    number.paragraph_format.keep_with_next = True
    number.paragraph_format.space_after = Pt(0)
    run = number.add_run(label)
    set_run_font(run, bold=True)

    caption = anchor.insert_paragraph_before()
    caption.style = "Normal"
    caption.alignment = WD_ALIGN_PARAGRAPH.LEFT
    caption.paragraph_format.keep_with_next = True
    caption.paragraph_format.space_after = Pt(4)
    run = caption.add_run(title)
    set_run_font(run, italic=True)
    return number, caption


def insert_note(anchor, text: str = "Elaboración propia."):
    paragraph = anchor.insert_paragraph_before()
    paragraph.style = "Normal"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.space_before = Pt(3)
    paragraph.paragraph_format.space_after = Pt(6)
    lead = paragraph.add_run("Nota. ")
    set_run_font(lead, italic=True)
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top: int = 90, start: int = 90, bottom: int = 90, end: int = 90) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color: str = "D9D9D9", size: str = "6") -> None:
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = borders.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:color"), color)


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def insert_table(document, anchor, headers: list[str], rows: list[list[str]], widths: list[float], font_size: float = 9.0, schedule: bool = False):
    table = document.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table._element.getparent().remove(table._element)
    anchor._p.addprevious(table._element)
    set_table_borders(table)

    header = table.rows[0]
    set_repeat_table_header(header)
    for index, text in enumerate(headers):
        cell = header.cells[index]
        cell.width = Inches(widths[index])
        set_cell_shading(cell, "1F4E78")
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        paragraph = cell.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(0)
        paragraph.paragraph_format.line_spacing = 1
        run = paragraph.add_run(text)
        set_run_font(run, size=font_size, bold=True, color="FFFFFF")

    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for index, value in enumerate(values):
            cell = cells[index]
            cell.width = Inches(widths[index])
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if row_index % 2 == 1:
                set_cell_shading(cell, "F2F7FB")
            if schedule and index > 0 and value:
                set_cell_shading(cell, "D9EAF7")
            paragraph = cell.paragraphs[0]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if index == 0 or (schedule and index > 0) else WD_ALIGN_PARAGRAPH.LEFT
            paragraph.paragraph_format.space_before = Pt(0)
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1
            run = paragraph.add_run(value)
            set_run_font(run, size=font_size, bold=(schedule and index > 0 and bool(value)))
    return table


def load_fonts(size: int, bold: bool = False):
    candidates = [
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def rounded_box(draw, box, text: str, fill: str, outline: str = "1F4E78", font_size: int = 30, bold: bool = True) -> None:
    fill = f"#{fill}" if len(fill) == 6 and not fill.startswith("#") else fill
    outline = f"#{outline}" if len(outline) == 6 and not outline.startswith("#") else outline
    draw.rounded_rectangle(box, radius=18, fill=fill, outline=outline, width=4)
    font = load_fonts(font_size, bold=bold)
    x1, y1, x2, y2 = box
    words = text.split()
    lines: list[str] = []
    current = ""
    max_width = x2 - x1 - 28
    for word in words:
        trial = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), trial, font=font)[2] <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    line_height = font_size + 7
    y = (y1 + y2 - len(lines) * line_height) / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (x1 + x2 - (bbox[2] - bbox[0])) / 2
        draw.text((x, y), line, font=font, fill="#111111")
        y += line_height


def arrow(draw, start, end, color: str = "5B6573", width: int = 7) -> None:
    color = f"#{color}" if len(color) == 6 and not color.startswith("#") else color
    draw.line([start, end], fill=color, width=width)
    x2, y2 = end
    x1, y1 = start
    if abs(x2 - x1) >= abs(y2 - y1):
        direction = 1 if x2 > x1 else -1
        points = [(x2, y2), (x2 - direction * 20, y2 - 13), (x2 - direction * 20, y2 + 13)]
    else:
        direction = 1 if y2 > y1 else -1
        points = [(x2, y2), (x2 - 13, y2 - direction * 20), (x2 + 13, y2 - direction * 20)]
    draw.polygon(points, fill=color)


def create_process_diagram(path: Path) -> None:
    image = Image.new("RGB", (1800, 1120), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    title = load_fonts(42, bold=True)
    draw.text((900, 48), "Proceso mejorado de compras, ventas y control", font=title, fill="#17365D", anchor="mm")

    top = [
        ("Proveedor y comprobante", "DDEBF7"),
        ("Registrar compra y percepción", "DDEBF7"),
        ("Validar recepción", "DDEBF7"),
        ("Actualizar inventario y kardex", "E2F0D9"),
    ]
    bottom = [
        ("Seleccionar productos", "FFF2CC"),
        ("Calcular total", "FFF2CC"),
        ("Contado o fiado", "FFF2CC"),
        ("Ticket interno", "FCE4D6"),
        ("Actualizar stock, caja, deuda y cliente", "E2F0D9"),
    ]
    top_boxes = []
    box_w, box_h, gap = 360, 190, 55
    start_x = 80
    for index, (label, fill) in enumerate(top):
        x1 = start_x + index * (box_w + gap)
        box = (x1, 160, x1 + box_w, 350)
        rounded_box(draw, box, label, fill, font_size=28)
        top_boxes.append(box)
        if index:
            previous = top_boxes[index - 1]
            arrow(draw, (previous[2] + 8, 255), (box[0] - 8, 255))

    bottom_boxes = []
    box_w2, box_h2, gap2 = 300, 205, 45
    start_x2 = 70
    for index, (label, fill) in enumerate(bottom):
        x1 = start_x2 + index * (box_w2 + gap2)
        box = (x1, 680, x1 + box_w2, 885)
        rounded_box(draw, box, label, fill, font_size=26)
        bottom_boxes.append(box)
        if index:
            previous = bottom_boxes[index - 1]
            arrow(draw, (previous[2] + 8, 782), (box[0] - 8, 782))

    arrow(draw, ((top_boxes[-1][0] + top_boxes[-1][2]) // 2, top_boxes[-1][3] + 12), ((top_boxes[-1][0] + top_boxes[-1][2]) // 2, 500))
    arrow(draw, ((top_boxes[-1][0] + top_boxes[-1][2]) // 2, 500), ((bottom_boxes[0][0] + bottom_boxes[0][2]) // 2, bottom_boxes[0][1] - 12))
    small = load_fonts(25)
    draw.text((900, 1015), "Toda operación conserva usuario, fecha, documento relacionado y estado", font=small, fill="#404040", anchor="mm")
    image.save(path)


def create_architecture_diagram(path: Path) -> None:
    image = Image.new("RGB", (1800, 1080), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    title = load_fonts(42, bold=True)
    draw.text((900, 48), "Arquitectura funcional de Innova Store", font=title, fill="#17365D", anchor="mm")

    boxes = {
        "users": (80, 220, 410, 410),
        "frontend": (520, 180, 900, 450),
        "backend": (1030, 180, 1410, 450),
        "db": (1450, 610, 1760, 820),
        "reports": (980, 650, 1320, 850),
        "ai": (500, 650, 870, 880),
        "cams": (70, 680, 390, 850),
    }
    rounded_box(draw, boxes["users"], "Propietarios y usuarios", "F2F2F2", font_size=30)
    rounded_box(draw, boxes["frontend"], "Frontend Vue.js, Vuetify, Pinia y Router", "DDEBF7", font_size=29)
    rounded_box(draw, boxes["backend"], "Backend NestJS API REST y Socket.IO", "D9EAD3", font_size=29)
    rounded_box(draw, boxes["db"], "MySQL y Prisma ORM", "E2F0D9", font_size=28)
    rounded_box(draw, boxes["reports"], "PDF, Excel y códigos de barras", "FFF2CC", font_size=27)
    rounded_box(draw, boxes["ai"], "Servicio Python FastAPI y modelos de IA", "FCE4D6", font_size=28)
    rounded_box(draw, boxes["cams"], "Cámaras IP y RTSP", "EDEDED", font_size=28)
    arrow(draw, (410, 315), (520, 315))
    arrow(draw, (900, 315), (1030, 315))
    arrow(draw, (1410, 350), (1580, 610))
    arrow(draw, (1210, 450), (1150, 650))
    arrow(draw, (1030, 390), (870, 720))
    arrow(draw, (390, 765), (500, 765))
    arrow(draw, (870, 800), (1030, 420))
    small = load_fonts(24)
    draw.text((900, 1000), "Los módulos comerciales continúan operando aunque el servicio de video se encuentre temporalmente inactivo", font=small, fill="#404040", anchor="mm")
    image.save(path)


def create_ai_diagram(path: Path) -> None:
    image = Image.new("RGB", (1800, 700), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    title = load_fonts(40, bold=True)
    draw.text((900, 50), "Flujo de generación y revisión de alertas", font=title, fill="#17365D", anchor="mm")
    labels = [
        ("Cámaras RTSP", "EDEDED"),
        ("OpenCV", "DDEBF7"),
        ("YOLOv8", "DDEBF7"),
        ("ByteTrack", "DDEBF7"),
        ("3D CNN", "FCE4D6"),
        ("Alerta Socket.IO", "FFF2CC"),
        ("Revisión humana", "E2F0D9"),
    ]
    box_w, gap = 210, 34
    start_x = 38
    boxes = []
    for index, (label, fill) in enumerate(labels):
        x1 = start_x + index * (box_w + gap)
        box = (x1, 215, x1 + box_w, 430)
        rounded_box(draw, box, label, fill, font_size=25)
        boxes.append(box)
        if index:
            previous = boxes[index - 1]
            arrow(draw, (previous[2] + 6, 322), (box[0] - 6, 322), width=6)
    small = load_fonts(24)
    draw.text((900, 550), "La alerta expresa una probabilidad o nivel de riesgo; no confirma automáticamente un hurto", font=small, fill="#7F0000", anchor="mm")
    image.save(path)


def insert_figure(anchor, image_path: Path, label: str, title: str, width: float = 6.25):
    insert_caption(anchor, label, title)
    paragraph = anchor.insert_paragraph_before()
    paragraph.style = "Normal"
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.keep_together = True
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.add_run().add_picture(str(image_path), width=Inches(width))
    insert_note(anchor)


def format_section_heading(paragraph, text: str) -> None:
    paragraph.text = text
    paragraph.paragraph_format.keep_with_next = True
    paragraph.paragraph_format.line_spacing = 2
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    for run in paragraph.runs:
        set_run_font(run, bold=True)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    process_diagram = ASSET_DIR / "chapter4-process.png"
    architecture_diagram = ASSET_DIR / "chapter4-architecture.png"
    ai_diagram = ASSET_DIR / "chapter4-ai-flow.png"
    create_process_diagram(process_diagram)
    create_architecture_diagram(architecture_diagram)
    create_ai_diagram(ai_diagram)

    shutil.copy2(SOURCE, OUTPUT)
    document = Document(OUTPUT)
    original = list(document.paragraphs)
    if len(original) < 576:
        raise ValueError("La estructura del documento no coincide con la versión esperada.")
    if "CAPITULO IV" not in original[397].text or "CAPITULO V" not in original[475].text:
        raise ValueError("No se localizaron los límites esperados del capítulo IV.")

    chapter_four = original[397]
    proposal_heading = original[402]
    section_41 = original[404]
    section_42 = original[407]
    section_43 = original[410]
    section_44 = original[413]
    section_45 = original[416]
    section_46 = original[419]
    chapter_four_break = original[474]
    chapter_five = original[475]

    for paragraph in original[398:402]:
        remove_paragraph(paragraph)
    remove_paragraph(original[403])
    for paragraph in original[405:407]:
        remove_paragraph(paragraph)
    for paragraph in original[408:410]:
        remove_paragraph(paragraph)
    for paragraph in original[411:413]:
        remove_paragraph(paragraph)
    for paragraph in original[414:416]:
        remove_paragraph(paragraph)
    for paragraph in original[417:419]:
        remove_paragraph(paragraph)
    for paragraph in original[420:474]:
        remove_paragraph(paragraph)

    chapter_four.text = "CAPÍTULO IV"
    chapter_four.paragraph_format.page_break_before = True
    proposal_heading.text = "PROPUESTA TÉCNICA DE LA MEJORA"
    for paragraph in (chapter_four, proposal_heading):
        paragraph.paragraph_format.keep_with_next = True
        for run in paragraph.runs:
            set_run_font(run, bold=True)

    format_section_heading(section_41, "Plan de acción de la mejora propuesta.")
    format_section_heading(section_42, "Consideraciones técnicas, operativas y ambientales para la implementación de la mejora.")
    format_section_heading(section_43, "Recursos técnicos para implementar la mejora propuesta.")
    format_section_heading(section_44, "Diagrama del proceso, mapa del flujo de valor y diagrama de operación de la situación mejorada.")
    format_section_heading(section_45, "Cronograma de ejecución de la mejora.")
    format_section_heading(section_46, "Aspectos limitantes para la implementación de la mejora.")

    insert_body(section_41, "La propuesta consiste en implementar Innova Store como un sistema web integral para centralizar los procesos operativos y administrativos de Minimarket Tienda Perez. El alcance comprende usuarios y permisos, productos, proveedores, compras, comprobantes recibidos, percepciones, inventario, ventas, tickets internos, caja, fiados, clientes frecuentes, promociones, reportes y supervisión mediante cámaras.")
    insert_body(section_41, "La implementación se realizará de forma incremental. Primero se asegurarán los procesos críticos de compras, inventario, ventas, caja y cuentas por cobrar; posteriormente se incorporarán los reportes, los eventos en tiempo real y el componente de videovigilancia. Esta secuencia permite validar cada módulo con los propietarios y reducir el riesgo de trasladar errores de los registros manuales al sistema.")

    insert_body(section_42, "El plan de acción organiza el trabajo desde la confirmación de los requisitos hasta el despliegue y seguimiento. Cada acción produce un resultado verificable que será revisado antes de iniciar la siguiente etapa. Los cambios de alcance deberán registrarse y priorizarse para evitar que funciones complementarias retrasen la puesta en operación de los módulos esenciales.")
    insert_caption(section_42, "Tabla 6", "Plan de acción para la implementación de Innova Store")
    insert_table(document, section_42, ["N.º", "Acción", "Actividades principales", "Responsable", "Resultado verificable"], PLAN_ROWS, [0.35, 1.15, 2.25, 1.25, 1.3], font_size=8.5)
    insert_note(section_42)
    insert_body(section_42, "La aceptación de cada resultado se realizará mediante demostraciones con datos de prueba y casos reales controlados. Se comprobará que una compra aumente el stock, que una venta actualice inventario y caja, que un fiado genere una deuda, que un abono reduzca el saldo y que los reportes coincidan con las operaciones registradas.")

    insert_subheading(section_43, "Consideraciones técnicas")
    insert_body(section_43, "El sistema mantendrá una arquitectura modular. La interfaz desarrollada con Vue.js consumirá la API de NestJS; Prisma ORM administrará el acceso a MySQL y las transacciones; Socket.IO distribuirá eventos en tiempo real; y el procesamiento de video se ejecutará como un servicio independiente en Python. Esta separación permitirá actualizar el componente de inteligencia artificial sin interrumpir las operaciones comerciales.")
    insert_body(section_43, "La integridad de la información se protegerá mediante validaciones y transacciones. La confirmación de una compra deberá registrar el documento recibido y la entrada de inventario; la confirmación de una venta deberá registrar el detalle, el pago o deuda y la salida de stock. Si una parte falla, la operación completa deberá revertirse para evitar saldos inconsistentes.")
    insert_body(section_43, "La seguridad incluirá autenticación, roles, permisos, protección de contraseñas, variables de entorno, control de solicitudes y auditoría de operaciones. Las credenciales de las cámaras y de la base de datos no se expondrán en la interfaz. Los eventos de Socket.IO también deberán validar la identidad y el ámbito autorizado del usuario.")

    insert_subheading(section_43, "Consideraciones operativas")
    insert_body(section_43, "La carga inicial partirá de los productos, proveedores, existencias, deudas y clientes que puedan verificarse. Antes de migrar la información se eliminarán duplicados, se normalizarán unidades y se realizará un conteo físico de referencia. Los cuadernos y documentos originales se conservarán durante el periodo de validación para resolver diferencias.")
    insert_body(section_43, "La interfaz se diseñará considerando que los propietarios son adultos mayores. Se priorizarán botones visibles, textos claros, formularios cortos, búsquedas simples, confirmaciones antes de anular y mensajes que indiquen cómo corregir un dato. La capacitación se organizará por tareas habituales y no por términos técnicos.")
    insert_body(section_43, "El ticket de venta será una constancia interna y deberá indicar expresamente que no es una boleta ni una factura. El sistema registrará los comprobantes emitidos por proveedores y las percepciones asociadas a las compras, pero no realizará emisión de comprobantes tributarios ni reemplazará la orientación contable que pueda requerir el negocio.")

    insert_subheading(section_43, "Consideraciones ambientales")
    insert_body(section_43, "La digitalización reducirá el uso de cuadernos, copias y listados internos; la impresión del ticket se realizará solo cuando resulte necesaria. Los equipos existentes se reutilizarán si cumplen los requisitos, evitando reemplazos prematuros. Los dispositivos que queden fuera de uso deberán entregarse a un gestor autorizado de residuos electrónicos.")
    insert_body(section_43, "El servicio de videovigilancia se configurará con la resolución, frecuencia de fotogramas y cantidad de cámaras necesarias para el objetivo de seguridad. Este ajuste reducirá el consumo de procesamiento, almacenamiento y energía sin eliminar la evidencia indispensable para revisar una alerta.")
    insert_caption(section_43, "Tabla 7", "Matriz de consideraciones para la implementación")
    insert_table(document, section_43, ["Categoría", "Consideración", "Medida prevista"], CONSIDERATION_ROWS, [1.05, 2.35, 3.0], font_size=9)
    insert_note(section_43)

    insert_body(section_44, "Los recursos se han definido de acuerdo con la arquitectura y los módulos previstos. La selección final del equipo de servidor y del procesamiento de video dependerá del número de cámaras, su resolución y la frecuencia requerida. Por ello, las pruebas de rendimiento deberán realizarse antes de adquirir hardware adicional.")
    insert_caption(section_44, "Tabla 8", "Recursos de software")
    insert_table(document, section_44, ["Componente", "Tecnologías", "Finalidad"], SOFTWARE_ROWS, [1.2, 2.65, 2.55], font_size=8.8)
    insert_note(section_44)

    insert_caption(section_44, "Tabla 9", "Recursos de hardware e infraestructura")
    insert_table(document, section_44, ["Recurso", "Requisito referencial", "Uso"], HARDWARE_ROWS, [1.25, 2.75, 2.4], font_size=8.8)
    insert_note(section_44)

    insert_caption(section_44, "Tabla 10", "Recursos humanos y responsabilidades")
    insert_table(document, section_44, ["Participante", "Responsabilidad"], HUMAN_ROWS, [2.0, 4.4], font_size=9.3)
    insert_note(section_44)
    insert_body(section_44, "También se requerirá información validada para configurar el sistema: catálogo de productos y unidades, precios de venta, proveedores, medios de pago, existencias iniciales, deudas, usuarios, permisos y reglas de promociones. Las claves, datos personales e imágenes deberán tratarse únicamente por personal autorizado.")

    insert_body(section_45, "La situación mejorada reemplaza los registros aislados por un flujo integrado. Una compra confirmada actualiza el inventario y conserva los datos del proveedor, pago, comprobante y percepción. Una venta confirmada calcula el total, genera un ticket interno y actualiza el stock, la caja o la cuenta por cobrar. Los datos resultantes quedan disponibles para consultas y reportes sin volver a transcribirlos.")
    insert_figure(section_45, process_diagram, "Figura 4", "Proceso mejorado de compras, ventas y control", width=6.3)
    insert_body(section_45, "El proceso comienza con una sesión autorizada. Para una compra, el usuario selecciona al proveedor, registra productos, cantidades, costos y documento recibido; luego confirma la recepción para generar las entradas de inventario. Para una venta, selecciona los productos, verifica la disponibilidad, confirma el total y registra el pago al contado o el fiado. El sistema aplica los movimientos relacionados dentro de una operación controlada.")
    insert_body(section_45, "Cuando la venta se asocia con un cliente frecuente, el historial se actualiza y permite evaluar promociones o recompensas. Cuando se realiza al crédito, se crea la cuenta por cobrar y cada abono modifica el saldo pendiente. En ambos casos, la consulta posterior muestra el usuario, fecha y operación de origen.")

    insert_caption(section_45, "Tabla 11", "Secuencia de operación de la situación mejorada")
    insert_table(document, section_45, ["N.º", "Actividad", "Control automatizado", "Resultado"], PROCESS_ROWS, [0.4, 2.15, 2.3, 1.55], font_size=8.6)
    insert_note(section_45)

    insert_figure(section_45, architecture_diagram, "Figura 5", "Arquitectura funcional de Innova Store", width=6.3)
    insert_body(section_45, "El frontend concentra la interacción con los usuarios y el backend aplica las reglas de negocio. La base de datos mantiene la información transaccional y el servicio de documentos genera PDF, XLSX y códigos de barras. Socket.IO informa cambios relevantes sin recargar la pantalla. El servicio de inteligencia artificial procesa los flujos autorizados y devuelve eventos al backend.")

    insert_figure(section_45, ai_diagram, "Figura 6", "Flujo de generación y revisión de alertas de seguridad", width=5.8)
    insert_body(section_45, "Las cámaras proporcionan el video mediante RTSP. OpenCV obtiene los fotogramas; YOLOv8 detecta personas u objetos; ByteTrack mantiene la trayectoria; y la red 3D CNN analiza la secuencia temporal. Si el nivel de riesgo supera el umbral configurado, el backend registra el evento y Socket.IO notifica al usuario. La alerta debe ser revisada por una persona y no constituye una confirmación automática de hurto.")

    insert_body(section_46, "El cronograma es referencial y comprende dieciséis semanas. Las etapas se superponen únicamente cuando existen entregables suficientemente estables para continuar. Cada bloque finalizará con una revisión de los propietarios y con pruebas que demuestren el cumplimiento de los criterios acordados.")
    insert_caption(section_46, "Tabla 12", "Cronograma referencial de ejecución en dieciséis semanas")
    insert_table(document, section_46, ["Actividad", "1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14", "15-16"], SCHEDULE_ROWS, [2.3, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51, 0.51], font_size=7.8, schedule=True)
    insert_note(section_46)
    insert_body(section_46, "Al finalizar la semana 4 se espera contar con el diseño validado; al cierre de la semana 10, con los procesos de compras, inventario, ventas y caja integrados; al finalizar la semana 14, con reportes, comunicación en tiempo real y una primera integración del módulo de cámaras; y en la semana 16, con las pruebas, capacitación y despliegue inicial concluidos.")

    insert_body(chapter_four_break, "La implementación presenta limitaciones técnicas, operativas y organizacionales que deben gestionarse desde el inicio. La existencia de una limitación no implica detener el proyecto; requiere definir una medida preventiva, un responsable y una alternativa de continuidad para proteger los procesos esenciales de la tienda.")
    insert_caption(chapter_four_break, "Tabla 13", "Matriz de limitaciones, riesgos y medidas de respuesta")
    insert_table(document, chapter_four_break, ["Limitación o riesgo", "Prob.", "Impacto", "Medida preventiva", "Contingencia"], RISK_ROWS, [1.45, 0.55, 0.55, 2.0, 1.85], font_size=8.0)
    insert_note(chapter_four_break)
    insert_body(chapter_four_break, "La principal estrategia de control será priorizar una versión operativa con compras, inventario, ventas, caja y fiados antes de activar funciones complementarias. La videovigilancia y la inteligencia artificial se incorporarán de manera gradual, con pruebas separadas y sin convertirlas en una dependencia para registrar las operaciones del negocio.")
    insert_body(chapter_four_break, "La aceptación final se sustentará en evidencias: operaciones registradas sin pérdida de información, saldos coherentes, permisos aplicados, tickets y reportes legibles, respaldos recuperables y usuarios capaces de completar las tareas habituales. Las observaciones posteriores al despliegue se registrarán para programar ajustes y mantenimiento.")

    chapter_five.paragraph_format.page_break_before = False
    settings = document.settings._element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    document.core_properties.subject = "Capítulo IV adaptado al sistema de gestión Innova Store"
    document.save(OUTPUT)

    check = Document(OUTPUT)
    texts = [p.text for p in check.paragraphs]
    required = [
        "PROPUESTA TÉCNICA DE LA MEJORA",
        "Plan de acción de la mejora propuesta.",
        "Innova Store",
        "Socket.IO",
        "YOLOv8",
        "Cronograma referencial de ejecución en dieciséis semanas",
        "Matriz de limitaciones, riesgos y medidas de respuesta",
    ]
    for value in required:
        if not any(value in text for text in texts):
            raise ValueError(f"Falta contenido requerido: {value}")
    forbidden = ["PARA PROYECTOS DE INNOVACIÓN", "PARA PROYECTOS DE CREATIVIDAD", "(8 - 15 páginas)"]
    for value in forbidden:
        if any(value in text for text in texts):
            raise ValueError(f"Permaneció texto de plantilla: {value}")
    if len(check.tables) != 13:
        raise ValueError(f"Se esperaban 13 tablas en total y se encontraron {len(check.tables)}")
    if len(check.inline_shapes) < 3:
        raise ValueError("No se insertaron las tres figuras del capítulo IV.")

    print(f"Documento guardado: {OUTPUT}")
    print(f"Párrafos: {len(check.paragraphs)}")
    print(f"Tablas: {len(check.tables)}")
    print(f"Figuras en línea: {len(check.inline_shapes)}")


if __name__ == "__main__":
    main()
