from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    # App
    node_env: str = "development"
    app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth (Clerk)
    clerk_secret_key: str
    clerk_webhook_secret: str

    # Object Storage
    s3_endpoint: str = "http://localhost:9000"
    s3_region: str = "us-east-1"
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str = "learnly-media"
    s3_public_url: str = "http://localhost:9000/learnly-media"

    # Search
    meili_url: str = "http://localhost:7700"
    meili_master_key: str

    # Email
    email_provider: str = "mailhog"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    email_from: str = "noreply@learnly.dev"
    resend_api_key: str = ""

    # Payments
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_connect_client_id: str = ""

    # Video
    video_provider: str = "local"
    cf_stream_account_id: str = ""
    cf_stream_api_token: str = ""

    # Monitoring
    sentry_dsn_backend: str | None = None

    # Analytics
    posthog_key: str | None = None

    # Feature flags
    feature_live_sessions: bool = False
    feature_affiliate: bool = False


settings = Settings()
