#!/bin/sh
# Installe Piper et les voix de tts/voices.sha256 dans $1 (image Docker : /opt/piper).
# Chaque fichier téléchargé est vérifié (SHA-256) : une source modifiée fait échouer la construction.
set -eu
D=$1; REL=2023.11.14-2; HF=https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0
case "$(uname -m)" in
  aarch64) A=aarch64; SUM=fea0fd2d87c54dbc7078d0f878289f404bd4d6eea6e7444a77835d1537ab88eb ;;
  x86_64)  A=x86_64;  SUM=a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992 ;;
  *) echo "Piper : architecture $(uname -m) non prise en charge, lecture à voix haute désactivée"; exit 0 ;;
esac
mkdir -p "$D/voices"; cd "$D"
curl -fsSL -o piper.tgz "https://github.com/rhasspy/piper/releases/download/$REL/piper_linux_$A.tar.gz"
echo "$SUM  piper.tgz" | sha256sum -c -; tar xzf piper.tgz; rm piper.tgz
while read -r sum f; do
  n=voices/$(basename "$f"); curl -fsSL -o "$n" "$HF/$f"; echo "$sum  $n" | sha256sum -c -
done < "$(dirname "$0")/voices.sha256"
