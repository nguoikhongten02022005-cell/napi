docker stop napi
docker rm napi
docker build -t napi .
docker run -d --name napi -p 20000:20000 --env-file .env -v napi-data:/app/data napi