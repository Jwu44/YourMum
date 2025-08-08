"""
Encryption utilities for secure token storage
Provides encryption and decryption for sensitive Slack OAuth tokens
"""

import os
import base64
from cryptography.fernet import Fernet


class TokenEncryption:
    """Handles encryption and decryption of OAuth tokens"""
    
    def __init__(self):
        """Initialize with encryption key from environment or generate new one"""
        self.key = self._get_or_create_key()
        self.cipher_suite = Fernet(self.key)
    
    def _get_or_create_key(self) -> bytes:
        """Get encryption key from environment or generate new one"""
        key_env = os.getenv('ENCRYPTION_KEY')
        if key_env:
            try:
                return base64.urlsafe_b64decode(key_env)
            except Exception:
                # If key is invalid, generate new one
                pass
        
        # Generate new key (in production, this should be stored securely)
        return Fernet.generate_key()
    
    def encrypt_token(self, token: str) -> str:
        """
        Encrypt a token for secure storage
        
        Args:
            token: Plain text token to encrypt
            
        Returns:
            Encrypted token as base64 string
        """
        if not token:
            raise ValueError("Token cannot be empty")
        
        encrypted_data = self.cipher_suite.encrypt(token.encode())
        return base64.urlsafe_b64encode(encrypted_data).decode()
    
    def decrypt_token(self, encrypted_token: str) -> str:
        """
        Decrypt a token for use
        
        Args:
            encrypted_token: Base64 encoded encrypted token
            
        Returns:
            Decrypted plain text token
        """
        if not encrypted_token:
            raise ValueError("Encrypted token cannot be empty")
        
        try:
            encrypted_data = base64.urlsafe_b64decode(encrypted_token.encode())
            decrypted_data = self.cipher_suite.decrypt(encrypted_data)
            return decrypted_data.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt token: {str(e)}")


# Global instance for easy access
_encryption_instance = None

def get_encryption_instance() -> TokenEncryption:
    """Get global encryption instance"""
    global _encryption_instance
    if _encryption_instance is None:
        _encryption_instance = TokenEncryption()
    return _encryption_instance

def encrypt_token(token: str) -> str:
    """Convenience function to encrypt a token"""
    return get_encryption_instance().encrypt_token(token)

def decrypt_token(encrypted_token: str) -> str:
    """Convenience function to decrypt a token"""
    return get_encryption_instance().decrypt_token(encrypted_token)