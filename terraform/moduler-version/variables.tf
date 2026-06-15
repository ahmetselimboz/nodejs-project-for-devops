variable "serverspace_token" {
  description = "Serverspace API Token"
  type        = string
  sensitive   = true
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

variable "server_name" {
  type        = string
  description = "Sunucunun adi"
  default     = "nodejs-api-prod"
}

variable "region" {
  type        = string
  description = "Sunucunun kurulacagi bolge"
  default     = "ca"
}