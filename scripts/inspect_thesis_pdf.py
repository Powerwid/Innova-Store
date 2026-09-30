from pathlib import Path

from pypdf import PdfReader


PDF = Path(r"C:\Users\Power\Documents\Proyecto-Empresa\Innova-Store\tmp\Tesis_diagramas_corregidos_QA.pdf")
reader = PdfReader(PDF)
print("pages", len(reader.pages))

keys = [
    "CAPÍTULO III",
    "3.1 Diagrama",
    "3.2 Efectos",
    "3.3 Análisis",
    "3.4 Priorización",
    "CAPÍTULO IV",
    "4.1 Plan",
    "4.2 Consideraciones",
    "4.3 Recursos",
    "4.4 Diagrama",
    "4.5 Control",
    "4.6 Aspectos",
    "CAPITULO V",
    "CAPITULO VI",
    "CAPITULO VII",
    "CAPITULO VIII",
    "REFERENCIAS BIBLIOGRÁFICAS",
    "ANEXOS",
]

texts = [(page.extract_text() or "") for page in reader.pages]
for key in keys:
    hits = [i for i, text in enumerate(texts, 1) if key.casefold() in text.casefold()]
    print(key, hits[:8])

for i in range(37, min(70, len(texts)) + 1):
    line = " | ".join(texts[i - 1].splitlines())
    print(i, line[:220])
