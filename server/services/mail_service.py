from fastapi import BackgroundTasks
from fastapi_mail.errors import ConnectionErrors
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pathlib import Path
import os
import logging
from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = SERVER_DIR.parent
load_dotenv(SERVER_DIR / ".env")
load_dotenv(PROJECT_DIR / "infra" / ".env")

TEMPLATE_FOLDER = SERVER_DIR / "templates" / "email"
logger = logging.getLogger(__name__)


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Envs:
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "CloudGuard")
    MAIL_STARTTLS = _bool_env("MAIL_STARTTLS", True)
    MAIL_SSL_TLS = _bool_env("MAIL_SSL_TLS", False)
    MAIL_SUPPRESS_SEND = _bool_env("MAIL_SUPPRESS_SEND", False)
    SUPPORT_URL = os.getenv("SUPPORT_URL", "")
    PRIVACY_URL = os.getenv("PRIVACY_URL", "")


conf = ConnectionConfig(
    MAIL_USERNAME=Envs.MAIL_USERNAME,
    MAIL_PASSWORD=Envs.MAIL_PASSWORD,
    MAIL_FROM=Envs.MAIL_FROM,
    MAIL_PORT=Envs.MAIL_PORT,
    MAIL_SERVER=Envs.MAIL_SERVER,          
    MAIL_FROM_NAME=Envs.MAIL_FROM_NAME,
    MAIL_STARTTLS=Envs.MAIL_STARTTLS,
    MAIL_SSL_TLS=Envs.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=str(TEMPLATE_FOLDER),
)

async def _send_message(message: MessageSchema, template_name: str) -> None:
    if Envs.MAIL_SUPPRESS_SEND:
        logger.info("Email sending suppressed: subject=%r recipient=%s", message.subject, message.recipients)
        return

    try:
        fm = FastMail(conf)
        await fm.send_message(message, template_name=template_name)
    except ConnectionErrors as exc:
        if Envs.MAIL_SERVER == "smtp.gmail.com":
            logger.error(
                "Gmail SMTP rejected the login. Set MAIL_PASSWORD to a Google App Password, "
                "not your normal Gmail password. Original error: %s",
                exc,
            )
        raise

async def send_email_async(subject: str, email_to: str, body: dict, template_name: str):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        template_body=body,
        subtype=MessageType.html,
    )
    await _send_message(message, template_name)
    
def send_email_background(background_tasks: BackgroundTasks, subject: str, email_to: str, body: dict,  template_name: str):
    message = MessageSchema(
        subject=subject,
        recipients=[email_to],
        template_body=body,
        subtype=MessageType.html,
    )
    background_tasks.add_task(_send_message, message, template_name)
    
def send_admin_created_account_email(
    background_tasks: BackgroundTasks,
    email_to: str,
    username: str,
    temp_password: str,
    admin_name: str,
    created_at: str,
    roles: list[str],
    login_url: str,
) -> None:
    send_email_background(
        background_tasks=background_tasks,
        subject="Your CloudGuard Account is Ready",
        email_to=email_to,
        body={
            "username": username,
            "email": email_to,
            "temp_password": temp_password,
            "admin_name": admin_name,
            "created_at": created_at,
            "roles": roles,
            "login_url": login_url,
            "support_url": Envs.SUPPORT_URL,
            "privacy_url": Envs.PRIVACY_URL,
            "year": "2025",
        },
        template_name="admin_created_user.html",
    )
    
def send_forgot_password_email(
    background_tasks: BackgroundTasks,
    email_to: str,
    username: str,
    reset_token: str,
    reset_url: str,
    expires_in: str,        
    expires_at: str,       
    requested_at: str,      
    request_ip: str,       
) -> None:
    send_email_background(
        background_tasks=background_tasks,
        subject="Reset Your CloudGuard Password",
        email_to=email_to,
        body={
            "username": username,
            "email": email_to,
            "reset_token": reset_token,
            "reset_url": reset_url,
            "expires_in": expires_in,
            "expires_at": expires_at,
            "requested_at": requested_at,
            "request_ip": request_ip,
            "support_url": Envs.SUPPORT_URL,
            "privacy_url": Envs.PRIVACY_URL,
            "year": "2025",
        },
        template_name="change_password.html",
    )
