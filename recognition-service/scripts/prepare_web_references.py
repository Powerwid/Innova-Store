"""Descarga candidatos de búsquedas revisables; no modifica MySQL ni FAISS."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from threading import Lock

from PIL import Image, ImageOps
import requests

MAX_BYTES = 8 * 1024 * 1024
FORMATS = {
    "JPEG": ("jpg", "image/jpeg"),
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
}
EXCLUDED_HOSTS = re.compile(
    r"shutterstock|depositphotos|alamy|istock|dreamstime|freepik|"
    r"gettyimages|stock\.adobe|123rf",
    re.I,
)


def image_hash(image: Image.Image) -> str:
    image = ImageOps.exif_transpose(image).convert("L").resize((9, 8))
    pixels = list(
        image.get_flattened_data()
        if hasattr(image, "get_flattened_data")
        else image.getdata()
    )
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | int(
                pixels[row * 9 + col] > pixels[row * 9 + col + 1]
            )
    return f"{bits:016x}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--target", type=int, default=10)
    parser.add_argument("--ids", type=int, nargs="*")
    args = parser.parse_args()
    directory = args.directory.resolve()
    products = json.loads(
        (directory / "productos.json").read_text(encoding="utf-8")
    )
    if args.ids:
        products = [
            product
            for product in products
            if product["idProducto"] in args.ids
        ]
    candidates: dict[int, list[dict]] = {}
    # Las búsquedas más recientes suelen reemplazar candidatos descartados.
    for file in sorted(
        (directory / "candidatos").glob("*.json"), reverse=True
    ):
        data = json.loads(file.read_text(encoding="utf-8"))
        candidates.setdefault(data["idProducto"], []).extend(
            data["candidates"]
        )
    lock = Lock()
    used_hashes: dict[str, int] = {}
    for file in (directory / "productos").glob("*.json"):
        record = json.loads(file.read_text(encoding="utf-8"))
        for image in record.get("images", []) + record.get(
            "excludedImages", []
        ):
            used_hashes[image["sha256"]] = int(file.stem)

    def prepare(product: dict) -> dict:
        product_id = product["idProducto"]
        manifest_file = directory / "productos" / f"{product_id:03d}.json"
        manifest_file.parent.mkdir(parents=True, exist_ok=True)
        existing = (
            json.loads(manifest_file.read_text(encoding="utf-8"))
            if manifest_file.exists()
            else {}
        )
        images = existing.get("images", [])
        rejected = existing.get("rejected", [])
        urls = {image["imageUrl"] for image in images} | {
            item["imageUrl"] for item in rejected
        }
        for candidate in candidates.get(product_id, []):
            if len(images) >= args.target:
                break
            url = candidate["imageUrl"]
            if url in urls or EXCLUDED_HOSTS.search(url):
                continue
            urls.add(url)
            try:
                with requests.get(
                    url,
                    headers={
                        "User-Agent": "InnovaStoreReferenceImporter/1.0",
                        "Accept": "image/jpeg,image/png,image/webp",
                    },
                    stream=True,
                    timeout=(5, 12),
                ) as response:
                    response.raise_for_status()
                    data = bytearray()
                    for chunk in response.iter_content(65536):
                        data.extend(chunk)
                        if len(data) > MAX_BYTES:
                            raise ValueError("Supera 8 MiB")
                digest = sha256(data).hexdigest()
                with Image.open(BytesIO(data)) as image:
                    if (
                        image.format not in FORMATS
                        or getattr(image, "n_frames", 1) != 1
                    ):
                        raise ValueError("Formato no compatible")
                    if (
                        min(image.size) < 160
                        or image.width * image.height > 16_000_000
                    ):
                        raise ValueError("Resolución no adecuada")
                    image.load()
                    photo_hash = image_hash(image)
                    extension, mime_type = FORMATS[image.format]
                    dimensions = image.size
                reviewed_images = images + existing.get("excludedImages", [])
                if any(
                    (int(photo_hash, 16) ^ int(other["dhash"], 16)).bit_count()
                    <= 3
                    for other in reviewed_images
                ):
                    raise ValueError("Foto duplicada o casi idéntica")
                with lock:
                    if digest in used_hashes:
                        raise ValueError("Archivo repetido en este conjunto")
                    used_hashes[digest] = product_id
                relative = (
                    Path("imagenes")
                    / f"{product_id:03d}"
                    / f"{digest}.{extension}"
                )
                destination = (directory / relative).resolve()
                if not destination.is_relative_to(directory):
                    raise ValueError("Ruta inválida")
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
                images.append(
                    {
                        **candidate,
                        "file": relative.as_posix(),
                        "mimeType": mime_type,
                        "sha256": digest,
                        "dhash": photo_hash,
                        "width": dimensions[0],
                        "height": dimensions[1],
                        "reviewStatus": "pending",
                    }
                )
            except (requests.RequestException, OSError, ValueError) as error:
                rejected.append({"imageUrl": url, "reason": str(error)[:200]})
            snapshot = {
                **existing,
                "idProducto": product_id,
                "nombre": product["nombre"],
                "createdAt": product["createdAt"],
                "estado": product["estado"],
                "images": images,
                "rejected": rejected,
            }
            manifest_file.write_text(
                json.dumps(snapshot, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        snapshot = {
            **existing,
            "idProducto": product_id,
            "nombre": product["nombre"],
            "createdAt": product["createdAt"],
            "estado": product["estado"],
            "images": images,
            "rejected": rejected,
        }
        manifest_file.write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return {
            "id": product_id,
            "nombre": product["nombre"],
            "fotos": len(images),
            "faltan": max(0, args.target - len(images)),
        }

    summary = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        for future in as_completed(
            [executor.submit(prepare, product) for product in products]
        ):
            item = future.result()
            summary.append(item)
            print(json.dumps(item), flush=True)
    summary.sort(key=lambda item: item["id"])
    (directory / "resumen-descarga.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
