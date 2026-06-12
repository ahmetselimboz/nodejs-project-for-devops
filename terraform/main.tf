# 2. Node.js API ve İzleme Araçlarının (Grafana/Loki) çalışacağı sunucu
resource "serverspace_server" "api_node" {
  name     = var.server_name
  image    = "Ubuntu-25.10-X64"
  location = var.region
  
  cpu      = 1    # Node.js ve monitoring için başlangıçta yeterli [4]
  ram      = 1024 # 1GB RAM
  boot_volume_size = 25600 # 25GB Disk alanı

  # Oluşturduğumuz SSH anahtarını bu sunucuya bağlıyoruz
   ssh_keys = [
    resource.serverspace_ssh.terraform.id,
  ]

  nic {
    network = ""
    network_type = "PublicShared"
    bandwidth = 50
  }
  nic {
    network = serverspace_isolated_network.terraform_net.id
    network_type = "Isolated"
    bandwidth = 0
  }

  connection {
    host = self.public_ip_addresses[0]
    user = "root"
    type = "ssh"
    private_key = file(var.ssh_key_path)
    timeout = "2m"
  }

  provisioner "remote-exec" {
    inline = [
      "export PATH=$PATH:/usr/bin",
      "sudo apt-get update",
      "sudo apt-get install -y redis-server",
      "exit 0"
    ]
  }

}

resource "serverspace_isolated_network" "terraform_net" {
  location = var.region
  name = "terraform_net"
  description = "Example for Terraform"
  network_prefix = "192.168.0.0"
  mask = 24
}

output "server_public_ip" {
  value       = serverspace_server.api_node.public_ip_addresses[0]
  description = "Sunucunun Public IP Adresi"
}
