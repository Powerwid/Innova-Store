from io import BytesIO

from PIL import Image
import pytest

from app.images import InvalidImage, decode_image


def test_applies_exif_orientation():
    stream = BytesIO()
    image = Image.new("RGB", (20, 10))
    exif = Image.Exif()
    exif[274] = 6
    image.save(stream, format="JPEG", exif=exif)
    decoded = decode_image(stream.getvalue(), 1024 * 1024, 1000)
    assert decoded.size == (10, 20)
    assert decoded.mode == "RGB"


def test_pixel_limit_and_non_supported_format():
    for image_format, pixels in [("PNG", 99), ("GIF", 1000)]:
        stream = BytesIO()
        Image.new("RGB", (10, 10)).save(stream, format=image_format)
        with pytest.raises(InvalidImage):
            decode_image(stream.getvalue(), 1024 * 1024, pixels)
