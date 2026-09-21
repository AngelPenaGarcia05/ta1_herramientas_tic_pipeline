"""Pruebas de validador.py: validacion de entrada y de salida del modelo."""

import json

import validador
from validador import validar_entrada, validar_salida


LOG_DE_EJEMPLO = (
    "Run npm run lint\n"
    "ESLint: 3 errores encontrados en src/app/page.tsx\n"
    "  15:7  error  'foo' is defined but never used  @typescript-eslint/no-unused-vars\n"
    "Error: Process completed with exit code 1.\n"
)


def _diagnostico_valido(**overrides) -> dict:
    """Diagnostico base valido; los tests lo mutan para probar casos negativos."""
    base = {
        "estado": "FALLO",
        "etapa": "LINT",
        "categoria_causa": "CODIGO",
        "causa_probable": "ESLint encontro una variable declarada pero no usada.",
        "evidencia": ["'foo' is defined but never used"],
        "severidad": "BAJA",
        "acciones_sugeridas": ["Eliminar la variable 'foo' o usarla en src/app/page.tsx"],
        "reintento_seguro": False,
        "confianza": "ALTA",
        "informacion_faltante": [],
        "fuera_de_alcance": False,
    }
    base.update(overrides)
    return base


# ---------- validar_entrada ----------


def test_entrada_vacia_es_invalida():
    resultado = validar_entrada("")
    assert resultado.valido is False
    assert resultado.mensaje != ""


def test_entrada_solo_espacios_es_invalida():
    resultado = validar_entrada("   \n\t  ")
    assert resultado.valido is False


def test_entrada_corta_se_envia_sin_recortar():
    resultado = validar_entrada("solo 3 lineas\nsin contexto\nfin")
    assert resultado.valido is True
    assert resultado.fue_recortado is False
    assert resultado.texto == "solo 3 lineas\nsin contexto\nfin"


def test_entrada_larga_se_recorta_conservando_inicio_y_final():
    texto = ("A" * 100) + ("B" * 100) + ("C" * 100)
    resultado = validar_entrada(texto, max_caracteres=120)
    assert resultado.valido is True
    assert resultado.fue_recortado is True
    assert resultado.texto.startswith("A")
    assert resultado.texto.endswith("C")
    assert "LOG RECORTADO" in resultado.texto
    assert len(resultado.texto) <= 120 + len(validador.MARCA_RECORTE)


# ---------- validar_salida: formato ----------


def test_salida_no_json_es_invalida():
    resultado = validar_salida("esto no es JSON, es texto libre del modelo", LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "json_valido")
    assert chequeo.paso is False


def test_salida_json_pero_no_es_objeto():
    resultado = validar_salida("[1, 2, 3]", LOG_DE_EJEMPLO)
    assert resultado.valido is False


def test_salida_le_faltan_campos():
    diagnostico = _diagnostico_valido()
    del diagnostico["severidad"]
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "campos_completos")
    assert chequeo.paso is False
    assert "severidad" in chequeo.detalle


def test_salida_con_tipo_incorrecto():
    # evidencia deberia ser una lista de strings, no un string suelto.
    diagnostico = _diagnostico_valido(evidencia="'foo' is defined but never used")
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "tipos_correctos")
    assert chequeo.paso is False


def test_salida_con_etapa_fuera_del_catalogo():
    diagnostico = _diagnostico_valido(etapa="ETAPA_INVENTADA")
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "enums_validos")
    assert chequeo.paso is False


# ---------- validar_salida: coherencia ----------


def test_coherencia_sin_fallo_exige_etapa_sin_fallo():
    diagnostico = _diagnostico_valido(estado="SIN_FALLO", etapa="LINT")
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "coherencia_sin_fallo")
    assert chequeo.paso is False


def test_sin_fallo_con_etapa_sin_fallo_es_coherente():
    diagnostico = _diagnostico_valido(
        estado="SIN_FALLO", etapa="SIN_FALLO", evidencia=[], acciones_sugeridas=[]
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    chequeo = next(c for c in resultado.chequeos if c.nombre == "coherencia_sin_fallo")
    assert chequeo.paso is True


def test_indeterminado_exige_informacion_faltante_no_vacia():
    diagnostico = _diagnostico_valido(
        estado="INDETERMINADO",
        etapa="INDETERMINADO",
        evidencia=[],
        informacion_faltante=[],
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "coherencia_indeterminado")
    assert chequeo.paso is False


def test_indeterminado_con_informacion_faltante_es_coherente():
    diagnostico = _diagnostico_valido(
        estado="INDETERMINADO",
        etapa="INDETERMINADO",
        evidencia=[],
        informacion_faltante=["No hay suficiente contexto en el log"],
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    chequeo = next(c for c in resultado.chequeos if c.nombre == "coherencia_indeterminado")
    assert chequeo.paso is True


# ---------- validar_salida: evidencia literal ----------


def test_evidencia_que_no_esta_en_el_log_falla():
    diagnostico = _diagnostico_valido(evidencia=["esto no aparece en ningun lado"])
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "evidencia_literal")
    assert chequeo.paso is False


def test_evidencia_se_compara_normalizando_espacios():
    # El log tiene dos espacios entre "15:7" y "error"; la evidencia del
    # modelo trae un solo espacio. Debe igual considerarse una cita literal.
    diagnostico = _diagnostico_valido(evidencia=["15:7 error 'foo' is defined"])
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    chequeo = next(c for c in resultado.chequeos if c.nombre == "evidencia_literal")
    assert chequeo.paso is True


# ---------- validar_salida: acciones prohibidas ----------


def test_accion_que_sugiere_saltarse_pruebas_es_rechazada():
    diagnostico = _diagnostico_valido(
        acciones_sugeridas=["Saltarse las pruebas y desplegar directamente"]
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "sin_acciones_prohibidas")
    assert chequeo.paso is False


def test_accion_que_sugiere_desactivar_sonarcloud_es_rechazada():
    diagnostico = _diagnostico_valido(
        acciones_sugeridas=["Desactivar SonarCloud temporalmente para poder desplegar"]
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False


def test_accion_normal_no_se_rechaza():
    diagnostico = _diagnostico_valido(
        acciones_sugeridas=["Revisar el archivo src/app/page.tsx y eliminar la variable sin usar"]
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    chequeo = next(c for c in resultado.chequeos if c.nombre == "sin_acciones_prohibidas")
    assert chequeo.paso is True


# ---------- validar_salida: no debe reproducir secretos ----------


def test_respuesta_que_reproduce_un_token_es_rechazada():
    diagnostico = _diagnostico_valido(
        causa_probable="El deploy fallo por credenciales invalidas: ghp_abcdefghijklmnopqrstuvwxyz012345"
    )
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is False
    chequeo = next(c for c in resultado.chequeos if c.nombre == "sin_secretos_en_la_respuesta")
    assert chequeo.paso is False


# ---------- caso completo valido ----------


def test_diagnostico_completo_y_valido_pasa_todos_los_chequeos():
    diagnostico = _diagnostico_valido()
    resultado = validar_salida(json.dumps(diagnostico), LOG_DE_EJEMPLO)
    assert resultado.valido is True
    assert resultado.datos == diagnostico
    assert all(c.paso for c in resultado.chequeos)
