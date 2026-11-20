"""Bibliothèque de Folio : base SQLite, import des EPUB, couvertures, réglages."""
import hashlib
import json
import os
import posixpath
import shutil
import sqlite3
import time
import zipfile
from pathlib import Path
from urllib.parse import unquote
from xml.etree import ElementTree as ET

DATA = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "folio"
BOOKS, COVERS, SPINES = DATA / "books", DATA / "covers", DATA / "spines"
NS = {
    "c": "urn:oasis:names:tc:opendocument:xmlns:container",
    "o": "http://www.idpf.org/2007/opf",
    "dc": "http://purl.org/dc/elements/1.1/",
}

DEFAULT_SETTINGS = {
    "theme": "clair", "bg": "#fbfbfa", "fg": "#222222",
    "font": "", "size": 19, "line": 1.6, "margin": 48,
    "justify": False, "flow": "scrolled", "spread": False,
    # para : espace entre paragraphes en em (0 = celui du livre) ; indent : retrait en em (-1 = celui du livre)
    "para": 0, "indent": -1, "weight": 400, "letter": 0,
}
# Réglages partagés entre appareils (format commun app Linux / PWA / serveur)
SYNC_KEYS = tuple(DEFAULT_SETTINGS)
# Groupes qu'un appareil peut garder pour lui (settings["nosync"], jamais envoyé)
SYNC_GROUPS = {
    "colors": ("theme", "bg", "fg"), "font": ("font",), "size": ("size",),
    "spacing": ("line", "para", "indent", "weight", "letter"), "margin": ("margin",),
    "layout": ("justify", "flow", "spread"),
}


def synced_keys(settings):
    off = {k for g in settings.get("nosync") or () for k in SYNC_GROUPS.get(g, ())}
    return [k for k in SYNC_KEYS if k not in off]

SCHEMA = """
CREATE TABLE IF NOT EXISTS books(
  id INTEGER PRIMARY KEY, hash TEXT UNIQUE, title TEXT, author TEXT,
  path TEXT, cover TEXT, added REAL, last_read REAL,
  cfi TEXT, progress REAL DEFAULT 0, locs TEXT);
CREATE TABLE IF NOT EXISTS bookmarks(
  id INTEGER PRIMARY KEY, book_id INTEGER, cfi TEXT, label TEXT, created REAL,
  UNIQUE(book_id, cfi));
CREATE TABLE IF NOT EXISTS highlights(
  id INTEGER PRIMARY KEY, book_id INTEGER, cfi TEXT, color TEXT, text TEXT, created REAL,
  UNIQUE(book_id, cfi));
CREATE TABLE IF NOT EXISTS collections(
  id TEXT PRIMARY KEY, name TEXT, books TEXT DEFAULT '[]', created REAL, updated REAL, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS shelf(
  id TEXT PRIMARY KEY, kind TEXT DEFAULT 'book', title TEXT DEFAULT '', author TEXT DEFAULT '', spine REAL DEFAULT 0,
  created REAL, updated REAL, deleted INTEGER DEFAULT 0,
  spine_at REAL DEFAULT 0, spine_sent REAL DEFAULT 0);
"""


def parse_epub(path):
    """Retourne (titre, auteur, octets_couverture, extension)."""
    with zipfile.ZipFile(path) as z:
        container = ET.fromstring(z.read("META-INF/container.xml"))
        opf_path = container.find(".//c:rootfile", NS).get("full-path")
        opf = ET.fromstring(z.read(opf_path))
        base = posixpath.dirname(opf_path)

        def meta(tag):
            el = opf.find(f".//dc:{tag}", NS)
            return (el.text or "").strip() if el is not None and el.text else ""

        items = opf.findall(".//o:manifest/o:item", NS)
        by_id = {i.get("id"): i for i in items}
        cover = next((i for i in items if "cover-image" in (i.get("properties") or "").split()), None)
        if cover is None:
            m = next((m for m in opf.findall(".//o:meta", NS) if m.get("name") == "cover"), None)
            cover = by_id.get(m.get("content")) if m is not None else None
        if cover is None:
            cover = next((i for i in items if (i.get("media-type") or "").startswith("image/")
                          and "cover" in (i.get("id", "") + i.get("href", "")).lower()), None)
        data, ext = None, "jpg"
        if cover is not None:
            try:
                name = posixpath.normpath(posixpath.join(base, unquote(cover.get("href"))))
                data = z.read(name)
                ext = name.rsplit(".", 1)[-1].lower()
            except KeyError:
                data = None
        title = meta("title") or Path(path).stem
        return title, meta("creator"), data, ext


class Library:
    def __init__(self):
        for d in (DATA, BOOKS, COVERS, SPINES):
            d.mkdir(parents=True, exist_ok=True)
        # une connexion par thread (l'interface et le thread de synchro) ; WAL = lectures sans blocage
        self.db = sqlite3.connect(DATA / "folio.db", timeout=15)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=NORMAL")
        self.db.executescript(SCHEMA)
        for t, cols in (("bookmarks", ("updated REAL", "deleted INTEGER DEFAULT 0")),
                        ("highlights", ("updated REAL", "deleted INTEGER DEFAULT 0")),
                        ("books", ("pos_updated REAL", "synced TEXT", "uploaded INTEGER DEFAULT 0",
                                   # couverture choisie par l'utilisateur (fichier à part ; la plus récente gagne)
                                   "custom_cover TEXT DEFAULT ''", "cover_updated REAL DEFAULT 0", "cover_sent INTEGER DEFAULT 1"))):
            have = {r[1] for r in self.db.execute(f"PRAGMA table_info({t})")}
            for c in cols:
                if c.split()[0] not in have:
                    self.db.execute(f"ALTER TABLE {t} ADD COLUMN {c}")
        self.db.commit()
        self._settings_file = DATA / "settings.json"

    # ---- réglages -------------------------------------------------------
    def load_settings(self):
        s = dict(DEFAULT_SETTINGS)
        try:
            s.update(json.loads(self._settings_file.read_text()))
        except (OSError, ValueError):
            pass
        return s

    def save_settings(self, s):
        self._settings_file.write_text(json.dumps(s))

    # ---- livres ---------------------------------------------------------
    def add_book(self, src):
        h = hashlib.sha1(Path(src).read_bytes()).hexdigest()
        row = self.db.execute("SELECT id FROM books WHERE hash=?", (h,)).fetchone()
        if row:
            return row["id"], False
        title, author, cover, ext = parse_epub(src)
        dest = BOOKS / f"{h}.epub"
        shutil.copy2(src, dest)
        cover_path = ""
        if cover:
            cover_path = str(COVERS / f"{h}.{ext}")
            Path(cover_path).write_bytes(cover)
        cur = self.db.execute(
            "INSERT INTO books(hash,title,author,path,cover,added) VALUES(?,?,?,?,?,?)",
            (h, title, author, str(dest), cover_path, time.time()))
        self.db.commit()
        return cur.lastrowid, True

    def books(self, query=""):
        q = f"%{query.strip()}%"
        return self.db.execute(
            "SELECT * FROM books WHERE title LIKE ? OR author LIKE ? "
            "ORDER BY COALESCE(last_read,0) DESC, added DESC", (q, q)).fetchall()

    def book(self, bid):
        return self.db.execute("SELECT * FROM books WHERE id=?", (bid,)).fetchone()

    def remove_book(self, bid):
        b = self.book(bid)
        if not b:
            return
        for p in (b["path"], b["cover"], b["custom_cover"]):
            if p:
                Path(p).unlink(missing_ok=True)
        for c in self.collections():               # le livre quitte aussi ses collections
            if b["hash"] in c["books"]:
                self.set_collection(c["id"], books=[h for h in c["books"] if h != b["hash"]])
        for t, col in (("bookmarks", "book_id"), ("highlights", "book_id"), ("books", "id")):
            self.db.execute(f"DELETE FROM {t} WHERE {col}=?", (bid,))
        self.db.commit()

    def reset_sync_marks(self):
        """Après un changement de compte : tout renvoyer au prochain passage."""
        self.db.execute("UPDATE books SET synced=NULL, uploaded=0")
        self.db.execute("UPDATE shelf SET spine_sent=0"); self.db.commit()

    def touch(self, bid):
        self.db.execute("UPDATE books SET last_read=? WHERE id=?", (time.time(), bid))
        self.db.commit()

    def save_position(self, bid, cfi, progress):
        self.db.execute("UPDATE books SET cfi=?, progress=COALESCE(?,progress), last_read=?, pos_updated=? WHERE id=?",
                        (cfi, progress, time.time(), time.time(), bid))
        self.db.commit()

    def set_status(self, bid, st):
        """« done » : progression à 100 % ; « unread » : retour au début, comme jamais ouvert."""
        if st == "done":
            self.db.execute("UPDATE books SET progress=1, pos_updated=? WHERE id=?", (time.time(), bid))
        else:
            self.db.execute("UPDATE books SET progress=0, cfi='', last_read=NULL, pos_updated=? WHERE id=?", (time.time(), bid))
        self.db.commit()

    def save_locations(self, bid, data):
        self.db.execute("UPDATE books SET locs=? WHERE id=?", (data, bid))
        self.db.commit()

    # ---- marque-pages / surlignages --------------------------------------
    def bookmarks(self, bid):
        return [dict(r) for r in self.db.execute(
            "SELECT * FROM bookmarks WHERE book_id=? AND COALESCE(deleted,0)=0 ORDER BY created", (bid,))]

    def add_bookmark(self, bid, cfi, label):
        now = time.time()
        self.db.execute("INSERT INTO bookmarks(book_id,cfi,label,created,updated,deleted) VALUES(?,?,?,?,?,0) "
                        "ON CONFLICT(book_id,cfi) DO UPDATE SET label=excluded.label,deleted=0,updated=excluded.updated",
                        (bid, cfi, label, now, now))
        self.db.commit()

    def del_bookmark(self, bid, cfi):
        self.db.execute("UPDATE bookmarks SET deleted=1, updated=? WHERE book_id=? AND cfi=?", (time.time(), bid, cfi))
        self.db.commit()

    def highlights(self, bid):
        return [dict(r) for r in self.db.execute(
            "SELECT * FROM highlights WHERE book_id=? AND COALESCE(deleted,0)=0 ORDER BY created", (bid,))]

    def add_highlight(self, bid, cfi, color, text):
        now = time.time()
        self.db.execute("INSERT INTO highlights(book_id,cfi,color,text,created,updated,deleted) VALUES(?,?,?,?,?,?,0) "
                        "ON CONFLICT(book_id,cfi) DO UPDATE SET color=excluded.color,text=excluded.text,deleted=0,updated=excluded.updated",
                        (bid, cfi, color, text, now, now))
        self.db.commit()

    def del_highlight(self, bid, cfi):
        self.db.execute("UPDATE highlights SET deleted=1, updated=? WHERE book_id=? AND cfi=?", (time.time(), bid, cfi))
        self.db.commit()

    # ---- couvertures personnalisées -------------------------------------
    @staticmethod
    def shown_cover(b):
        """Chemin de la couverture affichée : celle choisie par l'utilisateur, sinon celle du livre."""
        c = b["custom_cover"] if "custom_cover" in b.keys() else ""
        return c if c and os.path.exists(c) else b["cover"]

    def set_custom_cover(self, bid, data, updated=None, sent=False):
        """data = octets JPEG/PNG, ou None pour revenir à la couverture d'origine."""
        b = self.book(bid)
        if not b:
            return
        if b["custom_cover"]:
            Path(b["custom_cover"]).unlink(missing_ok=True)
        t = updated or time.time()
        path = ""
        if data:
            ext = "png" if data[:4] == b"\x89PNG" else "jpg"
            path = str(COVERS / f"{b['hash']}-custom-{int(t * 1000)}.{ext}")   # nom unique : pas de vignette périmée
            Path(path).write_bytes(data)
        self.db.execute("UPDATE books SET custom_cover=?, cover_updated=?, cover_sent=? WHERE id=?",
                        (path, t, 1 if sent or not data else 0, bid))
        self.db.commit()

    # ---- collections (même format que le serveur et le site) -------------
    @staticmethod
    def _coll(r):
        d = dict(r)
        try:
            d["books"] = json.loads(d["books"] or "[]")
        except ValueError:
            d["books"] = []
        return d

    def collections(self, with_deleted=False):
        q = "SELECT * FROM collections" + ("" if with_deleted else " WHERE COALESCE(deleted,0)=0") + " ORDER BY name COLLATE NOCASE"
        return [self._coll(r) for r in self.db.execute(q)]

    def collection(self, cid):
        r = self.db.execute("SELECT * FROM collections WHERE id=?", (cid,)).fetchone()
        return self._coll(r) if r else None

    def new_collection(self, name, books=()):
        import secrets, string
        cid = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(10))
        now = time.time()
        self.db.execute("INSERT INTO collections(id,name,books,created,updated,deleted) VALUES(?,?,?,?,?,0)",
                        (cid, (name.strip() or "Collection")[:80], json.dumps(list(books)), now, now))
        self.db.commit()
        return cid

    def set_collection(self, cid, name=None, books=None, deleted=None):
        c = self.collection(cid)
        if not c:
            return
        name = c["name"] if name is None else name.strip()[:80]
        books = c["books"] if books is None else list(dict.fromkeys(books))
        deleted = c["deleted"] if deleted is None else int(deleted)
        if deleted:
            name, books = "", []
        self.db.execute("UPDATE collections SET name=?, books=?, deleted=?, updated=? WHERE id=?",
                        (name, json.dumps(books), deleted, time.time(), cid))
        self.db.commit()

    def toggle_in_collection(self, cid, h, on):
        c = self.collection(cid)
        if c and (h in c["books"]) != on:
            self.set_collection(cid, books=c["books"] + [h] if on else [x for x in c["books"] if x != h])

    def merge_collections(self, remote):
        """Fusionne une liste reçue (la plus récente gagne, par collection). Retourne True si quelque chose a changé."""
        changed = False
        for c in remote or []:
            if not isinstance(c, dict) or not c.get("id"):
                continue
            cur = self.collection(c["id"])
            if cur and (cur["updated"] or 0) >= (c.get("updated") or 0):
                continue
            self.db.execute("INSERT INTO collections(id,name,books,created,updated,deleted) VALUES(?,?,?,?,?,?) "
                            "ON CONFLICT(id) DO UPDATE SET name=excluded.name, books=excluded.books, updated=excluded.updated, deleted=excluded.deleted",
                            (c["id"], str(c.get("name", ""))[:80], json.dumps(c.get("books") or []), c.get("created") or 0,
                             c.get("updated") or 0, 1 if c.get("deleted") else 0))
            changed = True
        self.db.commit()
        return changed

    # ---- étagère : livres numériques (id = empreinte) et papier, photo de tranche facultative -------------
    # spine = date de la photo en vigueur (0 = aucune) ; spine_at = celle présente ici ; spine_sent = celle envoyée
    SHELF_KEYS = ("id", "kind", "title", "author", "spine", "created", "updated", "deleted")

    def shelf_items(self, with_deleted=False):
        q = "SELECT * FROM shelf" + ("" if with_deleted else " WHERE COALESCE(deleted,0)=0")
        return [dict(r) for r in self.db.execute(q)]

    def shelf_item(self, sid):
        r = self.db.execute("SELECT * FROM shelf WHERE id=?", (sid,)).fetchone()
        return dict(r) if r else None

    def shelf_public(self):
        """Ce qui part vers le serveur (format commun avec le site)."""
        return [{k: x[k] for k in self.SHELF_KEYS} for x in self.shelf_items(with_deleted=True)]

    @staticmethod
    def spine_path(sid):
        return SPINES / f"{sid}.jpg"

    def shelf_put(self, sid, **kw):
        """Crée ou modifie un livre de l'étagère (horodaté : le plus récent gagne à la synchro)."""
        now = time.time()
        cur = self.shelf_item(sid) or {"id": sid, "kind": "book", "title": "", "author": "", "spine": 0, "created": now, "deleted": 0}
        cur.update(kw); cur["updated"] = now
        self.db.execute("INSERT INTO shelf(id,kind,title,author,spine,created,updated,deleted) VALUES(?,?,?,?,?,?,?,?) "
                        "ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, title=excluded.title, author=excluded.author, "
                        "spine=excluded.spine, updated=excluded.updated, deleted=excluded.deleted",
                        (sid, cur["kind"], str(cur["title"])[:300], str(cur["author"])[:200], cur["spine"] or 0,
                         cur["created"] or now, now, 1 if cur["deleted"] else 0))
        self.db.commit()
        return cur

    def set_spine(self, sid, data, **base):
        """Pose (data = JPEG) ou retire (data = None) la photo de tranche."""
        p = self.spine_path(sid)
        if data:
            p.write_bytes(data); t = time.time()
            self.shelf_put(sid, spine=t, deleted=0, **base)
            self.mark_spine(sid, at=t)
        else:
            p.unlink(missing_ok=True)
            self.shelf_put(sid, spine=0, **base)
            self.mark_spine(sid, at=0)

    def mark_spine(self, sid, at=None, sent=None):
        if at is not None:
            self.db.execute("UPDATE shelf SET spine_at=? WHERE id=?", (at, sid))
        if sent is not None:
            self.db.execute("UPDATE shelf SET spine_sent=? WHERE id=?", (sent, sid))
        self.db.commit()

    def new_paper(self, title, author=""):
        import secrets, string
        sid = "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(10))
        self.shelf_put(sid, kind="paper", title=title.strip(), author=author.strip())
        return sid

    def merge_shelf(self, remote):
        """Fusionne une liste reçue (la plus récente gagne, par livre). Retourne True si quelque chose a changé."""
        changed = False
        for x in remote or []:
            if not isinstance(x, dict) or not x.get("id"):
                continue
            cur = self.shelf_item(x["id"])
            if cur and (cur["updated"] or 0) >= (x.get("updated") or 0):
                continue
            self.db.execute("INSERT INTO shelf(id,kind,title,author,spine,created,updated,deleted) VALUES(?,?,?,?,?,?,?,?) "
                            "ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, title=excluded.title, author=excluded.author, "
                            "spine=excluded.spine, updated=excluded.updated, deleted=excluded.deleted",
                            (x["id"], "paper" if x.get("kind") == "paper" else "book", str(x.get("title", ""))[:300],
                             str(x.get("author", ""))[:200], x.get("spine") or 0, x.get("created") or 0, x.get("updated") or 0,
                             1 if x.get("deleted") else 0))
            changed = True
        self.db.commit()
        return changed
