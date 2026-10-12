"""
Integration tests against a real Postgres instance (see conftest.py).
Not executed in this sandbox (no local Postgres available) — run with
`pytest tests/test_auth.py` after starting the database.
"""


async def test_register_creates_org_owner(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Acme Learning & Consulting",
            "full_name": "Hind Owner",
            "email": "hind@acme-test.com",
            "password": "correct-horse-battery",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["member"]["role"] == "org_owner"
    assert body["access_token"] and body["refresh_token"]


async def test_login_succeeds_with_correct_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"organization_name": "Acme", "full_name": "Hind", "email": "hind2@acme-test.com", "password": "correct-horse-battery"},
    )
    resp = await client.post("/api/v1/auth/login", json={"email": "hind2@acme-test.com", "password": "correct-horse-battery"})
    assert resp.status_code == 200


async def test_login_rejects_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"organization_name": "Acme", "full_name": "Hind", "email": "hind3@acme-test.com", "password": "correct-horse-battery"},
    )
    resp = await client.post("/api/v1/auth/login", json={"email": "hind3@acme-test.com", "password": "wrong-password"})
    assert resp.status_code == 401


async def test_refresh_rotation_and_reuse_detection(client):
    register_resp = await client.post(
        "/api/v1/auth/register",
        json={"organization_name": "Acme", "full_name": "Hind", "email": "hind4@acme-test.com", "password": "correct-horse-battery"},
    )
    original_refresh = register_resp.json()["refresh_token"]

    # First use rotates successfully.
    refresh_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh})
    assert refresh_resp.status_code == 200
    new_refresh = refresh_resp.json()["refresh_token"]
    assert new_refresh != original_refresh

    # Reusing the now-revoked original token must fail AND revoke the new one too.
    reuse_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh})
    assert reuse_resp.status_code == 401

    second_use_of_new_resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
    assert second_use_of_new_resp.status_code == 401  # revoked by the reuse-detection sweep above


async def test_forgot_and_reset_password_flow(client):
    await client.post(
        "/api/v1/auth/register",
        json={"organization_name": "Acme", "full_name": "Hind", "email": "hind5@acme-test.com", "password": "old-password-123"},
    )

    forgot_resp = await client.post("/api/v1/auth/forgot-password", json={"email": "hind5@acme-test.com"})
    assert forgot_resp.status_code == 202

    # The real reset token isn't returned over the API by design (it would normally
    # be emailed); this test exercises the service layer directly for the token.
    from app.core.database import AsyncSessionLocal  # noqa: E402
    from app.services import auth_service  # noqa: E402

    async with AsyncSessionLocal() as db:
        token = await auth_service.request_password_reset(db, email="hind5@acme-test.com")
        assert token is not None

    reset_resp = await client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "new-password-456"})
    assert reset_resp.status_code == 204

    old_login = await client.post("/api/v1/auth/login", json={"email": "hind5@acme-test.com", "password": "old-password-123"})
    assert old_login.status_code == 401

    new_login = await client.post("/api/v1/auth/login", json={"email": "hind5@acme-test.com", "password": "new-password-456"})
    assert new_login.status_code == 200

    # Single-use: the same reset token must not work a second time, even
    # before expiry, because its embedded password-hash fingerprint is stale.
    reuse_resp = await client.post("/api/v1/auth/reset-password", json={"token": token, "new_password": "another-789"})
    assert reuse_resp.status_code == 400
