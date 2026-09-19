import pytest
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from datetime import timedelta
import jwt

def test_password_hashing():
    password = "secure_password123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) == True
    assert verify_password("wrong_password", hashed) == False

def test_create_access_token():
    data = {"sub": "testuser", "role": "USER"}
    token = create_access_token(data)
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0

def test_expired_token():
    # Create an explicitly expired token
    data = {"sub": "testuser", "role": "USER"}
    token = create_access_token(data, expires_delta=timedelta(minutes=-10))
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def test_invalid_signature():
    # Create a token with a different secret
    data = {"sub": "testuser", "role": "USER"}
    token = jwt.encode(data, "wrong_secret", algorithm=ALGORITHM)
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

# The following endpoints in server.py are missing authentication and are vulnerable to direct access:
# - /documents/upload
# - /imaging/chest-xray
# - /imaging/skin-lesion
# - /imaging/brain-tumor
# - /voice/transcribe
#
# Also, /auth/register accepts a 'role' parameter without validation, allowing privilege escalation.
