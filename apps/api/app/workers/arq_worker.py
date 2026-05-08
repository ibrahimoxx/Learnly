from arq.connections import RedisSettings

from app.core.config import settings
from app.workers.tasks import encode_video


class WorkerSettings:
    functions = [encode_video]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 3600
