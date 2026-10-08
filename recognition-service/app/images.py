from io import BytesIO
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError


class InvalidImage(ValueError):
    pass


def decode_image(data: bytes, max_bytes: int, max_pixels: int) -> Image.Image:
    if not data or len(data) > max_bytes:
        raise InvalidImage("La imagen debe contener datos y pesar como máximo 8 MiB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as original:
                if original.format not in {"JPEG", "PNG", "WEBP"}:
                    raise InvalidImage("Solo se aceptan imágenes JPEG, PNG o WebP.")
                if original.width * original.height > max_pixels:
                    raise InvalidImage("La imagen supera el máximo de 16 millones de píxeles.")
                if getattr(original, "n_frames", 1) != 1:
                    raise InvalidImage("Utiliza una fotografía estática, sin animación.")
                original.load()
                return ImageOps.exif_transpose(original).convert("RGB")
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise InvalidImage("No se pudo leer una imagen válida.") from exc
