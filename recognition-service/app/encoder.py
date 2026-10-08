from threading import RLock
from typing import Protocol

import numpy as np
from PIL import Image

from app.config import Settings


class ImageEncoder(Protocol):
    version: str

    @property
    def loaded(self) -> bool: ...

    def encode(self, image: Image.Image) -> np.ndarray: ...


class EncoderUnavailable(RuntimeError):
    pass


class SiglipEncoder:
    """Carga diferida: health y un catálogo vacío no descargan los pesos."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.version = settings.model_version
        self._model = None
        self._processor = None
        self._lock = RLock()

    @property
    def loaded(self) -> bool:
        return self._model is not None

    def encode(self, image: Image.Image) -> np.ndarray:
        with self._lock:
            try:
                import torch
                from transformers import AutoImageProcessor, AutoModel

                if self._model is None:
                    processor = AutoImageProcessor.from_pretrained(
                        self.settings.model_id, revision=self.settings.model_revision, use_fast=False,
                    )
                    model = AutoModel.from_pretrained(
                        self.settings.model_id, revision=self.settings.model_revision,
                        use_safetensors=True,
                    ).to(self.settings.device).eval()
                    self._processor, self._model = processor, model
                inputs = self._processor(images=[image], return_tensors="pt").to(self.settings.device)
                with torch.inference_mode():
                    features = self._model.get_image_features(**inputs)
                return features.float().cpu().numpy().reshape(-1)
            except Exception as exc:
                raise EncoderUnavailable("No se pudo cargar o ejecutar SigLIP2; revisa dependencias, caché y acceso al modelo.") from exc
