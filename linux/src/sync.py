"""Synchro par dossier : un JSON par livre (state/<sha1>.json) + EPUB (books/<sha1>.epub).
Format partagé avec la PWA. Fusion : le plus récent gagne, suppressions conservées (deleted=1)."""
import hashlib
import json
import re
import shutil
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HASH = re.compile(r"^[0-9a-f]{40}$")
UA = "FolioReader/1.7.1"
LANG = "fr"           # langue des messages du serveur (réglée par l'appli)
DEVICE = "Folio Linux · " + re.sub(r"[^\w .-]", "", __import__("socket").gethostname())[:40]


def public_post(server, path, body):
    """POST sans authentification ; retourne (code HTTP, json)."""
    r = urllib.request.Request(server.rstrip("/") + path, data=json.dumps(body).encode(), method="POST",
                               headers={"Content-Type": "application/json", "User-Agent": UA, "X-Folio-Device": DEVICE, "X-Folio-Lang": LANG})
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except ValueError:
            return e.code, {"error": f"{'Error' if LANG == 'en' else 'Erreur'} {e.code}"}


class Sync:
    def __init__(self, lib, folder):
        self.lib, self.moved = lib, set()
        self.dir = Path(folder) / "Folio"
        (self.dir / "state").mkdir(parents=True, exist_ok=True)
        (self.dir / "books").mkdir(exist_ok=True)
        (self.dir / "covers").mkdir(exist_ok=True)

    def _file(self, h):
        return self.dir / "state" / f"{h}.json"

    def _items(self, table, bid, cols):
        q = ",".join(cols)
        return [dict(r) for r in self.lib.db.execute(
            f"SELECT {q},created,COALESCE(updated,created) AS updated,COALESCE(deleted,0) AS deleted "
            f"FROM {table} WHERE book_id=?", (bid,))]

    def _merge_items(self, table, bid, remote, cols):
        local = {r["cfi"]: r for r in self._items(table, bid, ["cfi"] + cols)}
        for it in remote:
            cur = local.get(it["cfi"])
            if cur and cur["updated"] >= it.get("updated", 0):
                continue
            vals = [it.get(c, "") for c in cols]
            self.lib.db.execute(
                f"INSERT INTO {table}(book_id,cfi,{','.join(cols)},created,updated,deleted) VALUES(?,?,{','.join('?' * len(cols))},?,?,?) "
                f"ON CONFLICT(book_id,cfi) DO UPDATE SET {','.join(f'{c}=excluded.{c}' for c in cols)},updated=excluded.updated,deleted=excluded.deleted",
                [bid, it["cfi"], *vals, it.get("created", time.time()), it.get("updated", 0), int(it.get("deleted", 0))])

    def pull(self):
        """Fusionne tout le dossier dans la base locale. Retourne les ids de livres modifiés."""
        changed = set()
        for f in (self.dir / "state").glob("*.json"):
            if not HASH.match(f.stem):
                continue
            try:
                d = json.loads(f.read_text())
            except ValueError:
                continue
            changed |= self._apply(f.stem, d, lambda h: self.dir / "books" / f"{h}.epub")
        self.lib.db.commit()
        return changed

    def _get_cover(self, h):
        try:
            return (self.dir / "covers" / f"{h}.jpg").read_bytes()
        except OSError:
            return None

    def _put_cover(self, h, data):
        (self.dir / "covers" / f"{h}.jpg").write_bytes(data)
        return True

    def collections(self):
        """Échange les collections avec le dossier (collections.json). Retourne True si la base locale a changé."""
        f = self.dir / "collections.json"
        try:
            remote = json.loads(f.read_text())
        except (OSError, ValueError):
            remote = []
        changed = self.lib.merge_collections(remote)
        mine = self.lib.collections(with_deleted=True)
        if json.dumps(sorted(mine, key=lambda c: c["id"]), sort_keys=True) != json.dumps(sorted(remote, key=lambda c: c.get("id", "")), sort_keys=True):
            tmp = f.with_suffix(".tmp"); tmp.write_text(json.dumps(mine, ensure_ascii=False)); tmp.replace(f)
        return changed

    def _apply(self, h, d, epub_for):
        changed = set()
        row = self.lib.db.execute("SELECT * FROM books WHERE hash=?", (h,)).fetchone()
        if d.get("removed"):
            if row:
                self.lib.remove_book(row["id"]); changed.add(row["id"])
            return changed
        if not row:
            epub = epub_for(h)
            if not epub or not Path(epub).exists():
                return changed
            try:
                bid, _ = self.lib.add_book(str(epub))
            except Exception:
                return changed
            row = self.lib.book(bid); changed.add(bid)
        bid, pos = row["id"], d.get("position") or {}
        cv = d.get("cover") or {}
        if (cv.get("updated") or 0) > (row["cover_updated"] or 0):     # couverture changée sur un autre appareil
            if not cv.get("custom"):
                self.lib.set_custom_cover(bid, None, cv["updated"], sent=True); changed.add(bid)
            else:
                data = self._get_cover(h)
                if data:
                    self.lib.set_custom_cover(bid, data, cv["updated"], sent=True); changed.add(bid)
        if pos.get("updated", 0) > (row["pos_updated"] or 0):
            self.lib.db.execute("UPDATE books SET cfi=?,progress=?,pos_updated=? WHERE id=?",
                                (pos.get("cfi"), pos.get("progress") or 0, pos["updated"], bid))
            if not pos.get("cfi") and not pos.get("progress"):       # marqué « non lu » ailleurs
                self.lib.db.execute("UPDATE books SET last_read=NULL WHERE id=?", (bid,))
            changed.add(bid); self.moved.add(bid)
        before = self.lib.db.total_changes
        self._merge_items("bookmarks", bid, d.get("bookmarks", []), ["label"])
        self._merge_items("highlights", bid, d.get("highlights", []), ["color", "text"])
        if self.lib.db.total_changes != before:
            changed.add(bid)
        self.lib.db.commit()
        return changed

    def _state(self, bid, h):
        b = self.lib.book(bid)
        return {"hash": h, "title": b["title"], "author": b["author"],
                "position": {"cfi": b["cfi"], "progress": b["progress"] or 0, "updated": b["pos_updated"] or 0},
                "cover": {"updated": b["cover_updated"] or 0, "custom": bool(b["custom_cover"])},
                "bookmarks": self._items("bookmarks", bid, ["cfi", "label"]),
                "highlights": self._items("highlights", bid, ["cfi", "color", "text"])}

    def push(self, bid, removed=False, h=None, force=True):
        b = self.lib.book(bid)
        h = h or (b["hash"] if b else None)
        if not h:
            return
        if removed:
            self._write(h, {"hash": h, "removed": time.time()})
            return
        remote = {}
        try:
            remote = json.loads(self._file(h).read_text())
        except (OSError, ValueError):
            pass
        if remote.get("position", {}).get("updated", 0) > (b["pos_updated"] or 0):
            self.pull()          # l'autre appareil est plus récent : on fusionne d'abord
            b = self.lib.book(bid)
        self._write(h, self._state(bid, h))
        self._send_cover(bid, h)
        dest = self.dir / "books" / f"{h}.epub"
        if not dest.exists():
            shutil.copy2(b["path"], dest)

    def _send_cover(self, bid, h):
        b = self.lib.book(bid)
        if b and b["custom_cover"] and not b["cover_sent"]:
            try:
                ok = self._put_cover(h, Path(b["custom_cover"]).read_bytes())
            except OSError:
                ok = False
            if ok:
                self.lib.db.execute("UPDATE books SET cover_sent=1 WHERE id=?", (bid,)); self.lib.db.commit()

    def push_all(self):
        for b in self.lib.books():
            self.push(b["id"])

    def settings(self, local, updated):
        """Échange les réglages d'apparence ; retourne (réglages, horodatage) gagnants."""
        f = self.dir / "settings.json"
        try:
            d = json.loads(f.read_text())
            if d.get("updated", 0) > updated:
                return d.get("settings") or {}, d["updated"]
        except (OSError, ValueError):
            pass
        tmp = f.with_suffix(".tmp")
        tmp.write_text(json.dumps({"settings": local, "updated": updated}, ensure_ascii=False))
        tmp.replace(f)
        return local, updated

    def _write(self, h, state):
        tmp = self._file(h).with_suffix(".tmp")
        tmp.write_text(json.dumps(state, ensure_ascii=False))
        tmp.replace(self._file(h))


class ApiSync(Sync):
    """Synchro via le serveur Folio (compte email + mot de passe). Même interface que Sync."""

    def __init__(self, lib, server, token):
        self.lib, self.server, self.token, self.moved = lib, server.rstrip("/"), token, set()

    def _req(self, method, path, body=None, ctype="application/json"):
        r = urllib.request.Request(self.server + path, data=body, method=method,
                                   headers={"Authorization": "Bearer " + self.token, "Content-Type": ctype,
                                            "User-Agent": UA, "X-Folio-Device": DEVICE, "X-Folio-Lang": LANG})
        return urllib.request.urlopen(r, timeout=30)

    def _fetch(self, h):
        try:
            tmp = Path(tempfile.gettempdir()) / f"folio-{h}.epub"
            tmp.write_bytes(self._req("GET", f"/api/files/{h}").read())
            return tmp
        except OSError:
            return None

    def _get_cover(self, h):
        try:
            return self._req("GET", f"/api/covers/{h}").read()
        except OSError:
            return None

    def _put_cover(self, h, data):
        ctype = "image/png" if data[:4] == b"\x89PNG" else "image/jpeg"
        self._req("PUT", f"/api/covers/{h}", data, ctype)
        return True

    def collections(self):
        mine = self.lib.collections(with_deleted=True)
        merged = json.load(self._req("PUT", "/api/collections", json.dumps({"collections": mine}).encode()))
        return self.lib.merge_collections(merged)

    def set_lang(self, lang):
        return self._json("PATCH", "/api/me", {"lang": lang})

    # ---- compte / profil ----
    def _json(self, method, path, body=None):
        return json.load(self._req(method, path, None if body is None else json.dumps(body).encode()))

    def me(self):
        return self._json("GET", "/api/me")

    def set_name(self, name):
        return self._json("PATCH", "/api/me", {"name": name})

    def get_avatar(self):
        try:
            return self._req("GET", "/api/me/avatar").read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise

    def put_avatar(self, data, ctype="image/png"):
        return json.load(self._req("PUT", "/api/me/avatar", data, ctype))

    def del_avatar(self):
        return self._json("DELETE", "/api/me/avatar")

    def change_password(self, current, new, code=""):
        return self._json("POST", "/api/me/password", {"current": current, "next": new, "code": code})

    def sessions(self):
        return self._json("GET", "/api/me/sessions")

    def revoke(self, sid):
        return self._json("DELETE", "/api/me/sessions/" + urllib.parse.quote(sid, safe=""))

    def mfa_setup(self, password):
        return self._json("POST", "/api/me/mfa/setup", {"password": password})

    def mfa_enable(self, code):
        return self._json("POST", "/api/me/mfa/enable", {"code": code})

    def mfa_disable(self, password, code):
        return self._json("POST", "/api/me/mfa/disable", {"password": password, "code": code})

    def mfa_recovery(self, password, code):
        return self._json("POST", "/api/me/mfa/recovery", {"password": password, "code": code})

    def logout(self):
        return self._json("POST", "/api/logout", {})

    def logout_others(self):
        return self._json("POST", "/api/logout-others", {})

    def delete_account(self, password, code=""):
        return self._json("DELETE", "/api/me", {"password": password, "code": code})

    def settings(self, local, updated):
        d = json.load(self._req("PUT", "/api/settings", json.dumps({"settings": local, "updated": updated}).encode()))
        return d.get("settings") or {}, d.get("updated", 0)

    def pull(self):
        changed = set()
        for d in json.load(self._req("GET", "/api/books")):
            changed |= self._apply(d["hash"], d, self._fetch)
        return changed

    def _sig(self, bid, h):
        return hashlib.sha1(json.dumps(self._state(bid, h), sort_keys=True).encode()).hexdigest()

    def push(self, bid, removed=False, h=None, force=True):
        b = self.lib.book(bid)
        h = h or (b["hash"] if b else None)
        if not h:
            return
        if removed:
            self._req("PUT", f"/api/books/{h}", json.dumps({"hash": h, "removed": time.time()}).encode())
            return
        if not force and b["synced"] == self._sig(bid, h) and b["uploaded"]:
            return                                   # rien de neuf depuis le dernier envoi
        merged = json.load(self._req("PUT", f"/api/books/{h}", json.dumps(self._state(bid, h)).encode()))
        self._send_cover(bid, h)
        self._apply(h, merged, lambda _h: None)
        if not b["uploaded"]:
            try:
                self._req("HEAD", f"/api/files/{h}")
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    raise
                self._req("PUT", f"/api/files/{h}", Path(b["path"]).read_bytes(), "application/epub+zip")
        self.lib.db.execute("UPDATE books SET synced=?, uploaded=1 WHERE id=?", (self._sig(bid, h), bid))
        self.lib.db.commit()

    def push_all(self):
        for b in self.lib.books():
            self.push(b["id"], force=False)
