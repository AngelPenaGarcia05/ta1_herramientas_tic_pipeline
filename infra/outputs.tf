# ============================================================
# Salidas de la infraestructura
# ============================================================

output "web_service_url" {
  description = "URL publica del servicio web desplegado en Render"
  value       = render_web_service.app.url
}

output "web_service_id" {
  description = "ID del servicio web en Render"
  value       = render_web_service.app.id
}

output "postgres_id" {
  description = "ID de la base de datos PostgreSQL en Render"
  value       = render_postgres.db.id
}
