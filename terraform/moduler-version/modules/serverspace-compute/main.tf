resource "serverspace_server" "api_node" {
  name             = var.server_name
  location         = var.location
  image            = "Ubuntu-25.10-X64"
  cpu              = var.cpu
  ram              = var.ram
  ssh_keys         = [var.ssh_key_id]
  boot_volume_size = 25600

  nic {
    network      = ""
    network_type = "PublicShared"
    bandwidth    = 50
  }

  nic {
    network      = var.isolated_network_id
    network_type = "Isolated"
    bandwidth    = 0
  }


}