from cryptography.fernet import Fernet
from src.config import settings


def get_key():
    if not settings.ENCRYPTION_KEY:
        # Fallback to a default key for development if not set in environment
        default_key = "peAXC9BBUlmxE9i7UmNpItcR1Bp6O1PvCXpPnhHKsO4="
        print(f"WARNING: Using default encryption key. Set ENCRYPTION_KEY environment variable for production.")
        return default_key.encode()
    return settings.ENCRYPTION_KEY.encode()


def encrypt_data(data: str) -> str:
    f = Fernet(get_key())
    return f.encrypt(data.encode()).decode()


def decrypt_data(token: str) -> str:
    f = Fernet(get_key())
    return f.decrypt(token.encode()).decode()
