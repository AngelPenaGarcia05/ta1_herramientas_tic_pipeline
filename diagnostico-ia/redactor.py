"""
Redactor de secretos.

El log que pega el usuario puede contener tokens, contrasenas o URLs con
credenciales (copiados de GitHub Actions, Render o Docker Hub). Antes de
mostrar el log en la interfaz o de enviarlo al modelo, se reemplaza cada
secreto detectado por una marca "[REDACTADO:tipo]".

La funcion es IDEMPOTENTE: volver a pasar un texto ya redactado por
`redactar()` no debe cambiarlo ni sumar nuevas redacciones. Esto se usa en
validador.py para comprobar que la respuesta del modelo tampoco reproduce
secretos.
"""

from __future__ import annotations

import re
from collections import Counter

MARCA = "[REDACTADO:{tipo}]"

# Nombres de variable que delatan un secreto aunque no tengan un prefijo
# reconocible (ej. SONAR_TOKEN, RENDER_API_KEY, DOCKERHUB_TOKEN, AUTH_SECRET).
_NOMBRE_SOSPECHOSO = r"[\w.\-]*(?:password|secret|token|api[_-]?key)[\w.\-]*"

# Cada patron se prueba EN ORDEN sobre el texto ya modificado por los
# anteriores. El ultimo patron (por nombre de variable) incluye un lookahead
# negativo para no volver a redactar un valor que ya es "[REDACTADO:...]"
# (eso es lo que garantiza la idempotencia).
_PATRONES: list[tuple[str, re.Pattern[str], object]] = [
    (
        "jwt",
        re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b"),
        lambda m: MARCA.format(tipo="jwt"),
    ),
    (
        "github_token",
        re.compile(r"\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}\b"),
        lambda m: MARCA.format(tipo="github_token"),
    ),
    (
        "aws_access_key",
        re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        lambda m: MARCA.format(tipo="aws_access_key"),
    ),
    (
        "render_api_key",
        re.compile(r"\brnd_[A-Za-z0-9]{20,}\b"),
        lambda m: MARCA.format(tipo="render_api_key"),
    ),
    (
        "dockerhub_token",
        re.compile(r"\bdckr_pat_[A-Za-z0-9_-]{20,}\b"),
        lambda m: MARCA.format(tipo="dockerhub_token"),
    ),
    (
        "authorization_bearer",
        re.compile(r"(?i)(authorization\s*:\s*bearer\s+)([A-Za-z0-9._~+/=-]{8,})"),
        lambda m: f"{m.group(1)}{MARCA.format(tipo='authorization_bearer')}",
    ),
    (
        "credenciales_url",
        # postgresql://usuario:clave@host, https://usuario:clave@host, etc.
        # El lookahead evita volver a matchear un "[REDACTADO:...]" que ya
        # quedo en esa posicion (idempotencia).
        re.compile(r"(?i)\b([a-z][a-z0-9+.-]*://)(?!\[REDACTADO:)([^\s:@/]+):([^\s@/]+)@"),
        lambda m: f"{m.group(1)}{MARCA.format(tipo='credenciales_url')}@",
    ),
    (
        "credencial_por_nombre",
        re.compile(
            rf"(?i)\b({_NOMBRE_SOSPECHOSO})(\s*[:=]\s*)(?!\[REDACTADO:)"
            r"(\"[^\"]*\"|'[^']*'|[^\s,;]+)"
        ),
        lambda m: f"{m.group(1)}{m.group(2)}{MARCA.format(tipo='credencial_por_nombre')}",
    ),
]


def redactar(texto: str) -> tuple[str, dict[str, int]]:
    """
    Reemplaza los secretos encontrados en `texto` por marcas "[REDACTADO:tipo]".

    Devuelve (texto_redactado, conteo_por_tipo), donde conteo_por_tipo es un
    diccionario {tipo_de_secreto: cantidad_encontrada}. Si no se encontro
    ningun secreto, el diccionario queda vacio.
    """
    conteo: Counter[str] = Counter()
    resultado = texto
    for tipo, patron, reemplazo in _PATRONES:
        resultado, cantidad = patron.subn(reemplazo, resultado)
        if cantidad:
            conteo[tipo] += cantidad
    return resultado, dict(conteo)
