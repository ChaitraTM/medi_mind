import pytest
from fastapi.testclient import TestClient
from server import app, users
import asyncio
from auth import get_password_hash

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    async def _clean():
        await users.delete_many({"username": {"$ne": "admin"}})
    asyncio.run(_clean())

def test_register_privilege_escalation():
    # Attempt to register as ADMINISTRATOR
    payload = {
        "username": "hacker",
        "password": "password",
        "role": "ADMINISTRATOR"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    
    # Login to verify the assigned role
    login_payload = {"username": "hacker", "password": "password"}
    login_resp = client.post("/api/auth/login", data=login_payload)
    token = login_resp.json()["access_token"]
    
    # Fetch /auth/me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.json()["role"] == "USER"

def test_unauthorized_access():
    response = client.get("/api/analytics")
    assert response.status_code == 401

def test_user_cannot_access_analytics():
    # Register and login a normal user
    client.post("/api/auth/register", json={"username": "user1", "password": "pw"})
    token = client.post("/api/auth/login", data={"username": "user1", "password": "pw"}).json()["access_token"]
    
    # Try accessing analytics
    response = client.get("/api/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_admin_can_access_analytics():
    # Create an admin user manually in the database
    async def create_admin():
        hashed_pw = get_password_hash("adminpass")
        await users.insert_one({
            "id": "admin_id",
            "username": "admin_user",
            "hashed_password": hashed_pw,
            "role": "ADMINISTRATOR",
            "created_at": "2026-09-19"
        })
    asyncio.run(create_admin())
    
    token = client.post("/api/auth/login", data={"username": "admin_user", "password": "adminpass"}).json()["access_token"]
    response = client.get("/api/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
