from contextlib import asynccontextmanager
import json
import logging
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Path, Request, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from app.config import Settings
from app.encoder import EncoderUnavailable, ImageEncoder, SiglipEncoder
from app.images import InvalidImage, decode_image
from app.index import ReferenceIndex


logger = logging.getLogger("recognition")
SAFE_INTEGER = 2**53 - 1


def create_app(settings: Settings | None = None, encoder: ImageEncoder | None = None) -> FastAPI:
    config = settings or Settings.from_env()
    image_encoder = encoder or SiglipEncoder(config)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        index = ReferenceIndex(config.storage_dir, image_encoder.version)
        application.state.index = index
        try:
            yield
        finally:
            index.close()

    application = FastAPI(title="Innova Store · Reconocimiento visual", version="1.0.0",
                          lifespan=lifespan)

    @application.middleware("http")
    async def bound_body(request: Request, call_next):
        if request.method in {"PUT", "POST"}:
            maximum = config.max_upload_bytes + 1024 * 1024  # Campos y envoltura multipart.
            header = request.headers.get("content-length")
            if header:
                try:
                    if int(header) > maximum:
                        return Response("La solicitud supera el tamaño permitido.", status_code=413)
                except ValueError:
                    return Response("Content-Length inválido.", status_code=400)
            # Limita también transferencias chunked antes de que el parser cree archivos temporales.
            chunks = []
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > maximum:
                    return Response("La solicitud supera el tamaño permitido.", status_code=413)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        return await call_next(request)

    async def photo(file: UploadFile):
        try:
            data = await file.read(config.max_upload_bytes + 1)
            if len(data) > config.max_upload_bytes:
                raise HTTPException(413, "La imagen supera el máximo de 8 MiB.")
            image = await run_in_threadpool(decode_image, data, config.max_upload_bytes, config.max_image_pixels)
            return data, image
        except InvalidImage as exc:
            raise HTTPException(422, str(exc)) from exc
        finally:
            await file.close()

    async def encode(image):
        try:
            return await run_in_threadpool(image_encoder.encode, image)
        except EncoderUnavailable as exc:
            logger.exception("Error del encoder SigLIP2")
            raise HTTPException(503, str(exc)) from exc

    @application.get("/health")
    async def health(request: Request):
        return {"status": "ok", "modelVersion": image_encoder.version,
                "referenceCount": request.app.state.index.count, "modelLoaded": image_encoder.loaded}

    @application.put("/references/{idReferencia}")
    async def upsert_reference(request: Request,
                               idReferencia: Annotated[int, Path(gt=0, le=SAFE_INTEGER)],
                               file: Annotated[UploadFile, File()],
                               idProducto: Annotated[int, Form(gt=0, le=SAFE_INTEGER)]):
        data, image = await photo(file)
        vector = await encode(image)
        try:
            dimension = await run_in_threadpool(request.app.state.index.upsert, idReferencia, idProducto, vector, data)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc
        return {"idReferencia": idReferencia, "idProducto": idProducto,
                "modelVersion": image_encoder.version, "dimension": dimension}

    @application.delete("/references/{idReferencia}", status_code=204)
    async def delete_reference(request: Request, idReferencia: Annotated[int, Path(gt=0, le=SAFE_INTEGER)]):
        await run_in_threadpool(request.app.state.index.delete, idReferencia)
        return Response(status_code=204)

    @application.post("/search")
    async def search(request: Request, file: Annotated[UploadFile, File()],
                     allowedReferenceIds: Annotated[str, Form()],
                     limit: Annotated[int, Form(ge=1, le=50)] = 20):
        try:
            ids = json.loads(allowedReferenceIds)
            if not isinstance(ids, list) or len(ids) > 100_000 or any(
                    type(value) is not int or not 0 < value <= SAFE_INTEGER for value in ids):
                raise ValueError()
        except (ValueError, TypeError):
            raise HTTPException(422, "allowedReferenceIds debe ser un arreglo JSON de IDs enteros positivos (máximo 100000).")
        _, image = await photo(file)
        allowed = set(ids)
        if not request.app.state.index.has_allowed(allowed):
            return {"modelVersion": image_encoder.version, "matches": []}
        vector = await encode(image)
        try:
            matches = await run_in_threadpool(request.app.state.index.search, vector, allowed, limit)
        except ValueError as exc:
            raise HTTPException(409, str(exc)) from exc
        return {"modelVersion": image_encoder.version, "matches": matches}

    return application


app = create_app()
