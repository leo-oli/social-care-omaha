from cryptography.fernet import Fernet
from src.config import settings


def get_key():
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY not found in environment variables")
    return settings.ENCRYPTION_KEY.encode()


def encrypt_data(data: str) -> str:
    f = Fernet(get_key())
    return f.encrypt(data.encode()).decode()


def decrypt_data(token: str) -> str:
    f = Fernet(get_key())
    return f.decrypt(token.encode()).decode()
