"""
Catalogo de constantes del asistente de diagnostico de NovaMarket.

Estas listas son la UNICA fuente de verdad para:
  - construir el prompt que se envia al modelo (FASE 2, prompts/v2.txt),
  - validar que la respuesta del modelo use valores permitidos (validador.py),
  - pintar los badges de la interfaz (FASE 3, app.py).

Las etapas reflejan el pipeline real de NovaMarket
(.github/workflows/ci-cd.yml) MAS las etapas que ocurren despues, cuando
Actions ya termino en verde pero el despliegue real falla en Render
(docker-entrypoint.sh: "prisma migrate deploy" -> "next start" -> healthcheck).
"""

# Etapa donde ocurrio (o no) el fallo. La clave es el valor que debe usar el
# modelo en el campo "etapa"; el valor es una descripcion para humanos.
ETAPAS = {
    "LINT": "Job test-and-quality, paso 'Lint' (npm run lint)",
    "TEST": "Job test-and-quality, paso 'Pruebas + cobertura' (npm run test:coverage)",
    "QUALITY_GATE": "Job test-and-quality, paso 'Analisis SonarCloud'",
    "BUILD_IMAGE": "Job build-and-push, paso 'Build y push (latest + SHA del commit)'",
    "IMAGE_VERIFY": "Job build-and-push, paso 'Verificar la imagen publicada'",
    "TERRAFORM": "Job deploy-infra, pasos 'terraform init' / 'terraform apply'",
    "RENDER_DEPLOY": "Job deploy-infra, paso 'Desplegar la imagen del commit en Render'",
    "MIGRATION": "Render ejecutando docker-entrypoint.sh: 'prisma migrate deploy'",
    "HEALTHCHECK": "Render: arranque de 'next start' o el healthcheck /api/health",
    "SIN_FALLO": "El log no muestra ningun fallo",
    "INDETERMINADO": "No hay evidencia suficiente en el log para identificar la etapa",
}

# Categoria de la causa raiz del fallo.
CATEGORIAS_CAUSA = {
    "CODIGO": "Error en el codigo de la aplicacion (TypeScript, tests, etc.)",
    "CONFIGURACION": "Configuracion incorrecta (variables de entorno, YAML, Terraform, etc.)",
    "INFRAESTRUCTURA": "Problema del proveedor de infraestructura (Render, Docker Hub, GitHub Actions)",
    "DEPENDENCIA_EXTERNA": "Fallo de un servicio externo (registro npm, SonarCloud, red)",
    "DESCONOCIDA": "No se puede determinar la categoria con la evidencia disponible",
}

# Severidad del fallo para el equipo.
SEVERIDAD = ("BAJA", "MEDIA", "ALTA", "CRITICA")

# Confianza del modelo en su propio diagnostico.
CONFIANZA = ("BAJA", "MEDIA", "ALTA")

# Estados posibles del diagnostico completo (campo "estado" del JSON).
ESTADOS = ("FALLO", "SIN_FALLO", "INDETERMINADO")

# Fragmentos (en minusculas, sin acentos) que NUNCA deben aparecer dentro de
# una accion sugerida. El asistente es asesor, no compuerta: jamas puede
# recomendar debilitar los controles de calidad del pipeline.
# Lista configurable: agregar aqui nuevos patrones si aparecen mas casos.
ACCIONES_PROHIBIDAS = (
    "saltar",
    "saltarse",
    "omitir",
    "sin pruebas",
    "sin tests",
    "sin validar",
    "sin revisar",
    "no validar",
    "no revisar",
    "desactivar eslint",
    "deshabilitar eslint",
    "desactivar sonarcloud",
    "deshabilitar sonarcloud",
    "desactivar el quality gate",
    "deshabilitar el quality gate",
    "desactivar el pipeline",
    "ignorar las pruebas",
    "ignorar los tests",
    "ignorar el lint",
    "ignorar sonarcloud",
    "ignorar el quality gate",
    "--no-verify",
    "no-verify",
    "force push",
    "push --force",
    "desplegar sin",
)
