FROM python:3.12-slim
WORKDIR /service
COPY requirements*.txt ./
RUN pip install --no-cache-dir "torch>=2.6.0,<3.0" --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt
COPY app ./app
ENV RECOGNITION_STORAGE_DIR=/data RECOGNITION_DEVICE=cpu
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
