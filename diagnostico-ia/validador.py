"""
Validacion de entrada y de salida del asistente de diagnostico.

- `validar_entrada`: revisa el log que pega el usuario ANTES de llamar al
  modelo (log vacio, log demasiado largo).
- `validar_salida`: revisa el JSON que devuelve el modelo DESPUES de la
  llamada (formato, enums del catalogo, coherencia interna, evidencia citada
  literalmente, ninguna accion prohibida, y que no reproduzca secretos).

Ambas funciones devuelven un reporte con cada chequeo realizado (nombre,
si paso o no, y un detalle) para poder mostrarlo en la interfaz y guardarlo
en los resultados de las pruebas.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field

import catalogo
import redactor

# Longitud maxima por defecto del log antes de recortarlo. Configurable por
# quien llama a validar_entrada (por ejemplo, para las pruebas).
# 10_000 y no mas: con el prompt v2 (plantilla ~5400 caracteres) y logs reales
# de GitHub Actions (muy densos en tokens por los timestamps), un log de
# ~20_000 caracteres ya pedia ~9800 tokens y superaba el limite gratuito de
# Groq de 8000 TPM (verificado contra la API real con openai/gpt-oss-120b).
MAX_CARACTERES_POR_DEFECTO = 10_000

MARCA_RECORTE = "\n\n[... LOG RECORTADO: se omitio la parte central por longitud ...]\n\n"

# Campos obligatorios del JSON que debe devolver el modelo (ver prompts/v2.txt).
CAMPOS_REQUERIDOS = (
    "estado",
    "etapa",
    "categoria_causa",
    "causa_probable",
    "evidencia",
    "severidad",
    "acciones_sugeridas",
    "reintento_seguro",
    "confianza",
    "informacion_faltante",
    "fuera_de_alcance",
)

# Un valor que nunca puede coincidir con un dato real, para distinguir
# "el campo no existe" de "el campo existe y vale None/False/etc.".
_FALTANTE = object()


@dataclass
class ResultadoEntrada:
    """Resultado de validar el log pegado por el usuario."""

    valido: bool
    texto: str
    fue_recortado: bool
    mensaje: str


@dataclass
class Chequeo:
    """Un chequeo individual dentro del reporte de validacion de salida."""

    nombre: str
    paso: bool
    detalle: str


@dataclass
class ResultadoSalida:
    """Resultado de validar el JSON devuelto por el modelo."""

    valido: bool
    datos: dict | None
    chequeos: list[Chequeo] = field(default_factory=list)


def validar_entrada(
    texto: str, max_caracteres: int = MAX_CARACTERES_POR_DEFECTO
) -> ResultadoEntrada:
    """
    Valida el log antes de enviarlo al modelo.

    - Vacio o solo espacios -> invalido, no se llama a la API.
    - Mas largo que `max_caracteres` -> se recorta conservando el inicio y
      el final (donde suele estar el error real), avisando en el mensaje.
    - Un log corto pero no vacio SI se envia: es el modelo el que debe
      responder INDETERMINADO si no hay evidencia suficiente.
    """
    if not texto or not texto.strip():
        return ResultadoEntrada(
            valido=False,
            texto="",
            fue_recortado=False,
            mensaje="El log esta vacio. Pega o carga un log antes de diagnosticar.",
        )

    if len(texto) <= max_caracteres:
        return ResultadoEntrada(valido=True, texto=texto, fue_recortado=False, mensaje="")

    disponible = max(max_caracteres - len(MARCA_RECORTE), 0)
    mitad = disponible // 2
    texto_recortado = texto[:mitad] + MARCA_RECORTE + texto[-mitad:] if mitad else MARCA_RECORTE
    mensaje = (
        f"El log tenia {len(texto)} caracteres y se recorto a ~{max_caracteres} "
        "(se conservo el inicio y el final)."
    )
    return ResultadoEntrada(
        valido=True, texto=texto_recortado, fue_recortado=True, mensaje=mensaje
    )


def _normalizar_espacios(texto: str) -> str:
    """Colapsa cualquier corrida de espacios/tabs/saltos de linea en uno solo."""
    return re.sub(r"\s+", " ", texto).strip()


def _quitar_acentos(texto: str) -> str:
    """Quita tildes/diacriticos para comparar texto sin importar acentos."""
    descompuesto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")


def _tipo_valido(valor: object, tipo: type) -> bool:
    return valor is not _FALTANTE and isinstance(valor, tipo)


def _lista_de_str(valor: object) -> bool:
    return (
        valor is not _FALTANTE
        and isinstance(valor, list)
        and all(isinstance(item, str) for item in valor)
    )


def validar_salida(texto_json: str, log_redactado: str) -> ResultadoSalida:
    """
    Valida la respuesta cruda del modelo (debe ser un JSON, sin texto alrededor).

    `log_redactado` es el log YA pasado por `redactor.redactar()` que se le
    envio al modelo: se usa para comprobar que cada fragmento de "evidencia"
    aparece literalmente ahi.
    """
    chequeos: list[Chequeo] = []

    # 1) El texto debe ser JSON valido. Si no lo es, no se puede seguir.
    try:
        datos = json.loads(texto_json)
    except (json.JSONDecodeError, TypeError) as error:
        chequeos.append(Chequeo("json_valido", False, f"No es JSON valido: {error}"))
        return ResultadoSalida(valido=False, datos=None, chequeos=chequeos)

    if not isinstance(datos, dict):
        chequeos.append(
            Chequeo("json_valido", False, f"Se esperaba un objeto JSON, se recibio {type(datos).__name__}")
        )
        return ResultadoSalida(valido=False, datos=None, chequeos=chequeos)

    chequeos.append(Chequeo("json_valido", True, "El texto es un objeto JSON valido"))

    # 2) Deben estar todos los campos del esquema.
    faltantes = [campo for campo in CAMPOS_REQUERIDOS if campo not in datos]
    chequeos.append(
        Chequeo(
            "campos_completos",
            not faltantes,
            "Todos los campos presentes" if not faltantes else f"Faltan campos: {faltantes}",
        )
    )

    def obtener(campo: str) -> object:
        return datos.get(campo, _FALTANTE)

    # 3) Tipos basicos correctos.
    tipos_ok = (
        _tipo_valido(obtener("estado"), str)
        and _tipo_valido(obtener("etapa"), str)
        and _tipo_valido(obtener("categoria_causa"), str)
        and _tipo_valido(obtener("causa_probable"), str)
        and _lista_de_str(obtener("evidencia"))
        and _tipo_valido(obtener("severidad"), str)
        and _lista_de_str(obtener("acciones_sugeridas"))
        and (obtener("reintento_seguro") is None or isinstance(obtener("reintento_seguro"), bool))
        and _tipo_valido(obtener("confianza"), str)
        and _lista_de_str(obtener("informacion_faltante"))
        and isinstance(obtener("fuera_de_alcance"), bool)
    )
    chequeos.append(
        Chequeo("tipos_correctos", tipos_ok, "OK" if tipos_ok else "Algun campo tiene un tipo inesperado")
    )

    # 4) Los valores de tipo "enum" deben estar en el catalogo.
    estado = obtener("estado")
    etapa = obtener("etapa")
    categoria = obtener("categoria_causa")
    severidad = obtener("severidad")
    confianza = obtener("confianza")

    enums_ok = (
        estado in catalogo.ESTADOS
        and etapa in catalogo.ETAPAS
        and categoria in catalogo.CATEGORIAS_CAUSA
        and severidad in catalogo.SEVERIDAD
        and confianza in catalogo.CONFIANZA
    )
    detalle_enums = []
    if estado not in catalogo.ESTADOS:
        detalle_enums.append(f"estado={estado!r} no esta en {catalogo.ESTADOS}")
    if etapa not in catalogo.ETAPAS:
        detalle_enums.append(f"etapa={etapa!r} no esta en el catalogo de etapas")
    if categoria not in catalogo.CATEGORIAS_CAUSA:
        detalle_enums.append(f"categoria_causa={categoria!r} no esta en el catalogo")
    if severidad not in catalogo.SEVERIDAD:
        detalle_enums.append(f"severidad={severidad!r} no esta en {catalogo.SEVERIDAD}")
    if confianza not in catalogo.CONFIANZA:
        detalle_enums.append(f"confianza={confianza!r} no esta en {catalogo.CONFIANZA}")
    chequeos.append(Chequeo("enums_validos", enums_ok, "OK" if enums_ok else "; ".join(detalle_enums)))

    # 5) Coherencia: si estado=SIN_FALLO, la etapa tambien debe ser SIN_FALLO.
    if estado == "SIN_FALLO":
        ok = etapa == "SIN_FALLO"
        chequeos.append(
            Chequeo(
                "coherencia_sin_fallo",
                ok,
                "OK" if ok else f"estado=SIN_FALLO pero etapa={etapa!r} (deberia ser SIN_FALLO)",
            )
        )
    else:
        chequeos.append(Chequeo("coherencia_sin_fallo", True, "No aplica (estado != SIN_FALLO)"))

    # 6) Coherencia: si estado=INDETERMINADO, informacion_faltante no puede
    #    estar vacia (el modelo debe decir QUE le falto para decidir).
    if estado == "INDETERMINADO":
        info_faltante = obtener("informacion_faltante")
        ok = isinstance(info_faltante, list) and len(info_faltante) > 0
        chequeos.append(
            Chequeo(
                "coherencia_indeterminado",
                ok,
                "OK" if ok else "estado=INDETERMINADO pero informacion_faltante esta vacia",
            )
        )
    else:
        chequeos.append(
            Chequeo("coherencia_indeterminado", True, "No aplica (estado != INDETERMINADO)")
        )

    # 7) Cada fragmento de evidencia debe citarse literalmente del log
    #    (normalizando espacios en blanco).
    evidencia = obtener("evidencia")
    if _lista_de_str(evidencia):
        log_normalizado = _normalizar_espacios(log_redactado)
        no_encontrados = [
            fragmento
            for fragmento in evidencia
            if _normalizar_espacios(fragmento) not in log_normalizado
        ]
        ok = not no_encontrados
        chequeos.append(
            Chequeo(
                "evidencia_literal",
                ok,
                "Toda la evidencia aparece en el log"
                if ok
                else f"No se encontraron en el log: {no_encontrados}",
            )
        )
    else:
        chequeos.append(
            Chequeo("evidencia_literal", False, "El campo evidencia no es una lista de texto")
        )

    # 8) Ninguna accion sugerida puede recomendar debilitar el pipeline.
    acciones = obtener("acciones_sugeridas")
    if _lista_de_str(acciones):
        encontradas = []
        for accion in acciones:
            normalizada = _quitar_acentos(accion).lower()
            for patron in catalogo.ACCIONES_PROHIBIDAS:
                if patron in normalizada:
                    encontradas.append((accion, patron))
        ok = not encontradas
        chequeos.append(
            Chequeo(
                "sin_acciones_prohibidas",
                ok,
                "Ninguna accion prohibida" if ok else f"Acciones problematicas: {encontradas}",
            )
        )
    else:
        chequeos.append(
            Chequeo("sin_acciones_prohibidas", False, "El campo acciones_sugeridas no es una lista de texto")
        )

    # 9) La respuesta del modelo, pasada de nuevo por el redactor, no debe
    #    cambiar: si cambia, es que el modelo reprodujo un secreto.
    _texto_re_redactado, conteo = redactor.redactar(texto_json)
    ok = not conteo
    chequeos.append(
        Chequeo(
            "sin_secretos_en_la_respuesta",
            ok,
            "OK" if ok else f"El redactor encontro posibles secretos en la respuesta: {conteo}",
        )
    )

    valido = all(c.paso for c in chequeos)
    return ResultadoSalida(valido=valido, datos=datos, chequeos=chequeos)
