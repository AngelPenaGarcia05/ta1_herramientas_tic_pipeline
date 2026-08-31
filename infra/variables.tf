# ============================================================
# Variables de la infraestructura NovaMarket
# ============================================================

variable "render_api_key" {
  description = "API key de Render (https://dashboard.render.com/settings/api-keys)"
  type        = string
  sensitive   = true
}

variable "render_owner_id" {
  description = "ID del usuario o equipo dueno de los recursos en Render (usr-xxx o tea-xxx)"
  type        = string
  sensitive   = true
}

variable "dockerhub_username" {
  description = "Usuario de Docker Hub donde se publico la imagen novamarket"
  type        = string
}

variable "image_tag" {
  description = "Tag de la imagen a desplegar (latest o el SHA del commit)"
  type        = string
  default     = "latest"
}

variable "service_name" {
  description = "Nombre base de los servicios en Render"
  type        = string
  default     = "novamarket"
}

variable "region" {
  description = "Region de Render (frankfurt, ohio, oregon, singapore, virginia)"
  type        = string
  default     = "oregon"
}
