#!/usr/bin/env bash
#
# run-remote-audit.sh
# -------------------------------------------------------------------
# server-security-audit.sh dosyasini kendi makinenden SSH ile
# sunucuya gonderip orada calistirir ve raporu yerel olarak kaydeder.
#
# Kullanim:
#   ./run-remote-audit.sh <kullanici>@<ip> [ssh-anahtari.pem]
#
# Ornekler:
#   ./run-remote-audit.sh root@45.138.25.195
#   ./run-remote-audit.sh ubuntu@45.138.25.195 ../devops.pem
# -------------------------------------------------------------------
set -euo pipefail

TARGET="${1:-}"
KEY="${2:-}"

if [ -z "$TARGET" ]; then
  echo "Kullanim: $0 <kullanici>@<ip> [ssh-anahtari.pem]" >&2
  echo "Ornek   : $0 root@45.138.25.195 ../devops.pem" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT="$SCRIPT_DIR/server-security-audit.sh"
[ -f "$AUDIT" ] || { echo "server-security-audit.sh bulunamadi: $AUDIT" >&2; exit 1; }

SSH_OPTS=(-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
[ -n "$KEY" ] && SSH_OPTS+=(-i "$KEY")

OUT="$SCRIPT_DIR/audit-${TARGET#*@}-$(date +%F_%H%M).log"

echo ">> $TARGET adresine baglaniliyor ve denetim calistiriliyor..."
# Script'i stdin uzerinden gonderip uzakta sudo ile calistir.
# Renkler log dosyasinda kalmasin diye terminale de ayni anda yaziyoruz.
ssh "${SSH_OPTS[@]}" "$TARGET" 'sudo -n bash -s 2>/dev/null || sudo bash -s' < "$AUDIT" | tee "$OUT"

echo
echo ">> Rapor kaydedildi: $OUT"
