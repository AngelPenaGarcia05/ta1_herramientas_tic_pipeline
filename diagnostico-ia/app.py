"""
Interfaz Streamlit del asistente de diagnostico de NovaMarket.

Flujo: el usuario pega o carga un log -> `orquestador.diagnosticar()` hace
todo el trabajo (validar, redactar, armar el prompt, llamar al modelo,
validar la respuesta) -> aqui solo se muestra el resultado.

Nunca se imprime la API key ni un traceback crudo: cualquier error se pasa
por `redactor.redactar()` antes de mostrarse (defensa extra, aunque
llm_client.py ya evita incluir la key en sus mensajes).
"""

from __future__ import annotations

import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

import casos_utils
import catalogo
import redactor
from orquestador import diagnosticar

CARPETA = Path(__file__).resolve().parent
CARPETA_CASOS = CARPETA / "casos"

AVISO_FIJO = (
    "Diagnostico orientativo generado por IA. Verifica la evidencia contra el log. "
    "El pipeline se bloquea por sus propias reglas, no por este asistente."
)

COLOR_SEVERIDAD = {
    "BAJA": "#0d6efd",
    "MEDIA": "#fd7e14",
    "ALTA": "#dc3545",
    "CRITICA": "#7d0a0a",
}
COLOR_CONFIANZA = {"BAJA": "#6c757d", "MEDIA": "#fd7e14", "ALTA": "#198754"}


# ---------- configuracion (API key / modelo) ----------


def _secreto(nombre: str) -> str | None:
    """Lee st.secrets sin reventar si no existe ningun secrets.toml."""
    try:
        valor = st.secrets.get(nombre)  # type: ignore[union-attr]
    except Exception:
        return None
    return str(valor) if valor else None


def _preparar_variables_de_entorno() -> None:
    """
    Deja GROQ_API_KEY / MODEL_NAME / etc. en os.environ, que es lo que lee
    llm_client.py. Prioridad: variable de entorno ya seteada > .env local >
    st.secrets (util para Streamlit Cloud). Nunca se imprime ningun valor.
    """
    load_dotenv(CARPETA / ".env")
    for nombre in ("GROQ_API_KEY", "MODEL_NAME", "LLM_TIMEOUT_SEGUNDOS", "LLM_MAX_TOKENS"):
        if not os.environ.get(nombre):
            valor = _secreto(nombre)
            if valor:
                os.environ[nombre] = valor


# ---------- casos de ejemplo (FASE 4 los llena; los que siguen PENDIENTE se omiten) ----------


def _cargar_casos_de_ejemplo() -> list[dict]:
    """Casos con un log real ya cargado (no PENDIENTE), listos para mostrar."""
    return [c for c in casos_utils.cargar_casos(CARPETA_CASOS) if not c["pendiente"]]


def _al_elegir_caso() -> None:
    id_elegido = st.session_state.get("caso_elegido")
    if not id_elegido or id_elegido == "(ninguno)":
        return
    for caso in st.session_state.get("_casos_disponibles", []):
        if caso["id"] == id_elegido:
            st.session_state["log_texto"] = caso["log"]
            return


# ---------- render del resultado ----------


def _badge(texto: str, color: str) -> str:
    return (
        f'<span style="background-color:{color};color:white;padding:2px 10px;'
        f'border-radius:12px;font-size:0.85em;font-weight:600;margin-right:6px;">'
        f"{texto}</span>"
    )


def _mostrar_reporte_de_validacion(validacion) -> None:
    with st.expander("Ver reporte de validacion"):
        for chequeo in validacion.chequeos:
            icono = "✅" if chequeo.paso else "❌"
            st.markdown(f"{icono} **{chequeo.nombre}** — {chequeo.detalle}")


def _mostrar_diagnostico(datos: dict, generado_localmente: bool) -> None:
    if generado_localmente:
        st.warning(
            "El modelo no devolvio un formato valido ni siquiera tras un reintento. "
            "Este diagnostico NO lo genero la IA: se construyo localmente como "
            "resultado INDETERMINADO de respaldo."
        )

    if datos.get("fuera_de_alcance"):
        st.info("El asistente considera que el contenido pegado no es un log de CI/CD.")

    badges = _badge(f"Severidad: {datos['severidad']}", COLOR_SEVERIDAD.get(datos["severidad"], "#6c757d"))
    badges += _badge(f"Confianza: {datos['confianza']}", COLOR_CONFIANZA.get(datos["confianza"], "#6c757d"))
    st.markdown(badges, unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)
    col1.metric("Estado", datos["estado"])
    col2.metric("Etapa", datos["etapa"], help=catalogo.ETAPAS.get(datos["etapa"], ""))
    col3.metric("Categoria", datos["categoria_causa"], help=catalogo.CATEGORIAS_CAUSA.get(datos["categoria_causa"], ""))

    st.markdown("**Causa probable**")
    st.write(datos["causa_probable"])

    if datos["evidencia"]:
        st.markdown("**Evidencia citada del log**")
        for fragmento in datos["evidencia"]:
            st.code(fragmento, language=None)

    if datos["acciones_sugeridas"]:
        st.markdown("**Acciones sugeridas**")
        for accion in datos["acciones_sugeridas"]:
            st.markdown(f"- {accion}")

    reintento = datos.get("reintento_seguro")
    texto_reintento = "Si" if reintento is True else "No" if reintento is False else "No aplica / no se sabe"
    st.markdown(f"**¿Reintentar es seguro?** {texto_reintento}")

    if datos["informacion_faltante"]:
        st.markdown("**Informacion que le faltó al asistente**")
        for item in datos["informacion_faltante"]:
            st.markdown(f"- {item}")


# ---------- app ----------


def main() -> None:
    st.set_page_config(page_title="Diagnostico CI/CD - NovaMarket", page_icon="🔎", layout="wide")
    _preparar_variables_de_entorno()

    st.title("🔎 Asistente de diagnostico del pipeline CI/CD")
    st.caption(
        "Prototipo academico para NovaMarket. Pega o carga el log de una ejecucion "
        "fallida de GitHub Actions o del deploy en Render."
    )
    st.info(AVISO_FIJO, icon="ℹ️")

    with st.sidebar:
        st.header("Configuracion")
        version_prompt = st.radio(
            "Version del prompt",
            options=["v2", "v1"],
            index=0,
            format_func=lambda v: "v2 - con esquema y restricciones" if v == "v2" else "v1 - linea base simple",
            help="v1 es una linea base deliberadamente simple, sin catalogo ni esquema; "
            "se usa para comparar y documentar sus limitaciones.",
        )

        st.divider()
        st.subheader("Casos de ejemplo")
        casos = _cargar_casos_de_ejemplo()
        st.session_state["_casos_disponibles"] = casos
        if casos:
            opciones = ["(ninguno)"] + [c["id"] for c in casos]
            descripciones = {c["id"]: c.get("descripcion", "") for c in casos}
            st.selectbox(
                "Cargar un log de ejemplo",
                options=opciones,
                key="caso_elegido",
                format_func=lambda id_: "(ninguno)" if id_ == "(ninguno)" else f"{id_} - {descripciones[id_]}",
                on_change=_al_elegir_caso,
            )
        else:
            st.caption("Aun no hay casos de ejemplo cargados (se agregan en FASE 4).")

    st.subheader("1. Log a diagnosticar")
    st.text_area(
        "Pega el log aqui",
        key="log_texto",
        height=280,
        placeholder="Pega el log del job de GitHub Actions o del deploy de Render...",
    )
    archivo = st.file_uploader("...o carga un archivo .txt / .log", type=["txt", "log"])
    diagnosticar_click = st.button("Diagnosticar", type="primary")

    if not diagnosticar_click:
        return

    if archivo is not None:
        log_original = archivo.getvalue().decode("utf-8", errors="replace")
    else:
        log_original = st.session_state.get("log_texto", "")

    st.subheader("2. Resultado")

    try:
        with st.spinner("Consultando al modelo..."):
            resultado = diagnosticar(log_original, version_prompt=version_prompt)
    except Exception as error:  # ultima red de seguridad: nunca un traceback en la UI
        mensaje_seguro, _ = redactor.redactar(str(error))
        st.error(f"Ocurrio un error inesperado: {mensaje_seguro}")
        return

    if resultado.error is not None:
        st.error(resultado.error)
        return

    if resultado.fue_recortado_el_log:
        st.warning("El log era muy largo: se recorto conservando el inicio y el final.")

    with st.expander(
        f"Log enviado al modelo (ya redactado — {sum(resultado.conteo_secretos.values())} secreto(s) ocultado(s))"
    ):
        if resultado.conteo_secretos:
            resumen = ", ".join(f"{tipo} x{cantidad}" for tipo, cantidad in resultado.conteo_secretos.items())
            st.caption(f"Se redactaron: {resumen}")
        else:
            st.caption("No se detecto ningun secreto en el log.")
        st.code(resultado.log_redactado, language=None)

    if resultado.validacion is None or resultado.validacion.datos is None:
        st.error("El modelo no devolvio una respuesta utilizable.")
        return

    _mostrar_diagnostico(resultado.validacion.datos, resultado.generado_localmente)
    _mostrar_reporte_de_validacion(resultado.validacion)

    with st.expander("Ver JSON crudo"):
        st.json(resultado.validacion.datos)

    st.caption(AVISO_FIJO)


if __name__ == "__main__":
    main()
