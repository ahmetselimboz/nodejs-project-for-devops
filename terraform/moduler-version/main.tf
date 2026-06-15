resource "serverspace_ssh" "terraform" {
  name       = "terraform-key"
  public_key = file(var.ssh_key_path)
}

resource "serverspace_isolated_network" "terraform_net" {
  location       = var.region
  name           = "terraform_net"
  description    = "Example for Terraform"
  network_prefix = "192.168.0.0"
  mask           = 24
}

module "compute_module" {
  source               = "./modules/serverspace-compute"
  server_name          = var.server_name
  location             = var.region
  cpu                  = 1
  ram                  = 1024
  ssh_key_id           = serverspace_ssh.terraform.id
  isolated_network_id  = serverspace_isolated_network.terraform_net.id
  ssh_private_key_path = var.ssh_private_key_path
}

output "server_public_ip" {
  value       = module.compute_module.public_ip
  description = "Sunucunun Public IP Adresi"
}