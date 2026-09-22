"""Pruebas de redactor.py: deteccion de secretos y no falsos positivos."""

from redactor import redactar


def test_log_sin_secretos_no_cambia():
    texto = (
        "==> Aplicando migraciones de base de datos (prisma migrate deploy)...\n"
        "Error: Cannot find module 'effect'\n"
        "Requiere stack:\n  - /app/node_modules/prisma/build/index.js\n"
    )
    resultado, conteo = redactar(texto)
    assert resultado == texto
    assert conteo == {}


def test_no_falso_positivo_url_sin_credenciales():
    texto = "curl https://novamarket-zgv9.onrender.com/api/health"
    resultado, conteo = redactar(texto)
    assert resultado == texto
    assert conteo == {}


def test_no_falso_positivo_mencion_de_token_sin_valor():
    texto = "::warning::SONAR_TOKEN no configurado. Paso omitido."
    resultado, conteo = redactar(texto)
    assert resultado == texto
    assert conteo == {}


def test_redacta_token_de_github():
    texto = "git push https://ghp_abcdefghijklmnopqrstuvwxyz012345@github.com/x/y.git"
    resultado, conteo = redactar(texto)
    assert "ghp_abcdefghijklmnopqrstuvwxyz012345" not in resultado
    assert conteo.get("github_token") == 1


def test_redacta_github_pat():
    texto = "usa github_pat_11AAAAAAA0aaaaaaaaaaaa_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb para el push"
    resultado, conteo = redactar(texto)
    assert "github_pat_11AAAAAAA0" not in resultado
    assert conteo.get("github_token") == 1


def test_redacta_clave_de_aws():
    texto = "AWS_ACCESS_KEY_ID=AKIAABCDEFGHIJKLMNOP"
    resultado, conteo = redactar(texto)
    assert "AKIAABCDEFGHIJKLMNOP" not in resultado
    assert conteo.get("aws_access_key") == 1


def test_redacta_api_key_de_render():
    texto = "curl -H 'Authorization: Bearer rnd_abcdefghijklmnopqrstuvwx'"
    resultado, conteo = redactar(texto)
    assert "rnd_abcdefghijklmnopqrstuvwx" not in resultado
    # Puede detectarse por el patron de Bearer o por el de rnd_; lo que
    # importa es que el secreto ya no aparece en texto plano.
    assert sum(conteo.values()) >= 1


def test_redacta_token_de_docker_hub():
    texto = "docker login -u user -p dckr_pat_abcdefghijklmnopqrstuvwxyz"
    resultado, conteo = redactar(texto)
    assert "dckr_pat_abcdefghijklmnopqrstuvwxyz" not in resultado
    assert conteo.get("dockerhub_token") == 1


def test_redacta_authorization_bearer_generico():
    texto = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9opaco"
    resultado, conteo = redactar(texto)
    assert "opaco" not in resultado
    assert "Authorization: Bearer [REDACTADO:" in resultado


def test_redacta_url_con_credenciales():
    # Se redacta el bloque completo "usuario:clave" (no solo la clave): un
    # nombre de usuario de base de datos tambien puede ser informacion
    # sensible y no aporta nada al diagnostico.
    texto = 'DATABASE_URL="postgresql://novamarket:S3cr3t0@dpg-abc123.oregon-postgres.render.com:5432/novamarket"'
    resultado, conteo = redactar(texto)
    assert "S3cr3t0" not in resultado
    assert "novamarket:S3cr3t0" not in resultado
    assert "[REDACTADO:credenciales_url]@dpg-abc123" in resultado
    assert conteo.get("credenciales_url") == 1


def test_redacta_par_clave_valor_por_nombre():
    texto = "SONAR_TOKEN=squ_1234567890abcdef1234567890abcdef"
    resultado, conteo = redactar(texto)
    assert "squ_1234567890abcdef1234567890abcdef" not in resultado
    assert conteo.get("credencial_por_nombre") == 1


def test_redacta_password_entre_comillas():
    texto = 'POSTGRES_PASSWORD: "hunter2 con espacios"'
    resultado, conteo = redactar(texto)
    assert "hunter2 con espacios" not in resultado
    assert conteo.get("credencial_por_nombre") == 1


def test_redacta_jwt():
    texto = (
        "cookie=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0."
        "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U; Path=/"
    )
    resultado, conteo = redactar(texto)
    assert "eyJhbGciOiJIUzI1NiJ9" not in resultado
    assert conteo.get("jwt") == 1


def test_es_idempotente():
    texto = (
        "DATABASE_URL=postgresql://novamarket:S3cr3t0@host:5432/db\n"
        "Authorization: Bearer ghp_abcdefghijklmnopqrstuvwxyz012345\n"
        "RENDER_API_KEY=rnd_abcdefghijklmnopqrstuvwx\n"
    )
    primera_pasada, conteo1 = redactar(texto)
    segunda_pasada, conteo2 = redactar(primera_pasada)

    assert segunda_pasada == primera_pasada
    assert conteo2 == {}
    assert sum(conteo1.values()) >= 3


def test_redacta_varios_secretos_en_un_log_realista():
    texto = (
        "Run docker/login-action@v3\n"
        "  username: angelpenagarcia\n"
        "  password: ***\n"
        "Login Succeeded\n"
        "\n"
        "Run curl -X POST https://api.render.com/v1/services/srv-123/deploys\n"
        "  -H 'Authorization: Bearer rnd_zzzzzzzzzzzzzzzzzzzzzzzz'\n"
        "DATABASE_URL=postgresql://novamarket:passw0rd@dpg-x.oregon-postgres.render.com/db\n"
    )
    resultado, conteo = redactar(texto)
    assert "passw0rd" not in resultado
    assert "rnd_zzzzzzzzzzzzzzzzzzzzzzzz" not in resultado
    assert len(conteo) >= 2
