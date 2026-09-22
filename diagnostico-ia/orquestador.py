"""
Orquesta el flujo completo de un diagnostico: valida el log de entrada, lo
redacta, arma el prompt (v1 o v2), llama al modelo y, si es v2, valida la
respuesta con UN reintento y una salida INDETERMINADO generada localmente
como ultimo recurso.

Este modulo es el UNICO punto de entrada que deberian usar app.py (FASE 3) y
pruebas/ejecutar_casos.py (FASE 4): asi la logica de reintento no se duplica
en los dos lugares.

v1 es la linea base deliberadamente simple (sin esquema): se llama una sola
vez y su respuesta se guarda tal cual, como texto libre. No tiene sentido
"reintentar" contra un formato que nunca se le pidio.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import llm_client
import redactor
import validador

CARPETA_PROMPTS = Path(__file__).resolve().parent / "prompts"
MARCA_LOG = "__LOG_AQUI__"

PROMPT_SISTEMA_V1 = "Eres un asistente que ayuda a depurar pipelines de CI/CD."
PROMPT_SISTEMA_V2 = (
    "Eres un asistente de diagnostico de pipelines CI/CD. Respondes "
    "EXCLUSIVAMENTE con un objeto JSON, sin texto antes ni despues, sin "
    "bloques de codigo markdown."
)

VERSIONES_VALIDAS = ("v1", "v2")


@dataclass
class ResultadoDiagnostico:
    """Todo lo que produjo un diagnostico, para mostrarlo o guardarlo."""

    version_prompt: str
    log_redactado: str
    conteo_secretos: dict
    respuesta_cruda: str
    validacion: validador.ResultadoSalida | None
    intentos: int
    generado_localmente: bool
    error: str | None = None
    fue_recortado_el_log: bool = False


def _cargar_prompt(version: str) -> str:
    ruta = CARPETA_PROMPTS / f"{version}.txt"
    return ruta.read_text(encoding="utf-8")


def _armar_prompt(version: str, log_redactado: str) -> str:
    plantilla = _cargar_prompt(version)
    if version == "v2":
        # El log podria contener literalmente las etiquetas delimitadoras;
        # se escapan para que no se puedan "cerrar" antes de tiempo.
        log_redactado = log_redactado.replace("<log_ci>", "&lt;log_ci&gt;").replace(
            "</log_ci>", "&lt;/log_ci&gt;"
        )
    return plantilla.replace(MARCA_LOG, log_redactado)


def _indeterminado_local(motivo: str) -> dict:
    """Diagnostico INDETERMINADO generado en Python, sin volver a llamar al modelo."""
    return {
        "estado": "INDETERMINADO",
        "etapa": "INDETERMINADO",
        "categoria_causa": "DESCONOCIDA",
        "causa_probable": "El asistente no pudo generar un diagnostico con formato valido.",
        "evidencia": [],
        "severidad": "BAJA",
        "acciones_sugeridas": [
            "Revisar el log manualmente: el asistente de IA no pudo procesarlo."
        ],
        "reintento_seguro": None,
        "confianza": "BAJA",
        "informacion_faltante": [motivo],
        "fuera_de_alcance": False,
        "generado_localmente": True,
    }


def _prompt_reintento(prompt_original: str, validacion: validador.ResultadoSalida) -> str:
    errores = "; ".join(f"{c.nombre}: {c.detalle}" for c in validacion.chequeos if not c.paso)
    return (
        prompt_original
        + "\n\nTu respuesta anterior no cumplio el formato requerido. "
        + f"Errores encontrados: {errores}. "
        + "Responde de nuevo, EXCLUSIVAMENTE con el objeto JSON, corrigiendo esos errores."
    )


def diagnosticar(
    log_original: str,
    version_prompt: str = "v2",
    *,
    cliente=None,
    max_caracteres_log: int = validador.MAX_CARACTERES_POR_DEFECTO,
) -> ResultadoDiagnostico:
    """Ejecuta el flujo completo: validar entrada -> redactar -> prompt -> modelo -> validar salida."""
    if version_prompt not in VERSIONES_VALIDAS:
        raise ValueError(f"Version de prompt desconocida: {version_prompt!r}")

    entrada = validador.validar_entrada(log_original, max_caracteres_log)
    if not entrada.valido:
        return ResultadoDiagnostico(
            version_prompt=version_prompt,
            log_redactado="",
            conteo_secretos={},
            respuesta_cruda="",
            validacion=None,
            intentos=0,
            generado_localmente=False,
            error=entrada.mensaje,
        )

    log_redactado, conteo_secretos = redactor.redactar(entrada.texto)
    prompt_sistema = PROMPT_SISTEMA_V1 if version_prompt == "v1" else PROMPT_SISTEMA_V2
    prompt_usuario = _armar_prompt(version_prompt, log_redactado)

    def _llamar(texto_prompt: str) -> tuple[str | None, str | None]:
        """Devuelve (respuesta, error). Nunca deja escapar un traceback."""
        try:
            return llm_client.consultar(prompt_sistema, texto_prompt, cliente=cliente), None
        except llm_client.ErrorLLM as error:
            return None, str(error)

    respuesta, error = _llamar(prompt_usuario)
    if error is not None:
        return ResultadoDiagnostico(
            version_prompt=version_prompt,
            log_redactado=log_redactado,
            conteo_secretos=conteo_secretos,
            respuesta_cruda="",
            validacion=None,
            intentos=1,
            generado_localmente=False,
            error=error,
            fue_recortado_el_log=entrada.fue_recortado,
        )

    # v1 es texto libre: se guarda tal cual, sin reintentos (no tiene un
    # esquema que "corregir"). validar_salida igual se corre para poder
    # reportar formato_valido=false cuando corresponda (ver ejecutar_casos.py).
    if version_prompt == "v1":
        validacion = validador.validar_salida(respuesta, log_redactado)
        return ResultadoDiagnostico(
            version_prompt="v1",
            log_redactado=log_redactado,
            conteo_secretos=conteo_secretos,
            respuesta_cruda=respuesta,
            validacion=validacion,
            intentos=1,
            generado_localmente=False,
            fue_recortado_el_log=entrada.fue_recortado,
        )

    # v2: valida: si falla, UN reintento indicando el error; si vuelve a
    # fallar, INDETERMINADO generado localmente (marcado como tal).
    validacion = validador.validar_salida(respuesta, log_redactado)
    intentos = 1

    if not validacion.valido:
        respuesta_reintento, error = _llamar(_prompt_reintento(prompt_usuario, validacion))
        intentos = 2
        if error is not None:
            return ResultadoDiagnostico(
                version_prompt="v2",
                log_redactado=log_redactado,
                conteo_secretos=conteo_secretos,
                respuesta_cruda=respuesta,
                validacion=validacion,
                intentos=intentos,
                generado_localmente=False,
                error=error,
                fue_recortado_el_log=entrada.fue_recortado,
            )
        respuesta = respuesta_reintento
        validacion = validador.validar_salida(respuesta, log_redactado)

    if not validacion.valido:
        datos_locales = _indeterminado_local(
            "El modelo no devolvio un JSON valido tras un reintento; "
            "este diagnostico se genero localmente, no con el modelo."
        )
        return ResultadoDiagnostico(
            version_prompt="v2",
            log_redactado=log_redactado,
            conteo_secretos=conteo_secretos,
            respuesta_cruda=respuesta,
            validacion=validador.ResultadoSalida(valido=True, datos=datos_locales, chequeos=[]),
            intentos=intentos,
            generado_localmente=True,
            fue_recortado_el_log=entrada.fue_recortado,
        )

    return ResultadoDiagnostico(
        version_prompt="v2",
        log_redactado=log_redactado,
        conteo_secretos=conteo_secretos,
        respuesta_cruda=respuesta,
        validacion=validacion,
        intentos=intentos,
        generado_localmente=False,
        fue_recortado_el_log=entrada.fue_recortado,
    )
