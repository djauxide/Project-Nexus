FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8082
ENV EMBER_HOST=192.168.1.100
ENV EMBER_PORT=9000
ENV HTTP_PORT=8082
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8082"]
