from dataclasses import dataclass
import os
from pathlib import Path
import re


DEFAULT_MODEL = "google/siglip2-base-patch16-224"
DEFAULT_REVISION = "75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2"


@dataclass(frozen=True)
class Settings:
    storage_dir: Path = Path("storage")
    model_id: str = DEFAULT_MODEL
    model_revision: str = DEFAULT_REVISION
    device: str = "cpu"
    max_upload_bytes: int = 8 * 1024 * 1024
    max_image_pixels: int = 16_000_000

    @property
    def model_version(self) -> str:
        return f"{self.model_id}@{self.model_revision}:rgb-exif-v1"

    @classmethod
    def from_env(cls) -> "Settings":
        revision = os.getenv("RECOGNITION_MODEL_REVISION", DEFAULT_REVISION)
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError("RECOGNITION_MODEL_REVISION debe ser un commit SHA de 40 caracteres; no usar main.")
        return cls(
            storage_dir=Path(os.getenv("RECOGNITION_STORAGE_DIR", "storage")).resolve(),
            model_id=os.getenv("RECOGNITION_MODEL_ID", DEFAULT_MODEL),
            model_revision=revision,
            device=os.getenv("RECOGNITION_DEVICE", "cpu"),
        )
