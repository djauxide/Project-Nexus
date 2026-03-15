terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
  backend "s3" {
    bucket         = "nexus-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nexus-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "nexus-v4"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

variable "aws_region" { default = "us-east-1" }
variable "version"    { default = "latest" }

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "nexus-production"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
}

# EKS
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "nexus-production"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    control = {
      instance_types = ["c6i.2xlarge"]
      min_size       = 3
      max_size       = 20
      desired_size   = 5
      labels = {
        workload-type  = "control"
        broadcast-tier = "critical"
      }
    }
  }
}

# S3 for recordings
resource "aws_s3_bucket" "recordings" {
  bucket = "nexus-v4-recordings-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "recordings" {
  bucket = aws_s3_bucket.recordings.id
  rule {
    id     = "archive"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
    expiration {
      days = 2555 # 7 years
    }
  }
}

data "aws_caller_identity" "current" {}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "s3_bucket" {
  value = aws_s3_bucket.recordings.bucket
}
