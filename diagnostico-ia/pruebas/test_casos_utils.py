"""Pruebas de casos_utils.py: no requieren red ni API key."""

from pathlib import Path

import casos_utils

CARPETA_CASOS_REAL = Path(__file__).resolve().parent.parent / "casos"


def test_log_esta_pendiente_con_texto_vacio():
    assert casos_utils.log_esta_pendiente("") is True
    assert casos_utils.log_esta_pendiente("   \n  ") is True


def test_log_esta_pendiente_con_marca_de_placeholder():
    assert casos_utils.log_esta_pendiente("# PENDIENTE: pega el log aqui\n...") is True


def test_log_esta_pendiente_con_contenido_real():
    assert casos_utils.log_esta_pendiente("Run npm run lint\nerror ...") is False


def test_cargar_casos_sin_casos_json(tmp_path):
    assert casos_utils.cargar_casos(tmp_path) == []


def test_cargar_casos_json_corrupto(tmp_path):
    (tmp_path / "casos.json").write_text("esto no es json valido {{{", encoding="utf-8")
    assert casos_utils.cargar_casos(tmp_path) == []


def test_cargar_casos_marca_pendientes_y_disponibles(tmp_path):
    (tmp_path / "casos.json").write_text(
        '[{"id": "a", "archivo": "a.log", "descripcion": "d", "esperado": {}},'
        ' {"id": "b", "archivo": "b.log", "descripcion": "d", "esperado": {}}]',
        encoding="utf-8",
    )
    (tmp_path / "a.log").write_text("# PENDIENTE: falta pegar el log real", encoding="utf-8")
    (tmp_path / "b.log").write_text("Run npm test\nfallo real aqui", encoding="utf-8")

    casos = casos_utils.cargar_casos(tmp_path)
    por_id = {c["id"]: c for c in casos}

    assert por_id["a"]["pendiente"] is True
    assert por_id["b"]["pendiente"] is False
    assert por_id["b"]["log"] == "Run npm test\nfallo real aqui"


def test_casos_de_ejemplo_reales_del_proyecto():
    """
    Corre sobre la carpeta casos/ real del proyecto: confirma que
    casos.json tiene los 6 casos esperados y cuales ya tienen un log real
    cargado (1, 2 y 6) vs. cuales siguen pendientes (3, 4 y 5).
    """
    casos = casos_utils.cargar_casos(CARPETA_CASOS_REAL)
    ids = {c["id"] for c in casos}
    assert ids == {
        "caso_01_terraform_free_tier",
        "caso_02_render_imagen_sha",
        "caso_03_eslint",
        "caso_04_vitest",
        "caso_05_exitoso",
        "caso_06_log_corto_sin_contexto",
    }
    disponibles = {c["id"] for c in casos if not c["pendiente"]}
    assert disponibles == {
        "caso_01_terraform_free_tier",
        "caso_02_render_imagen_sha",
        "caso_05_exitoso",
        "caso_06_log_corto_sin_contexto",
    }
