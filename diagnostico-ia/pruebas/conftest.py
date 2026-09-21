"""
Fixtures y utilidades compartidas por las pruebas. No hace ninguna llamada de
red: `ClienteFalso` sustituye a `groq.Groq()` en todas las pruebas.
"""

import pytest


class _MensajeFalso:
    def __init__(self, texto: str):
        self.content = texto


class _ChoiceFalso:
    def __init__(self, texto: str):
        self.message = _MensajeFalso(texto)


class _RespuestaFalsa:
    def __init__(self, texto: str):
        self.choices = [_ChoiceFalso(texto)]


class ClienteFalso:
    """
    Sustituto de groq.Groq() para pruebas.

    - `respuestas`: lista de textos a devolver, uno por cada llamada, en orden.
    - `excepcion`: si se da, la levanta en vez de responder (para probar el
      manejo de errores).

    Guarda en `self.llamadas` los argumentos de cada `create(...)` para poder
    revisar, por ejemplo, que el prompt de reintento incluya el error anterior.
    """

    def __init__(self, respuestas=None, excepcion=None):
        self._respuestas = list(respuestas) if respuestas else []
        self._excepcion = excepcion
        self.llamadas = []
        self.chat = self
        self.completions = self  # permite cliente.chat.completions.create(...)

    def create(self, **kwargs):
        self.llamadas.append(kwargs)
        if self._excepcion is not None:
            raise self._excepcion
        if not self._respuestas:
            raise AssertionError("ClienteFalso se quedo sin respuestas configuradas")
        return _RespuestaFalsa(self._respuestas.pop(0))


@pytest.fixture
def variables_llm(monkeypatch):
    """Configura MODEL_NAME y limpia GROQ_API_KEY para que las pruebas nunca
    intenten crear un cliente real ni dependan de variables locales."""
    monkeypatch.setenv("MODEL_NAME", "modelo-de-prueba")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
