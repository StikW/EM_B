import subprocess

import pytest


pytestmark = [pytest.mark.backend, pytest.mark.unit]

AUTH_UNIT_CASES = [
    "register_required_fields",
    "register_duplicate_email",
    "register_success",
    "login_required_fields",
    "login_wrong_credentials",
    "login_success",
]


# Pruebas unitarias de registro y login
@pytest.mark.parametrize("case_name", AUTH_UNIT_CASES)
def test_auth_unit_case_passes(project_root, case_name):
    """Prueba un caso unitario de registro o login desde pytest."""
    result = subprocess.run(
        ["node", "tests/support/auth-unit-checks.cjs", case_name],
        cwd=project_root,
        text=True,
        capture_output=True,
        timeout=60,
    )

    assert result.returncode == 0, result.stdout + result.stderr
