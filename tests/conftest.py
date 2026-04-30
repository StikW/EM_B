import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]


# Lectura de la URL del servidor de prueba
def read_json_line(process, timeout=10):
    deadline = time.time() + timeout
    while time.time() < deadline:
        line = process.stdout.readline()
        if not line:
            if process.poll() is not None:
                stderr = process.stderr.read()
                raise RuntimeError(
                    f"El servidor de prueba termino antes de iniciar.\n{stderr}"
                )
            time.sleep(0.1)
            continue
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue
    raise TimeoutError("El servidor de prueba no informo su URL a tiempo.")


# Fixture del backend de prueba
@pytest.fixture(scope="session")
def backend_url():
    server_script = PROJECT_ROOT / "tests" / "support" / "backend-test-server.cjs"
    process = subprocess.Popen(
        ["node", str(server_script)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        payload = read_json_line(process)
        yield payload["url"]
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


# Helper para peticiones HTTP a la API
def api_request(method, url, data=None, token=None):
    headers = {"Accept": "application/json"}
    body = None

    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            response_body = response.read().decode("utf-8")
            return response.status, json.loads(response_body)
    except urllib.error.HTTPError as error:
        response_body = error.read().decode("utf-8")
        return error.code, json.loads(response_body)


# Fixture para llamar endpoints
@pytest.fixture
def api():
    return api_request


# Fixture con la raiz del proyecto
@pytest.fixture(scope="session")
def project_root():
    return PROJECT_ROOT
