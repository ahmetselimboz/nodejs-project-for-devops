terraform {
  required_providers {
    serverspace = {
      source  = "itglobalcom/serverspace"
      version = "0.3.2"
    }
  }
}

provider "serverspace" {
  key = var.serverspace_token 
}