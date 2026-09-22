"""
Guarda-raya contra desincronizacion: prompts/v2.txt escribe los valores del
catalogo como texto literal (para que el prompt versionado sea un artefacto
autocontenido). Si alguien agrega o renombra una etapa/categoria/severidad/
confianza en catalogo.py y se le olvida actualizar v2.txt, esta prueba falla.
"""

from pathlib import Path

import catalogo

RUTA_V2 = Path(__file__).resolve().parent.parent / "prompts" / "v2.txt"


def _texto_v2() -> str:
    return RUTA_V2.read_text(encoding="utf-8")


def test_v2_menciona_todas_las_etapas():
    texto = _texto_v2()
    faltantes = [etapa for etapa in catalogo.ETAPAS if etapa not in texto]
    assert not faltantes, f"Etapas ausentes en prompts/v2.txt: {faltantes}"


def test_v2_menciona_todas_las_categorias_de_causa():
    texto = _texto_v2()
    faltantes = [c for c in catalogo.CATEGORIAS_CAUSA if c not in texto]
    assert not faltantes, f"Categorias ausentes en prompts/v2.txt: {faltantes}"


def test_v2_menciona_todas_las_severidades_y_confianzas():
    texto = _texto_v2()
    faltantes = [s for s in catalogo.SEVERIDAD if s not in texto]
    faltantes += [c for c in catalogo.CONFIANZA if c not in texto]
    assert not faltantes, f"Valores ausentes en prompts/v2.txt: {faltantes}"


def test_v2_tiene_la_marca_para_insertar_el_log():
    assert "__LOG_AQUI__" in _texto_v2()
    assert "<log_ci>" in _texto_v2()
    assert "</log_ci>" in _texto_v2()


def test_v1_tambien_tiene_la_marca_para_insertar_el_log():
    ruta_v1 = RUTA_V2.parent / "v1.txt"
    assert "__LOG_AQUI__" in ruta_v1.read_text(encoding="utf-8")
