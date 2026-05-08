import structlog

log = structlog.get_logger()


async def encode_video(ctx: dict, lesson_id: str, key: str) -> None:
    log.info("video_encoding_job_received", lesson_id=lesson_id, key=key)
    # Phase 1: mock encoder — real FFmpeg/Cloudflare Stream in Phase 4
    log.info("video_encoding_complete", lesson_id=lesson_id, key=key)
