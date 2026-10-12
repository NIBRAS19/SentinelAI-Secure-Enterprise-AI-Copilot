"""
Integration tests against a real Postgres instance (see conftest.py).
Not executed in this sandbox — run with `pytest tests/test_rbac_and_tenancy.py`
after starting the database.
"""


async def _register_and_login(client, org_name: str, email: str) -> str:
    resp = await client.post(
        "/api/v1/auth/register",
        json={"organization_name": org_name, "full_name": "Owner", "email": email, "password": "correct-horse-battery"},
    )
    return resp.json()["access_token"]


async def test_member_cannot_manage_security_policies(client):
    owner_token = await _register_and_login(client, "Acme", "owner@acme-test.com")

    invite_resp = await client.post(
        "/api/v1/organizations/members",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"email": "member@acme-test.com", "full_name": "Member Person", "role": "member", "temporary_password": "temp-pass-123"},
    )
    assert invite_resp.status_code == 201

    login_resp = await client.post("/api/v1/auth/login", json={"email": "member@acme-test.com", "password": "temp-pass-123"})
    token = login_resp.json()["access_token"]

    # member's ROLE_PERMISSIONS (app/policies/rbac.py) only grants
    # documents.read and chat.use — security.view isn't among them, so even
    # a read-only security endpoint must 403, not just the write ones.
    resp = await client.get("/api/v1/security/policies", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


async def test_unauthenticated_request_rejected(client):
    resp = await client.get("/api/v1/documents")
    assert resp.status_code == 401


async def test_cross_tenant_document_isolation(client):
    """
    Organization B must never be able to read Organization A's document by
    id, even though both are valid documents in the system — the route
    derives organization_id from B's own JWT, not from the path, so A's
    document_id simply doesn't match any row B is allowed to see.
    """
    token_a = await _register_and_login(client, "Org A", "owner-a@test.com")
    token_b = await _register_and_login(client, "Org B", "owner-b@test.com")

    upload_resp = await client.post(
        "/api/v1/documents",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("notes.txt", b"Org A's confidential notes.", "text/plain")},
    )
    assert upload_resp.status_code == 201
    document_id = upload_resp.json()["id"]

    # Org A can read its own document.
    own_resp = await client.get(f"/api/v1/documents/{document_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert own_resp.status_code == 200

    # Org B cannot, even with a syntactically valid document id.
    cross_resp = await client.get(f"/api/v1/documents/{document_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert cross_resp.status_code == 404
