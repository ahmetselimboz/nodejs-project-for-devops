resource "serverspace_ssh" "terraform" {
  name = "terraform-key"
  public_key = file(var.ssh_key_path)
}

variable "ssh_key_path" {
  type        = string
  description = "The file path to an ssh public key"
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_private_key_path" {
  type        = string
  sensitive   = true
  description = "The file path to an ssh private key"
  default     = "~/.ssh/id_ed25519"
}

variable "serverspace_token" {
  description = "Serverspace API Token"
  type        = string
  sensitive   = true # Loglarda görünmemesi için gizli işaretliyoruz [3]
}

variable "server_name" {
  default = "nodejs-api-prod"
}

variable "region" {
  default = "ca" 
}

