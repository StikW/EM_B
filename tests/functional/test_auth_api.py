import uuid

import pytest


pytestmark = pytest.mark.backend


# Prueba de validacion del registro
@pytest.mark.functional
def test_register_requires_name_email_and_password(api, backend_url):
    """Prueba de validacion del registro."""
    status, body = api(
        "POST",
        f"{backend_url}/api/auth/register",
        {"email": "ana@example.com"},
    )

    assert status == 400
    assert "obligatorios" in body["message"]


# Prueba de correo duplicado
@pytest.mark.functional
def test_register_rejects_existing_email(api, backend_url):
    """Prueba de correo duplicado."""
    status, body = api(
        "POST",
        f"{backend_url}/api/auth/register",
        {
            "name": "Cliente",
            "email": "cliente@ecomart.com",
            "password": "Cliente123!",
        },
    )

    assert status == 409
    assert "Ya existe" in body["message"]


# Prueba de registro exitoso
@pytest.mark.functional
def test_register_creates_user_without_exposing_password_hash(api, backend_url):
    """Prueba de registro exitoso."""
    email = f"ana-{uuid.uuid4().hex[:8]}@example.com"
    status, body = api(
        "POST",
        f"{backend_url}/api/auth/register",
        {"name": " Ana ", "email": email, "password": "secret123"},
    )

    assert status == 201
    assert body["user"]["name"] == "Ana"
    assert body["user"]["email"] == email
    assert "passwordHash" not in body["user"]
    assert isinstance(body["token"], str)
    assert body["token"]


# Prueba de login con credenciales incorrectas
@pytest.mark.functional
def test_login_rejects_wrong_credentials(api, backend_url):
    """Prueba de login con credenciales incorrectas."""
    status, body = api(
        "POST",
        f"{backend_url}/api/auth/login",
        {"email": "cliente@ecomart.com", "password": "incorrecta"},
    )

    assert status == 401
    assert "Credenciales" in body["message"]


# Prueba de login exitoso
@pytest.mark.functional
def test_login_returns_token_for_valid_credentials(api, backend_url):
    """Prueba de login exitoso."""
    status, body = api(
        "POST",
        f"{backend_url}/api/auth/login",
        {"email": "cliente@ecomart.com", "password": "Cliente123!"},
    )

    assert status == 200
    assert body["user"]["email"] == "cliente@ecomart.com"
    assert "passwordHash" not in body["user"]
    assert isinstance(body["token"], str)
