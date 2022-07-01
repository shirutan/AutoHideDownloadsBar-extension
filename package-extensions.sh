#!/bin/sh
# chmod a+x release.sh

ver="$(cat manifest.json | jq -r '.version')"
filename="/tmp/chrome-bar-extensions_v${ver}.zip"
# TODAY=$(date)

pause() { read -p "$*"; }

echo "Zipping extension for Chrome Web Store..."
rm $filename
zip -q -r $filename \
                  _locales \
                  css/libs/*/*.css \
                  css/*/*.css \
                  css/*.css \
                  html/*.html \
                  icons/16.png \
                  icons/48.png \
                  icons/128.png \
                  icons/dark/16.png \
                  icons/dark/48.png \
                  icons/dark/128.png \
                  js/*.js \
                  js/*/*.js \
                  manifest.json \
                  audio/* \
 --exclude="*/-*.*"
#  -x \*.DS_Store
# -z $TODAY

echo "Compressed $filename"

pause 'Press [Enter] to pushing the repository...'
git add .
if [ ! -z "$1" ]; then
   ver="$1"
fi
git commit -m "$ver"
git tag "v${ver}"
git push origin master
