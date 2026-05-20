FROM python:3.13-slim AS builder

WORKDIR /build
COPY pyproject.toml ./
RUN python -m venv /venv && \
    /venv/bin/pip install --upgrade pip --quiet && \
    /venv/bin/pip install --no-cache-dir . --quiet

FROM python:3.13-slim AS runner

COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

RUN useradd --create-home --no-log-init app
WORKDIR /home/app
COPY . .

USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
