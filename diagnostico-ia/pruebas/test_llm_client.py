"""
Pruebas de llm_client.py. Todas usan ClienteFalso (conftest.py): CERO
llamadas de red y CERO necesidad de una API key real.
"""

import httpx
import groq
import pytest

from conftest import ClienteFalso
from llm_client import ErrorLLM, consultar


def _peticion_falsa() -> httpx.Request:
    return httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


def test_consultar_devuelve_el_texto_de_la_respuesta(variables_llm):
    cliente = ClienteFalso(respuestas=['{"estado": "FALLO"}'])
    resultado = consultar("prompt sistema", "prompt usuario", cliente=cliente)
    assert resultado == '{"estado": "FALLO"}'
    assert len(cliente.llamadas) == 1
    assert cliente.llamadas[0]["model"] == "modelo-de-prueba"
    mensajes = cliente.llamadas[0]["messages"]
    assert mensajes[0] == {"role": "system", "content": "prompt sistema"}
    assert mensajes[1] == {"role": "user", "content": "prompt usuario"}


def test_consultar_sin_model_name_da_error_amigable(monkeypatch):
    monkeypatch.delenv("MODEL_NAME", raising=False)
    cliente = ClienteFalso(respuestas=["no deberia llegar aqui"])
    with pytest.raises(ErrorLLM, match="MODEL_NAME"):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_sin_cliente_ni_api_key_da_error_amigable(monkeypatch):
    monkeypatch.setenv("MODEL_NAME", "modelo-de-prueba")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(ErrorLLM, match="GROQ_API_KEY"):
        consultar("sistema", "usuario")  # sin cliente -> intenta crear el real


def test_consultar_traduce_rate_limit(variables_llm):
    error_real = groq.RateLimitError(
        "rate limited", response=httpx.Response(status_code=429, request=_peticion_falsa()), body=None
    )
    cliente = ClienteFalso(excepcion=error_real)
    with pytest.raises(ErrorLLM, match="limite de solicitudes"):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_traduce_error_de_autenticacion(variables_llm):
    error_real = groq.AuthenticationError(
        "bad key", response=httpx.Response(status_code=401, request=_peticion_falsa()), body=None
    )
    cliente = ClienteFalso(excepcion=error_real)
    with pytest.raises(ErrorLLM, match="API key"):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_traduce_timeout(variables_llm):
    error_real = groq.APITimeoutError(request=_peticion_falsa())
    cliente = ClienteFalso(excepcion=error_real)
    with pytest.raises(ErrorLLM, match="timeout"):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_traduce_error_de_conexion(variables_llm):
    error_real = groq.APIConnectionError(request=_peticion_falsa())
    cliente = ClienteFalso(excepcion=error_real)
    with pytest.raises(ErrorLLM, match="conectar"):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_nunca_deja_escapar_un_error_generico(variables_llm):
    cliente = ClienteFalso(excepcion=ValueError("algo raro paso"))
    with pytest.raises(ErrorLLM):
        consultar("sistema", "usuario", cliente=cliente)


def test_consultar_no_imprime_la_api_key(variables_llm, monkeypatch, capsys):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_secreto_de_prueba_123456")
    cliente = ClienteFalso(respuestas=["ok"])
    consultar("sistema", "usuario", cliente=cliente)
    salida = capsys.readouterr()
    assert "gsk_secreto_de_prueba_123456" not in salida.out
    assert "gsk_secreto_de_prueba_123456" not in salida.err
