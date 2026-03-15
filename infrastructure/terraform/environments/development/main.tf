terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Development uses docker-compose, not cloud infra.
# This file is a placeholder for local resource management.

variable "version" { default = "latest" }

output "environment" {
  value = "development — use docker-compose up -d"
}
