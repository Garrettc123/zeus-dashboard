FROM python:3.12-slim
WORKDIR /app
COPY contract/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY contract/ ./contract/
EXPOSE 8080
CMD ["uvicorn", "contract.app:app", "--host", "0.0.0.0", "--port", "8080"]
