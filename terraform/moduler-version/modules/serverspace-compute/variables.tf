variable "server_name" {
  type        = string
  description = "Sunucunun adi"
}

variable "location" {
  type        = string
  default     = "ca"
}

variable "cpu" {
  type        = number
  default     = 1
}

variable "ram" {
  type        = number
  default     = 1024
}

variable "ssh_key_id" {
  type        = string
  description = "Serverspace uzerindeki SSH key ID'si"
}

variable "isolated_network_id" {
  type        = string
  description = "Izole agin (isolated network) ID'si"
}

variable "ssh_private_key_path" {
  type        = string
  sensitive   = true
  description = "Sunucuya SSH baglantisi kurmak ve provisioner calistirmak icin kullanilacak private key dosya yolu"
}