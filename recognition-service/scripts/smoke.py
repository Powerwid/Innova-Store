"""Prueba opcional con encoder real: descarga los pesos la primera vez."""
import argparse
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import Settings
from app.encoder import SiglipEncoder
from app.images import decode_image
from app.index import ReferenceIndex


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path, help="Fotografía JPEG/PNG/WebP para registrar y consultar.")
    args = parser.parse_args()
    settings = Settings.from_env()
    encoder = SiglipEncoder(settings)
    data = args.image.read_bytes()
    image = decode_image(data, settings.max_upload_bytes, settings.max_image_pixels)
    vector = encoder.encode(image)
    with tempfile.TemporaryDirectory(prefix="recognition-smoke-") as directory:
        index = ReferenceIndex(Path(directory), encoder.version)
        try:
            dimension = index.upsert(1, 1, vector, data)
            matches = index.search(encoder.encode(image), {1}, 1)
            assert matches and matches[0]["score"] > 0.999
            print({"modelVersion": encoder.version, "dimension": dimension, "matches": matches})
        finally:
            index.close()


if __name__ == "__main__":
    main()
