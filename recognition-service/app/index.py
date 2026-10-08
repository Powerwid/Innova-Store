from dataclasses import dataclass
from pathlib import Path
import sqlite3
from threading import RLock

import faiss
from filelock import FileLock, Timeout
import numpy as np


class IndexVersionMismatch(RuntimeError):
    pass


@dataclass(frozen=True)
class Reference:
    product_id: int
    vector: np.ndarray


def normalized(vector: np.ndarray) -> np.ndarray:
    result = np.asarray(vector, dtype=np.float32).reshape(1, -1).copy()
    if result.shape[1] == 0 or not np.isfinite(result).all() or np.linalg.norm(result) < 1e-12:
        raise ValueError("El encoder debe devolver un vector finito, no vacío y de norma positiva.")
    faiss.normalize_L2(result)
    return result[0]


class ReferenceIndex:
    """SQLite es la copia durable; el índice FAISS se reconstruye desde sus vectores."""

    def __init__(self, directory: Path, model_version: str):
        directory.mkdir(parents=True, exist_ok=True)
        self.model_version = model_version
        self._mutex = RLock()
        self._writer_lock = FileLock(str(directory / "writer.lock"))
        try:
            self._writer_lock.acquire(timeout=0)
        except Timeout as exc:
            raise RuntimeError("Ya existe un escritor para este almacenamiento. Ejecuta uvicorn con --workers 1.") from exc
        self._db = None
        self._references: dict[int, Reference] = {}
        self._index = None
        self.dimension = None
        try:
            self._db = sqlite3.connect(directory / "references.sqlite3", check_same_thread=False)
            self._db.execute("PRAGMA journal_mode=WAL")
            self._db.execute("PRAGMA synchronous=FULL")
            self._db.execute("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
            self._db.execute("""CREATE TABLE IF NOT EXISTS references_visual (
                id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL,
                dimension INTEGER NOT NULL, vector BLOB NOT NULL,
                image BLOB NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""")
            version = self._db.execute("SELECT value FROM metadata WHERE key='model_version'").fetchone()
            if version and version[0] != model_version:
                raise IndexVersionMismatch(
                    "La versión del encoder cambió. Usa un RECOGNITION_STORAGE_DIR nuevo y reindexa "
                    "las fotos desde NestJS; conserva el almacenamiento anterior como respaldo."
                )
            self._db.execute("INSERT OR IGNORE INTO metadata(key,value) VALUES ('model_version',?)", (model_version,))
            self._db.commit()
            for ref_id, product_id, dimension, blob in self._db.execute("SELECT id,product_id,dimension,vector FROM references_visual"):
                vector = np.frombuffer(blob, dtype="<f4").copy()
                if len(vector) != dimension:
                    raise RuntimeError(f"Vector durable inválido para referencia {ref_id}.")
                self._references[ref_id] = Reference(product_id, normalized(vector))
            self._index, self.dimension = self._build(self._references)
        except Exception:
            self.close()
            raise

    @staticmethod
    def _build(references: dict[int, Reference]):
        if not references:
            return None, None
        ids = sorted(references)
        dimension = len(references[ids[0]].vector)
        if any(len(reference.vector) != dimension for reference in references.values()):
            raise ValueError("Las referencias deben usar la misma dimensión del encoder.")
        index = faiss.IndexIDMap2(faiss.IndexFlatIP(dimension))
        vectors = np.ascontiguousarray([references[ref_id].vector for ref_id in ids], dtype=np.float32)
        index.add_with_ids(vectors, np.asarray(ids, dtype=np.int64))
        return index, dimension

    @property
    def count(self) -> int:
        with self._mutex:
            return len(self._references)

    def has_allowed(self, allowed_ids: set[int]) -> bool:
        with self._mutex:
            return not allowed_ids.isdisjoint(self._references)

    def upsert(self, reference_id: int, product_id: int, vector: np.ndarray, image: bytes) -> int:
        vector = normalized(vector)
        with self._mutex:
            if self.dimension is not None and len(vector) != self.dimension:
                raise ValueError("La dimensión del encoder cambió; utiliza una nueva versión y reindexa.")
            updated = dict(self._references)
            updated[reference_id] = Reference(product_id, vector)
            index, dimension = self._build(updated)
            with self._db:
                self._db.execute("""INSERT INTO references_visual(id,product_id,dimension,vector,image)
                    VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
                    product_id=excluded.product_id,dimension=excluded.dimension,
                    vector=excluded.vector,image=excluded.image,updated_at=CURRENT_TIMESTAMP""",
                    (reference_id, product_id, len(vector), vector.astype("<f4").tobytes(), image))
            self._references, self._index, self.dimension = updated, index, dimension
            return dimension

    def delete(self, reference_id: int) -> None:
        with self._mutex:
            updated = dict(self._references)
            updated.pop(reference_id, None)
            index, dimension = self._build(updated)
            with self._db:
                self._db.execute("DELETE FROM references_visual WHERE id=?", (reference_id,))
            self._references, self._index, self.dimension = updated, index, dimension

    def search(self, vector: np.ndarray, allowed_ids: set[int], limit: int) -> list[dict]:
        query = normalized(vector)
        with self._mutex:
            references = {ref_id: ref for ref_id, ref in self._references.items() if ref_id in allowed_ids}
            if not references:
                return []
            if len(query) != self.dimension:
                raise ValueError("La dimensión de la consulta no coincide con el índice.")
            # Buscar después de filtrar evita que referencias ajenas oculten candidatos autorizados.
            index = self._index if len(references) == len(self._references) else self._build(references)[0]
            scores, ids = index.search(query.reshape(1, -1), len(references))
            matches = []
            products = set()
            for score, ref_id in zip(scores[0], ids[0]):
                if ref_id == -1:
                    continue
                product_id = references[int(ref_id)].product_id
                if product_id in products:
                    continue
                products.add(product_id)
                matches.append({"idReferencia": int(ref_id), "idProducto": product_id,
                                "score": float(np.clip(score, -1.0, 1.0))})
                if len(matches) == limit:
                    break
            return matches

    def close(self) -> None:
        with self._mutex:
            if self._db is not None:
                self._db.close()
                self._db = None
            self._writer_lock.release()
