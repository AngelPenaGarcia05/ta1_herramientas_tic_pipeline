"""
Cliente aislado del modelo de lenguaje (LLM).

Todo el resto de la app conoce SOLO la funcion `consultar(prompt_sistema,
prompt_usuario)`. Nunca se llama directamente al SDK del proveedor desde
otro archivo: si el dia de manana cambiamos de proveedor otra vez, solo se
toca este archivo.

Proveedor: Groq (https://console.groq.com), API compatible con el formato
"chat completions" (gratis, por eso se eligio para este prototipo).

Variables de entorno que usa:
  GROQ_API_KEY           (obligatoria) tu API key de Groq. NUNCA se
                         hardcodea, ni se imprime, ni se guarda en logs.
  MODEL_NAME              (obligatoria) el modelo a usar. Para este
                         prototipo: "llama-3.3-70b-versatile" (ver
                         diagnostico-ia/.env.example). La lista de modelos
                         disponibles cambia con el tiempo: verificar en
                         https://console.groq.com/docs/models
  LLM_TIMEOUT_SEGUNDOS   (opcional, default 60)
  LLM_MAX_TOKENS         (opcional, default 1500)

`consultar()` acepta un parametro `cliente` para poder inyectar un cliente
falso en las pruebas (evita llamadas reales a la API). Ver
pruebas/test_llm_client.py.
"""

from __future__ import annotations

import os


class ErrorLLM(Exception):
    """
    Error amigable para mostrar en la interfaz.

    consultar() nunca deja escapar un traceback crudo: cualquier problema
    (falta de API key, limite de solicitudes, timeout, error de red, error
    inesperado) se convierte en un ErrorLLM con un mensaje entendible para
    alguien sin rol de operaciones.
    """


def _leer_entero_env(nombre: str, valor_por_defecto: int) -> int:
    valor = os.environ.get(nombre, "").strip()
    if not valor:
        return valor_por_defecto
    try:
        return int(valor)
    except ValueError:
        return valor_por_defecto


def _crear_cliente():
    """Crea el cliente real de Groq. Separado para poder mockearlo en pruebas."""
    import groq  # import diferido: quien solo usa redactor/validador no lo necesita

    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ErrorLLM(
            "Falta la variable de entorno GROQ_API_KEY. Copia "
            "diagnostico-ia/.env.example a .env y completa tu API key "
            "(nunca la escribas directamente en el codigo)."
        )
    timeout = _leer_entero_env("LLM_TIMEOUT_SEGUNDOS", 60)
    return groq.Groq(api_key=api_key, timeout=float(timeout))


def _extraer_texto(respuesta) -> str:
    """Devuelve el texto del primer choice de la respuesta del SDK de Groq."""
    if not respuesta.choices:
        return ""
    contenido = respuesta.choices[0].message.content
    return (contenido or "").strip()


def consultar(prompt_sistema: str, prompt_usuario: str, *, cliente=None) -> str:
    """
    Envia una consulta al modelo y devuelve su respuesta como texto plano.

    `cliente`: opcional, para pruebas. Debe exponer
    `.chat.completions.create(...)` con la misma firma que
    `groq.Groq().chat.completions`. Si no se pasa, se crea el cliente real
    usando las variables de entorno.
    """
    import groq  # se necesita para las clases de excepcion

    modelo = os.environ.get("MODEL_NAME", "").strip()
    if not modelo:
        raise ErrorLLM(
            "Falta la variable de entorno MODEL_NAME (ej. 'llama-3.3-70b-versatile'). "
            "Revisa diagnostico-ia/.env.example."
        )
    max_tokens = _leer_entero_env("LLM_MAX_TOKENS", 1500)

    if cliente is None:
        cliente = _crear_cliente()

    try:
        respuesta = cliente.chat.completions.create(
            model=modelo,
            max_tokens=max_tokens,
            temperature=0,
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": prompt_usuario},
            ],
        )
    except groq.AuthenticationError as error:
        raise ErrorLLM(
            "La API key de Groq fue rechazada. Verifica GROQ_API_KEY."
        ) from error
    except groq.RateLimitError as error:
        raise ErrorLLM(
            "Se alcanzo el limite de solicitudes gratuitas de Groq. "
            "Espera un momento y vuelve a intentar."
        ) from error
    except groq.APITimeoutError as error:
        raise ErrorLLM(
            "El modelo tardo demasiado en responder (timeout). Vuelve a intentar."
        ) from error
    except groq.APIConnectionError as error:
        raise ErrorLLM(
            "No se pudo conectar con la API de Groq. Revisa tu conexion a internet."
        ) from error
    except groq.APIStatusError as error:
        raise ErrorLLM(
            f"La API de Groq devolvio un error ({error.status_code}). "
            "Si el modelo configurado en MODEL_NAME ya no existe, revisa "
            "https://console.groq.com/docs/models y actualiza el .env."
        ) from error
    except ErrorLLM:
        raise
    except Exception as error:  # ultima red de seguridad: nunca un traceback en la UI
        raise ErrorLLM(f"Error inesperado al consultar el modelo: {error}") from error

    return _extraer_texto(respuesta)
