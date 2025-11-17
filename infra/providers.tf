terraform {
  required_version = ">= 1.6.0"

  backend "s3" {
    bucket         = "sipstr-terraform-state-bucket"
    key            = "sipstr-vendor/state/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
  
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
