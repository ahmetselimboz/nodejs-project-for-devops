output "public_ip" {
  value       = serverspace_server.api_node.public_ip_addresses[0]
  description = "Sunucunun Public IP Adresi"
}