# Novelia

**Une liseuse EPUB élégante et sans publicité, que vous hébergez vous-même.** Lisez dans le navigateur, sur votre
téléphone (appli web installable) ou avec les applis Windows, macOS et Linux : position de lecture, marque-pages,
surlignages, collections et couvertures personnalisées sont synchronisés partout.

*English version: [README.md](README.md)*

## Contenu du dépôt

| Dossier | Contenu |
|---|---|
| [`server/`](server) | Serveur Node.js (Fastify + Prisma + SQLite) : API de synchro, comptes, et le site — accueil `/`, lecteur `/app/`, téléchargements `/download` |
| [`desktop/`](desktop) | Appli Windows et macOS (Electron) qui ouvre le lecteur de *votre* serveur |
| [`linux/`](linux) | Appli Linux native (Python, GTK 4, libadwaita, WebKitGTK), paquet `.deb` |

## Installer le serveur

Il faut Docker et Compose.

```bash
git clone https://github.com/<vous>/folio.git
cd folio/server
cp .env.example .env        # puis renseignez PUBLIC_URL et le SMTP
docker compose up -d --build
```

Novelia répond sur <http://127.0.0.1:8787>. Ouvrez `/app/`, créez votre compte et confirmez-le avec le lien reçu par mail
(sans SMTP, le lien s’affiche dans `docker compose logs folio`).

**Accès depuis Internet** : soit un tunnel Cloudflare (aucun port ouvert ; jeton dans `TUNNEL_TOKEN`, puis
`docker compose --profile tunnel up -d --build`), soit un proxy inverse HTTPS (Caddy, nginx…) vers `127.0.0.1:8787`.
Le HTTPS est indispensable pour installer l’appli sur téléphone.

**Sauvegarde** : tout le dossier `server/data/`, en particulier `secret.key` (sans lui, la double authentification
des comptes ne fonctionne plus).

**Téléchargements** : déposez les installeurs dans `server/downloads/` avec les noms
`Folio-Setup-X.Y.Z.exe`, `Folio-X.Y.Z-mac-arm64.zip`, `Folio-X.Y.Z-mac-x64.zip`, `Folio-X.Y.Z-linux.deb`.

## Construire les applis

```bash
cd desktop && npm ci && FOLIO_URL=https://novelia.exemple.org node build.js all   # Windows (Wine requis) et macOS
cd linux && FOLIO_URL=https://novelia.exemple.org ./build_deb.sh                  # Linux (.deb)
```

Les applis ne sont pas signées : sous Windows, « Informations complémentaires → Exécuter quand même » ; sous macOS,
`xattr -cr /Applications/Folio.app && codesign --force --deep --sign - /Applications/Folio.app`.

Toutes les options sont détaillées dans le [README anglais](README.md). Licence [MIT](LICENSE).
