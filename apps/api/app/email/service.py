import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import structlog
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

log = structlog.get_logger()

_template_dir = Path(__file__).parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_template_dir)), autoescape=True)


def _render(template_name: str, ctx: dict) -> str:
    return _env.get_template(template_name).render(**ctx)


def _send(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as server:
            server.sendmail(settings.email_from, to, msg.as_string())
        log.info("email_sent", to=to, subject=subject)
    except Exception as exc:
        log.warning("email_failed", to=to, subject=subject, error=str(exc))


def send_welcome(to: str, first_name: str) -> None:
    html = _render("welcome.html", {"first_name": first_name, "app_url": settings.app_url})
    _send(to, "Welcome to Learnly!", html)


def send_enrollment_confirmation(to: str, first_name: str, course_title: str, course_id: str) -> None:
    learn_url = f"{settings.app_url}/learn/{course_id}"
    html = _render(
        "enrollment_confirmation.html",
        {"first_name": first_name, "course_title": course_title, "learn_url": learn_url},
    )
    _send(to, f"You're enrolled in {course_title}", html)
