FROM node:22-alpine AS node-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/widget/package.json packages/widget/package.json

RUN npm ci

FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY --from=node-deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM python:3.14-slim AS backend

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_DEBUG=false

COPY apps/backend/requirements.txt apps/backend/requirements.txt
RUN pip install --no-cache-dir -r apps/backend/requirements.txt

COPY apps/backend apps/backend
COPY --from=frontend-builder /app/apps/frontend/dist apps/frontend/dist
COPY --from=frontend-builder /app/packages/widget/dist packages/widget/dist

EXPOSE 8000

CMD ["python", "apps/backend/manage.py", "runserver", "0.0.0.0:8000"]
