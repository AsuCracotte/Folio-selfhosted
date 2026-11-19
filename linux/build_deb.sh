#!/bin/sh
# Construit folio-reader_<version>_all.deb  —  usage : ./build_deb.sh
set -e
cd "$(dirname "$0")"
VERSION=1.8.0
PKG=folio-reader
ROOT=build/$PKG
rm -rf build && mkdir -p $ROOT/DEBIAN $ROOT/usr/bin $ROOT/usr/share/folio/reader \
  $ROOT/usr/share/applications $ROOT/usr/share/icons/hicolor/scalable/apps $ROOT/usr/share/doc/$PKG

install -m644 src/app.py src/library.py src/sync.py src/i18n.py src/style.css packaging/org.folio.Reader.svg $ROOT/usr/share/folio/
# serveur proposé par défaut à la connexion (optionnel) : FOLIO_URL=https://folio.example.org ./build_deb.sh
printf '{"server": "%s"}\n' "${FOLIO_URL:-}" > $ROOT/usr/share/folio/config.json
install -d $ROOT/usr/share/folio/icons && install -m644 src/icons/*.svg $ROOT/usr/share/folio/icons/
install -d $ROOT/usr/share/folio/fonts && install -m644 src/fonts/*.ttf $ROOT/usr/share/folio/fonts/ && install -m644 src/fonts/OFL.txt $ROOT/usr/share/doc/$PKG/Fraunces-OFL.txt
install -m644 src/reader/reader.html src/reader/notes.js src/reader/epub.min.js src/reader/jszip.min.js $ROOT/usr/share/folio/reader/
printf '#!/bin/sh\nexec python3 /usr/share/folio/app.py "$@"\n' > $ROOT/usr/bin/folio && chmod 755 $ROOT/usr/bin/folio
install -m644 packaging/org.folio.Reader.desktop $ROOT/usr/share/applications/
install -m644 packaging/org.folio.Reader.svg $ROOT/usr/share/icons/hicolor/scalable/apps/
install -m644 packaging/copyright $ROOT/usr/share/doc/$PKG/copyright

cat > $ROOT/DEBIAN/control <<CTL
Package: $PKG
Version: $VERSION
Section: text
Priority: optional
Architecture: all
Depends: python3, python3-gi, python3-gi-cairo, gir1.2-gtk-4.0, gir1.2-adw-1 (>= 1.5), gir1.2-webkit-6.0, gir1.2-pango-1.0
Maintainer: Folio contributors <folio@example.org>
Description: Modern EPUB reader with a synced library / liseuse EPUB
 Folio opens your EPUB books in a clean GTK4 interface: library with
 covers and collections, custom covers, themes and fonts, bookmarks,
 highlights, paged or scrolled reading, and sync of your progress with
 the Folio website and apps. Interface in English and French.
CTL
dpkg-deb --build --root-owner-group $ROOT "${PKG}_${VERSION}_all.deb"
echo "→ ${PKG}_${VERSION}_all.deb"
