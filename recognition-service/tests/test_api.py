from io import BytesIO

from fastapi.testclient import TestClient
import numpy as np
from PIL import Image
import pytest

from app.config import Settings
from app.encoder import EncoderUnavailable
from app.main import create_app


class TestImageEncoder:
    """Vectores deterministas exclusivamente para probar transporte y persistencia."""
    __test__ = False
    version = "test-only-encoder-v1"

    def __init__(self):
        self.calls = 0

    @property
    def loaded(self):
        return self.calls > 0

    def encode(self, image):
        self.calls += 1
        return np.asarray(image, dtype=np.float32).mean(axis=(0, 1)) + 1


def image_file(color=(255, 0, 0), format="PNG"):
    stream = BytesIO()
    Image.new("RGB", (16, 12), color).save(stream, format=format)
    return ("photo.png", stream.getvalue(), "image/png")


@pytest.fixture
def setup(tmp_path):
    settings = Settings(storage_dir=tmp_path)
    encoder = TestImageEncoder()
    with TestClient(create_app(settings, encoder)) as client:
        yield client, encoder


def test_health_is_lazy_without_credentials(setup):
    client, encoder = setup
    assert client.get("/health").json() == {
        "status": "ok", "modelVersion": encoder.version, "referenceCount": 0, "modelLoaded": False}
    assert encoder.calls == 0


def test_api_contract_reference_search_delete(setup):
    client, _ = setup
    for reference_id, product_id, color in [(1, 10, (255, 0, 0)), (2, 20, (0, 255, 0))]:
        response = client.put(f"/references/{reference_id}", files={"file": image_file(color)}, data={"idProducto": product_id})
        assert response.status_code == 200
        assert response.json()["idReferencia"] == reference_id
        assert response.json()["dimension"] == 3
    response = client.post("/search", files={"file": image_file()}, data={"allowedReferenceIds": "[2]", "limit": 5})
    assert response.status_code == 200
    assert response.json()["matches"][0]["idProducto"] == 20
    assert client.delete("/references/2").status_code == 204
    assert client.delete("/references/2").status_code == 204
    assert client.get("/health").json()["referenceCount"] == 1


def test_empty_allowed_catalog_does_not_load_model(setup):
    client, encoder = setup
    response = client.post("/search", files={"file": image_file()}, data={"allowedReferenceIds": "[]"})
    assert response.json()["matches"] == []
    assert encoder.calls == 0


@pytest.mark.parametrize("ids", ["invalid", "{}", "[true]", "[-1]", "[1.5]", '["1"]'])
def test_bad_allowed_ids_rejected(setup, ids):
    client, encoder = setup
    response = client.post("/search", files={"file": image_file()}, data={"allowedReferenceIds": ids})
    assert response.status_code == 422
    assert encoder.calls == 0


def test_invalid_image_and_payload_limit(setup):
    client, encoder = setup
    for data in [b"", b"this is not an image"]:
        response = client.put("/references/1", files={"file": ("fake.jpg", data, "image/jpeg")}, data={"idProducto": 2})
        assert response.status_code == 422
    response = client.put("/references/1", files={"file": ("big.jpg", b"x" * (8 * 1024 * 1024 + 1))}, data={"idProducto": 2})
    assert response.status_code == 413
    response = client.put("/references/1", files={"file": image_file()}, data={"idProducto": 2},
                          headers={"Content-Length": str(10 * 1024 * 1024)})
    assert response.status_code == 413
    assert encoder.calls == 0


def test_encoder_failure_returns_503_without_registering(tmp_path):
    class BrokenEncoder(TestImageEncoder):
        def encode(self, image):
            raise EncoderUnavailable("unavailable")

    with TestClient(create_app(Settings(storage_dir=tmp_path), BrokenEncoder())) as client:
        assert client.put("/references/1", files={"file": image_file()}, data={"idProducto": 2}).status_code == 503
        assert client.get("/health").json()["referenceCount"] == 0


def test_api_accepts_backend_connections_over_local_network(tmp_path):
    application = create_app(Settings(storage_dir=tmp_path), TestImageEncoder())
    with TestClient(application, client=("127.0.0.1", 1234)) as client:
        assert client.get("/health").status_code == 200
    with TestClient(application, client=("192.168.1.5", 1234)) as client:
        assert client.get("/health").status_code == 200
        assert client.put("/references/1", files={"file": image_file()}, data={"idProducto": 2}).status_code == 200
        assert client.post("/search", files={"file": image_file()}, data={"allowedReferenceIds": "[1]"}).status_code == 200
        assert client.delete("/references/1").status_code == 204
