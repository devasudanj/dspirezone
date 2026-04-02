from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dspirezone.db"
    SECRET_KEY: str = "dev-secret-key-CHANGE-IN-PRODUCTION-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENVIRONMENT: str = "development"
    EMAIL_ENABLED: bool = False
    # OAuth2 / Microsoft Graph mail (preferred — works with Security Defaults ON)
    GRAPH_TENANT_ID: Optional[str] = None
    GRAPH_CLIENT_ID: Optional[str] = None
    GRAPH_CLIENT_SECRET: Optional[str] = None
    GRAPH_SENDER_EMAIL: Optional[str] = None  # UPN of the mailbox to send from
    # Legacy SMTP (fallback — only used when GRAPH_TENANT_ID is not set)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "DspireZone"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    ORDER_CONFIRMATION_ADMIN_EMAIL: str = "admin@dspirezone.com"
    SITE_BASE_URL: str = "https://dspirezone-app-dev.azurewebsites.net"
    # Cal.com integration
    CAL_API_KEY: Optional[str] = None
    CAL_BASE_URL: str = "https://cal.com/dspirezone/dspirebooking"
    CAL_EVENT_SLUG: str = "dspirebooking"  # Fallback slug if not parseable from CAL_BASE_URL
    CAL_EVENT_TYPE_ID: Optional[int] = None  # Set this to skip slug lookup entirely

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
