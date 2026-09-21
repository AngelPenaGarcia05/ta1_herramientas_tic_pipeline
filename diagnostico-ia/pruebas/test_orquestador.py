"""
Pruebas de orquestador.py: el flujo completo (entrada -> redactor -> prompt
-> modelo -> validador), con reintento y el INDETERMINADO local. Todas usan
ClienteFalso: cero llamadas de red.
"""

import json

from conftest import ClienteFalso
from orquestador import diagnosticar


DIAGNOSTICO_VALIDO = {
    "estado": "FALLO",
    "etapa": "LINT",
    "categoria_causa": "CODIGO",
    "causa_probable": "ESLint encontro una variable sin usar.",
    "evidencia": ["error de lint"],
    "severidad": "BAJA",
    "acciones_sugeridas": ["Eliminar la variable sin usar"],
    "reintento_seguro": False,
    "confianza": "ALTA",
    "informacion_faltante": [],
    "fuera_de_alcance": False,
}

LOG_DE_EJEMPLO = "Run npm run lint\nerror de lint en src/app/page.tsx\n"


def test_log_vacio_no_llama_al_modelo(variables_llm):
    cliente = ClienteFalso(respuestas=["no deberia usarse"])
    resultado = diagnosticar("", version_prompt="v2", cliente=cliente)
    assert resultado.error is not None
    assert len(cliente.llamadas) == 0


def test_v2_diagnostico_valido_a_la_primera(variables_llm):
    cliente = ClienteFalso(respuestas=[json.dumps(DIAGNOSTICO_VALIDO)])
    resultado = diagnosticar(LOG_DE_EJEMPLO, version_prompt="v2", cliente=cliente)

    assert resultado.error is None
    assert resultado.intentos == 1
    assert resultado.generado_localmente is False
    assert resultado.validacion.valido is True
    assert resultado.validacion.datos["etapa"] == "LINT"
    # el prompt enviado (mensaje "user") debe incluir el log dentro de
    # <log_ci>...</log_ci>; el mensaje "system" es el rol/las reglas.
    prompt_usuario_enviado = cliente.llamadas[0]["messages"][1]["content"]
    assert "<log_ci>" in prompt_usuario_enviado
    assert "error de lint" in prompt_usuario_enviado


def test_v2_reintenta_una_vez_si_la_primera_respuesta_es_invalida(variables_llm):
    cliente = ClienteFalso(
        respuestas=["esto no es JSON", json.dumps(DIAGNOSTICO_VALIDO)]
    )
    resultado = diagnosticar(LOG_DE_EJEMPLO, version_prompt="v2", cliente=cliente)

    assert resultado.intentos == 2
    assert resultado.generado_localmente is False
    assert resultado.validacion.valido is True
    assert len(cliente.llamadas) == 2
    # el segundo prompt (mensaje "user") debe mencionar el error de la
    # primera respuesta
    segundo_prompt = cliente.llamadas[1]["messages"][1]["content"]
    assert "no cumplio el formato" in segundo_prompt


def test_v2_indeterminado_local_si_el_reintento_tambien_falla(variables_llm):
    cliente = ClienteFalso(respuestas=["texto invalido", "sigue invalido"])
    resultado = diagnosticar(LOG_DE_EJEMPLO, version_prompt="v2", cliente=cliente)

    assert resultado.intentos == 2
    assert resultado.generado_localmente is True
    assert resultado.validacion.valido is True
    assert resultado.validacion.datos["estado"] == "INDETERMINADO"
    assert resultado.validacion.datos["generado_localmente"] is True
    assert len(cliente.llamadas) == 2  # nunca se llama una tercera vez


def test_v1_no_reintenta_y_guarda_texto_libre(variables_llm):
    cliente = ClienteFalso(respuestas=["El fallo fue en el lint, corrige el error."])
    resultado = diagnosticar(LOG_DE_EJEMPLO, version_prompt="v1", cliente=cliente)

    assert resultado.intentos == 1
    assert len(cliente.llamadas) == 1
    assert resultado.respuesta_cruda == "El fallo fue en el lint, corrige el error."
    # v1 no tiene esquema: la validacion de formato falla, y eso es lo esperado.
    assert resultado.validacion.valido is False


def test_error_del_modelo_se_propaga_como_mensaje_amigable(variables_llm):
    import groq
    import httpx

    peticion = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    error_real = groq.APIConnectionError(request=peticion)
    cliente = ClienteFalso(excepcion=error_real)

    resultado = diagnosticar(LOG_DE_EJEMPLO, version_prompt="v2", cliente=cliente)
    assert resultado.error is not None
    assert "conectar" in resultado.error
