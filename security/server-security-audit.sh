#!/usr/bin/env bash
#
# server-security-audit.sh
# -------------------------------------------------------------------
# Bir Linux sunucusunun guvenlik durumunu denetleyip raporlar.
# SADECE OKUMA yapar; sistemde hicbir degisiklik yapmaz.
#
# Kullanim (sunucunun ICINDE):
#   sudo bash server-security-audit.sh
#
# sudo olmadan da calisir ama bazi bolumler (firewall kurallari,
# fail2ban, bazi log dosyalari) sinirli olur.
# -------------------------------------------------------------------

set -uo pipefail

# ----- Renkler -----------------------------------------------------
if [ -t 1 ]; then
  RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'
  BLU=$'\033[0;34m'; BLD=$'\033[1m'; RST=$'\033[0m'
else
  RED=''; GRN=''; YLW=''; BLU=''; BLD=''; RST=''
fi

PASS=0; WARN=0; FAIL=0

section() { printf '\n%s======================================================================%s\n' "$BLU" "$RST"
            printf '%s  %s%s\n' "$BLD" "$1" "$RST"
            printf '%s======================================================================%s\n' "$BLU" "$RST"; }
ok()   { printf '  %s[ OK ]%s %s\n'   "$GRN" "$RST" "$1"; PASS=$((PASS+1)); }
warn() { printf '  %s[WARN]%s %s\n'   "$YLW" "$RST" "$1"; WARN=$((WARN+1)); }
bad()  { printf '  %s[FAIL]%s %s\n'   "$RED" "$RST" "$1"; FAIL=$((FAIL+1)); }
info() { printf '  %s[info]%s %s\n'   "$BLU" "$RST" "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

IS_ROOT=0; [ "$(id -u)" -eq 0 ] && IS_ROOT=1

# ====================================================================
printf '%s' "$BLD"
cat <<'BANNER'
 ____                       _ _            _             _ _ _
/ ___|  ___  ___ _   _ _ __(_) |_ _   _   / \  _   _  __| (_) |_
\___ \ / _ \/ __| | | | '__| | __| | | | / _ \| | | |/ _` | | __|
 ___) |  __/ (__| |_| | |  | | |_| |_| |/ ___ \ |_| | (_| | | |_
|____/ \___|\___|\__,_|_|  |_|\__|\__, /_/   \_\__,_|\__,_|_|\__|
                                  |___/
BANNER
printf '%s' "$RST"
printf '  Tarih   : %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
printf '  Sunucu  : %s\n' "$(hostname -f 2>/dev/null || hostname)"
printf '  Yetki   : %s\n' "$([ "$IS_ROOT" -eq 1 ] && echo 'root (tam denetim)' || echo 'normal kullanici (sinirli; sudo onerilir)')"

# ====================================================================
section "1. SISTEM BILGISI & GUNCELLEMELER"
if [ -r /etc/os-release ]; then . /etc/os-release; info "OS: ${PRETTY_NAME:-bilinmiyor}"; fi
info "Kernel: $(uname -r)"
info "Uptime: $(uptime -p 2>/dev/null || uptime)"

if have apt-get; then
  sec_updates=$(apt-get -s upgrade 2>/dev/null | grep -ci '^inst .*security' || true)
  all_updates=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst ' || true)
  if [ "${sec_updates:-0}" -gt 0 ]; then bad "Bekleyen GUVENLIK guncellemesi: $sec_updates (toplam $all_updates paket)"
  elif [ "${all_updates:-0}" -gt 0 ]; then warn "Bekleyen guncelleme: $all_updates paket (guvenlik kritigi yok)"
  else ok "Sistem guncel gorunuyor"; fi
elif have dnf; then
  cnt=$(dnf -q updateinfo list security 2>/dev/null | grep -c . || true)
  [ "${cnt:-0}" -gt 0 ] && warn "Bekleyen guvenlik guncellemesi: $cnt" || ok "Guvenlik guncellemesi yok"
elif have yum; then
  cnt=$(yum -q check-update 2>/dev/null | grep -c . || true)
  [ "${cnt:-0}" -gt 0 ] && warn "Guncelleme bekleniyor: ~$cnt" || ok "Sistem guncel"
fi

# Otomatik guncelleme
if dpkg -l 2>/dev/null | grep -q unattended-upgrades; then ok "unattended-upgrades kurulu (otomatik guvenlik guncellemesi)"
elif have apt-get; then warn "unattended-upgrades kurulu degil (otomatik guvenlik yamasi yok)"; fi

# ====================================================================
section "2. FIREWALL (Guvenlik Duvari)"
if have ufw; then
  if ufw status 2>/dev/null | grep -qi 'Status: active'; then
    ok "UFW aktif"
    ufw status numbered 2>/dev/null | sed 's/^/      /'
  else warn "UFW kurulu ama PASIF (trafik filtrelenmiyor)"; fi
elif have firewall-cmd; then
  if firewall-cmd --state 2>/dev/null | grep -q running; then ok "firewalld aktif"
    firewall-cmd --list-all 2>/dev/null | sed 's/^/      /'
  else warn "firewalld pasif"; fi
elif have nft && nft list ruleset 2>/dev/null | grep -q .; then
  ok "nftables kurallari mevcut"
elif have iptables; then
  rules=$(iptables -S 2>/dev/null | grep -vc '^-P' || true)
  if [ "${rules:-0}" -gt 0 ]; then ok "iptables kurallari mevcut ($rules kural)"
  else warn "Hicbir firewall kurali yok (ufw/firewalld/iptables bos)"; fi
else
  bad "Bilinen bir firewall araci bulunamadi"
fi

# ====================================================================
section "3. ACIK PORTLAR & DINLEYEN SERVISLER"
if have ss; then LISTEN_CMD="ss -tulpnH"; elif have netstat; then LISTEN_CMD="netstat -tulpn"; else LISTEN_CMD=""; fi
if [ -n "$LISTEN_CMD" ]; then
  info "Dinleyen TCP/UDP soketleri (adres : port  -> servis):"
  $LISTEN_CMD 2>/dev/null | awk '{print "      "$0}'
  # 0.0.0.0 / :: uzerinde dinleyen (disariya acik olabilecek) portlar
  pub=$(ss -tlnH 2>/dev/null | awk '{print $4}' | grep -E '^(0\.0\.0\.0|\*|\[::\]|::):' | wc -l | tr -d ' ')
  [ "${pub:-0}" -gt 0 ] && warn "Tum arayuzlerde (0.0.0.0/::) dinleyen $pub TCP portu var - firewall ile sinirlandirildigindan emin ol"
else
  warn "ss/netstat yok, port listesi alinamadi"
fi

# ====================================================================
section "4. SSH GUVENLIGI"
SSHD=/etc/ssh/sshd_config
sshcfg() { # etkin (yorumsuz) deger
  if [ -r "$SSHD" ]; then
    grep -iE "^[[:space:]]*$1[[:space:]]" "$SSHD" 2>/dev/null | tail -n1 | awk '{print tolower($2)}'
  fi
}
if [ -r "$SSHD" ]; then
  prl=$(sshcfg PermitRootLogin)
  case "$prl" in
    no|prohibit-password|without-password) ok "PermitRootLogin = ${prl:-?} (root sifre ile giremez)";;
    yes) bad "PermitRootLogin = yes (root SSH ile sifreyle girebilir - KAPAT)";;
    "")  warn "PermitRootLogin acikca ayarlanmamis (varsayilan dagitima gore degisir)";;
    *)   info "PermitRootLogin = $prl";;
  esac

  pa=$(sshcfg PasswordAuthentication)
  case "$pa" in
    no)  ok "PasswordAuthentication = no (sadece anahtar ile giris)";;
    yes) warn "PasswordAuthentication = yes (sifreyle giris acik - brute-force riski)";;
    "")  warn "PasswordAuthentication ayarlanmamis (cogu dagitimda varsayilan: yes)";;
  esac

  port=$(sshcfg Port); info "SSH portu: ${port:-22 (varsayilan)}"
  pe=$(sshcfg PermitEmptyPasswords); [ "$pe" = "yes" ] && bad "PermitEmptyPasswords = yes (BOS sifreyle giris - cok tehlikeli)" || ok "Bos sifreyle giris kapali"
  x11=$(sshcfg X11Forwarding); [ "$x11" = "yes" ] && warn "X11Forwarding = yes (gerekmiyorsa kapat)"
  mar=$(sshcfg MaxAuthTries); [ -n "$mar" ] && info "MaxAuthTries = $mar"
else
  warn "$SSHD okunamadi (sudo ile calistir)"
fi

# ====================================================================
section "5. KULLANICILAR, SIFRELER & SUDO"
info "Giris yapabilen kullanicilar (kabuk sahibi):"
awk -F: '($7 !~ /(nologin|false|sync)$/) && $7!="" {printf "      %-20s uid=%-6s shell=%s\n",$1,$3,$7}' /etc/passwd

# UID 0 (root yetkili) birden fazla mi?
root_uids=$(awk -F: '$3==0{print $1}' /etc/passwd | tr '\n' ' ')
[ "$(echo "$root_uids" | wc -w)" -gt 1 ] && bad "Birden fazla UID=0 hesabi: $root_uids" || ok "Tek root hesabi (UID 0)"

# Bos sifreli hesaplar
if [ "$IS_ROOT" -eq 1 ] && [ -r /etc/shadow ]; then
  empty=$(awk -F: '($2==""){print $1}' /etc/shadow | tr '\n' ' ')
  [ -n "$empty" ] && bad "Bos sifreli hesap(lar): $empty" || ok "Bos sifreli hesap yok"
else
  warn "/etc/shadow okunamadi (bos sifre kontrolu icin sudo gerekir)"
fi

info "sudo/wheel grubundaki kullanicilar:"
getent group sudo wheel 2>/dev/null | awk -F: '{print "      "$1": "$4}'

# ====================================================================
section "6. BASARISIZ GIRIS DENEMELERI / BRUTE-FORCE"
if have lastb && [ "$IS_ROOT" -eq 1 ]; then
  fails=$(lastb 2>/dev/null | grep -c . || true)
  if [ "${fails:-0}" -gt 0 ]; then
    warn "Toplam basarisiz giris kaydi: $fails. En cok deneyen ilk 10 IP:"
    lastb 2>/dev/null | awk '{print $3}' | grep -E '^[0-9.]+$' | sort | uniq -c | sort -rn | head -10 | sed 's/^/      /'
  else ok "Kayitli basarisiz giris yok"; fi
else
  # auth loglarindan
  AUTHLOG=/var/log/auth.log; [ -r /var/log/secure ] && AUTHLOG=/var/log/secure
  if [ -r "$AUTHLOG" ]; then
    f=$(grep -ic 'failed password' "$AUTHLOG" 2>/dev/null || echo 0)
    [ "${f:-0}" -gt 0 ] && warn "$AUTHLOG icinde 'Failed password': $f kayit" || ok "Son logda basarisiz parola yok"
  else
    info "Basarisiz giris kontrolu icin sudo gerekir (lastb / auth.log)"
  fi
fi

# Su anda giris yapmis kullanicilar
info "Su an oturum acmis kullanicilar:"; who 2>/dev/null | sed 's/^/      /' || true

# ====================================================================
section "7. SALDIRI ONLEME (fail2ban vb.)"
if have fail2ban-client; then
  if fail2ban-client ping >/dev/null 2>&1; then
    ok "fail2ban calisiyor"
    fail2ban-client status 2>/dev/null | sed 's/^/      /'
  else warn "fail2ban kurulu ama calismiyor"; fi
else
  warn "fail2ban kurulu degil (SSH brute-force korumasi onerilir)"
fi

# ====================================================================
section "8. CALISAN SERVISLER & ZAMANLANMIS GOREVLER"
if have systemctl; then
  cnt=$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | grep -c . || true)
  info "Calisan systemd servis sayisi: ${cnt:-?}"
fi
info "Sistem cron gorevleri (/etc/cron*):"
ls -1 /etc/cron.d/ /etc/cron.daily/ 2>/dev/null | sed 's/^/      /' | head -20 || true
if [ "$IS_ROOT" -eq 1 ]; then
  for u in $(cut -d: -f1 /etc/passwd); do
    ct=$(crontab -l -u "$u" 2>/dev/null | grep -vc '^#' || true)
    [ "${ct:-0}" -gt 0 ] && info "  $u kullanicisinin crontab girdisi: $ct adet"
  done
fi

# ====================================================================
section "9. DOSYA SISTEMI RISKLERI"
# Parolasiz sudo
if [ -r /etc/sudoers ]; then
  grep -rEh 'NOPASSWD' /etc/sudoers /etc/sudoers.d/ 2>/dev/null | grep -v '^#' | grep -q . \
    && warn "NOPASSWD sudo kurali var (parolasiz yetki yukseltme):" && grep -rEh 'NOPASSWD' /etc/sudoers /etc/sudoers.d/ 2>/dev/null | grep -v '^#' | sed 's/^/      /' \
    || ok "NOPASSWD sudo kurali yok"
fi
# Herkese yazilabilir, sticky-bit olmayan dizinler
ww=$(find / -xdev -type d -perm -0002 ! -perm -1000 2>/dev/null | head -10)
[ -n "$ww" ] && warn "Sticky-bit'siz, herkese yazilabilir dizinler:" && echo "$ww" | sed 's/^/      /' || ok "Riskli (herkese yazilabilir) dizin bulunamadi"
# Sahipsiz dosyalar
no_owner=$(find / -xdev \( -nouser -o -nogroup \) 2>/dev/null | head -5)
[ -n "$no_owner" ] && warn "Sahipsiz dosyalar var (ilk 5):" && echo "$no_owner" | sed 's/^/      /'
# Beklenmedik SUID dosyalar (ozet)
suid=$(find / -xdev -type f -perm -4000 2>/dev/null | wc -l | tr -d ' ')
info "SUID bayrakli dosya sayisi: $suid (alisilmadik olanlari incele: find / -perm -4000)"

# ====================================================================
section "10. DOCKER / KONTEYNER GUVENLIGI"
if have docker; then
  if docker info >/dev/null 2>&1; then
    info "Docker calisiyor. Acik publish edilmis portlar:"
    docker ps --format '      {{.Names}}  {{.Ports}}' 2>/dev/null | grep -E '0\.0\.0\.0|::' \
      && warn "Yukaridaki konteynerler tum arayuzlere port aciyor (firewall ile sinirlandir)" \
      || ok "Disariya acik konteyner portu gorunmuyor"
    # root calisan konteynerler
    info "Konteyner sayisi: $(docker ps -q 2>/dev/null | wc -l | tr -d ' ') calisiyor"
  else
    info "docker kurulu ama daemon'a erisilemiyor (sudo gerekebilir)"
  fi
else
  info "Docker kurulu degil (bu sunucuda konteyner yoksa normal)"
fi

# ====================================================================
section "OZET"
printf '  %s%d PASS%s   %s%d WARN%s   %s%d FAIL%s\n' "$GRN" "$PASS" "$RST" "$YLW" "$WARN" "$RST" "$RED" "$FAIL" "$RST"
if [ "$FAIL" -gt 0 ]; then
  printf '  %sKRITIK: %d adet FAIL var, oncelikle bunlari duzelt.%s\n' "$RED" "$FAIL" "$RST"
elif [ "$WARN" -gt 0 ]; then
  printf '  %sDikkat: %d adet uyari var, gozden gecir.%s\n' "$YLW" "$WARN" "$RST"
else
  printf '  %sTemel kontroller iyi gorunuyor.%s\n' "$GRN" "$RST"
fi
printf '\n  Not: Bu script yalnizca okuma yapar; otomatik degisiklik yapmaz.\n'
printf '  Raporu kaydetmek icin:  sudo bash %s | tee audit-$(date +%%F).log\n\n' "$(basename "$0")"
