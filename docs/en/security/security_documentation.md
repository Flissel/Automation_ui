# Security Documentation - Trusted Login System
> Migration notice: This documentation is being migrated to English-only. Some sections may temporarily contain German text. If you find any issues, please open an issue or PR.

## Overview
This section outlines the core cryptographic utilities used by the Trusted Login System, including symmetric encryption (Fernet), file encryption/decryption, and password hashing/verification.

### Encryption utilities example
```python
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os
import base64

logger = logging.getLogger(__name__)

class EncryptionService:
    """
    Central encryption service
    """

    def __init__(self, master_key: str):
        self.master_key = master_key.encode()
        self.fernet = self._create_fernet_key()

    def _create_fernet_key(self) -> Fernet:
        """
        Generates a Fernet key from the master key
        """
        salt = b'trusted_login_salt'  # In production: random salt per installation
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        return Fernet(key)

    def encrypt_sensitive_data(self, data: str) -> str:
        """
        Encrypts sensitive data (passwords, API keys, etc.)
        """
        if not data:
            return data

        encrypted_data = self.fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()

    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """
        Decrypts sensitive data
        """
        if not encrypted_data:
            return encrypted_data

        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise ValueError("Failed to decrypt data")

    def encrypt_file(self, file_path: str, output_path: str = None) -> str:
        """
        Encrypts a file
        """
        if not output_path:
            output_path = f"{file_path}.encrypted"

        with open(file_path, 'rb') as file:
            file_data = file.read()

        encrypted_data = self.fernet.encrypt(file_data)

        with open(output_path, 'wb') as encrypted_file:
            encrypted_file.write(encrypted_data)

        return output_path

    def decrypt_file(self, encrypted_file_path: str, output_path: str = None) -> str:
        """
        Decrypts a file
        """
        if not output_path:
            output_path = encrypted_file_path.replace('.encrypted', '')

        with open(encrypted_file_path, 'rb') as encrypted_file:
            encrypted_data = encrypted_file.read()

        decrypted_data = self.fernet.decrypt(encrypted_data)

        with open(output_path, 'wb') as file:
            file.write(decrypted_data)

        return output_path

    def hash_password(self, password: str, salt: bytes = None) -> tuple:
        """
        Creates a secure password hash
        """
        if salt is None:
            salt = os.urandom(32)

        # PBKDF2 with SHA-256
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )

        password_hash = kdf.derive(password.encode())

        return base64.urlsafe_b64encode(password_hash).decode(), base64.urlsafe_b64encode(salt).decode()

    def verify_password(self, password: str, stored_hash: str, stored_salt: str) -> bool:
        """
        Verifies a password against the stored hash
        """
        try:
            salt = base64.urlsafe_b64decode(stored_salt.encode())
            expected_hash = base64.urlsafe_b64decode(stored_hash.encode())

            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )

            kdf.verify(password.encode(), expected_hash)
            return True
        except Exception:
            return False