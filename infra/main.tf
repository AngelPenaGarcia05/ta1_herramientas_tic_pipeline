# NovaMarket - Infraestructura en Render (Terraform)
#
#   render_postgres    -> base de datos PostgreSQL (plan free)
#   render_web_service -> servicio web con la imagen de Docker Hub (plan free)
#
# La connection string interna de la base se inyecta como variable de
# entorno DATABASE_URL del servicio web.
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    render = {
      source  = "render-oss/render"
      version = "1.8.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}

# AUTH_SECRET generado automaticamente (no hay que gestionarlo a mano).
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

# ---------- Base de datos ----------
resource "render_postgres" "db" {
  name    = "${var.service_name}-db"
  plan    = "free"
  region  = var.region
  version = "16"

  database_name = "novamarket"
  database_user = "novamarket"
}

# ---------- Servicio web (imagen Docker) ----------
resource "render_web_service" "app" {
  name   = var.service_name
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = "docker.io/${var.dockerhub_username}/novamarket"
      # Terraform solo crea el servicio. El deploy de cada version lo hace el
      # pipeline via la API de Render (POST /deploys con imageUrl = :<sha>),
      # porque el provider no puede ACTUALIZAR un web_service en plan free
      # (bug maintenance_mode). Ver .github/workflows/ci-cd.yml -> deploy-infra.
      tag = "latest"
    }
  }

  health_check_path = "/api/health"

  env_vars = {
    # Connection string interna (misma region que la base) -> DATABASE_URL
    DATABASE_URL = {
      value = render_postgres.db.connection_info.internal_connection_string
    }
    AUTH_SECRET = {
      value = random_password.auth_secret.result
    }
    NODE_ENV = {
      value = "production"
    }
    NEXT_PUBLIC_APP_URL = {
      value = "https://${var.service_name}.onrender.com"
    }
  }

  lifecycle {
    # El provider render-oss/render envia `maintenance_mode` en cualquier UPDATE
    # de render_web_service y la API de Render lo rechaza en plan free
    # (issue render-oss/terraform-provider-render#80). Con ignore_changes = all
    # Terraform nunca intenta un update: crea el servicio una vez y no lo toca.
    # Los redeploys los dispara el pipeline por la API de Render.
    ignore_changes = all
  }
}
