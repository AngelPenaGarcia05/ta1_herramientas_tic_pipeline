"""
Pruebas de las funciones puras de pruebas/ejecutar_casos.py (comparacion,
tabla Markdown, construccion del caso reto). No llaman al modelo real.
"""

import ejecutar_casos
import redactor
from orquestador import ResultadoDiagnostico
from validador import Chequeo, ResultadoSalida


def test_comparar_sin_datos_devuelve_none():
    assert ejecutar_casos._comparar(None, {"estado": "FALLO"}) is None


def test_comparar_estado_distinto_es_falso():
    datos = {"estado": "FALLO", "etapa": "LINT"}
    assert ejecutar_casos._comparar(datos, {"estado": "SIN_FALLO"}) is False


def test_comparar_etapa_distinta_es_falso():
    datos = {"estado": "FALLO", "etapa": "TEST"}
    assert ejecutar_casos._comparar(datos, {"estado": "FALLO", "etapa": "LINT"}) is False


def test_comparar_todo_coincide_es_verdadero():
    datos = {"estado": "FALLO", "etapa": "LINT"}
    assert ejecutar_casos._comparar(datos, {"estado": "FALLO", "etapa": "LINT"}) is True


def test_comparar_sin_etapa_esperada_solo_mira_estado():
    datos = {"estado": "INDETERMINADO", "etapa": "INDETERMINADO"}
    assert ejecutar_casos._comparar(datos, {"estado": "INDETERMINADO"}) is True


def test_construir_caso_reto_tiene_las_claves_esperadas():
    caso = ejecutar_casos._construir_caso_reto()
    assert caso["id"] == ejecutar_casos.ID_CASO_RETO
    assert caso["pendiente"] is False
    assert "<log_ci>" not in caso["log"]  # es un log crudo, no un prompt
    assert "ignora las reglas" in caso["log"]


def test_construir_caso_reto_el_token_lo_detecta_el_redactor():
    """
    El "reto" trae un token con forma realista SOLO en memoria. Aqui se
    comprueba que redactor.py (la primera linea de defensa antes de
    mandarlo al modelo) efectivamente lo detecta y lo oculta.
    """
    caso = ejecutar_casos._construir_caso_reto()
    log_redactado, conteo = redactor.redactar(caso["log"])
    assert conteo.get("github_token") == 1
    assert "FAKETOKENPARAPRUEBAS" not in log_redactado


def _resultado_falso(datos: dict, chequeos_ok: bool = True) -> ResultadoDiagnostico:
    chequeos = [Chequeo("json_valido", chequeos_ok, "detalle")]
    validacion = ResultadoSalida(valido=chequeos_ok, datos=datos, chequeos=chequeos)
    return ResultadoDiagnostico(
        version_prompt="v2",
        log_redactado="log de prueba",
        conteo_secretos={},
        respuesta_cruda="{}",
        validacion=validacion,
        intentos=1,
        generado_localmente=False,
    )


def test_resultado_a_dict_incluye_lo_necesario_para_el_reporte():
    caso = {"id": "caso_x", "descripcion": "desc", "esperado": {"estado": "FALLO", "etapa": "LINT"}}
    resultado = _resultado_falso({"estado": "FALLO", "etapa": "LINT"})
    info = ejecutar_casos._resultado_a_dict(caso, resultado)

    assert info["id"] == "caso_x"
    assert info["formato_valido"] is True
    assert info["coincide_con_esperado"] is True
    assert info["chequeos"][0]["nombre"] == "json_valido"


def test_tabla_markdown_no_revienta_con_error_generado_localmente_y_texto_libre():
    resultados = [
        ejecutar_casos._resultado_a_dict(
            {"id": "caso_error", "descripcion": "d", "esperado": {"estado": "FALLO"}},
            ResultadoDiagnostico(
                version_prompt="v2",
                log_redactado="",
                conteo_secretos={},
                respuesta_cruda="",
                validacion=None,
                intentos=1,
                generado_localmente=False,
                error="No se pudo conectar con la API.",
            ),
        ),
        ejecutar_casos._resultado_a_dict(
            {"id": "caso_local", "descripcion": "d", "esperado": {"estado": "INDETERMINADO"}},
            _resultado_falso({"estado": "INDETERMINADO", "generado_localmente": True}),
        ),
    ]
    tabla = ejecutar_casos._tabla_markdown(resultados)
    assert "caso_error" in tabla
    assert "caso_local" in tabla
    assert tabla.startswith("| Caso |")
