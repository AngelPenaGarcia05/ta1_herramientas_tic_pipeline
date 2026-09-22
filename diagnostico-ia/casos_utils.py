"""
Utilidades compartidas para leer casos/casos.json.

Tanto app.py (selector de logs de ejemplo, FASE 3) como
pruebas/ejecutar_casos.py (runner de comparacion, FASE 4) necesitan lo
mismo: leer casos.json, cargar el log de cada caso, y saber si ese log
todavia es un PLACEHOLDER (el usuario aun no pego el log real) para no
tratarlo como un caso valido. Vive en un modulo aparte para no duplicar
esta logica en los dos archivos.
"""

from __future__ import annotations

import json
from pathlib import Path

MARCA_PENDIENTE = "# PENDIENTE:"


def log_esta_pendiente(texto: str) -> bool:
    """Un log 'pendiente' es uno vacio o que todavia es el placeholder."""
    texto = texto.strip()
    return not texto or texto.startswith(MARCA_PENDIENTE)


def cargar_casos(carpeta_casos: Path) -> list[dict]:
    """
    Lee casos/casos.json y devuelve la lista de casos, cada uno con dos
    claves agregadas:
      - "log": el contenido del archivo (o "" si no existe).
      - "pendiente": True si el log todavia es un placeholder.

    Si casos.json no existe o esta corrupto, devuelve una lista vacia (no
    revienta: FASE 4 puede no estar lista todavia).
    """
    ruta_json = carpeta_casos / "casos.json"
    if not ruta_json.exists():
        return []
    try:
        casos_crudos = json.loads(ruta_json.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    resultado = []
    for caso in casos_crudos:
        ruta_log = carpeta_casos / caso.get("archivo", "")
        texto = ruta_log.read_text(encoding="utf-8") if ruta_log.exists() else ""
        caso_completo = dict(caso)
        caso_completo["log"] = texto
        caso_completo["pendiente"] = log_esta_pendiente(texto)
        resultado.append(caso_completo)
    return resultado
