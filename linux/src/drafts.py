"""Manuscrits écrits dans l'éditeur (writer/write.js) : un fichier JSON par livre, un historique de versions,
et la synchro avec le serveur Novelia (même protocole et même fusion que le site, cf. folio-server/src/merge.js)."""
import json
import os
import re
import threading
import time

from library import DATA

DID = re.compile(r"^[a-z0-9]{6,32}$")      # identifiants créés par l'éditeur ; seuls noms de fichiers acceptés
SNAPS = 20


def merge(cur, inc):
    """Métadonnées : les plus récentes gagnent (couverture absente = inchangée) ; chapitres : fusionnés un par un."""
    if not cur:
        return inc
    if (inc.get("updated") or 0) > (cur.get("updated") or 0):
        meta = dict(inc)
        if meta.get("cover") is None:
            meta["cover"] = cur.get("cover", "")
    else:
        meta = cur
    m = {c["id"]: c for c in cur.get("chapters", [])}
    for c in inc.get("chapters", []):
        old = m.get(c["id"])
        if not old or (old.get("updated") or 0) < (c.get("updated") or 0):
            m[c["id"]] = c
    return {**meta, "chapters": [] if meta.get("deleted") else list(m.values())}


def stamp(d):
    return max([d.get("updated") or 0] + [c.get("updated") or 0 for c in d.get("chapters", [])])


class Drafts:
    """Stockage partagé entre l'interface et le thread de synchro (un verrou autour de chaque lecture-écriture)."""

    def __init__(self, base=DATA / "drafts"):
        self.dir = base
        self.snapdir = base / "snaps"
        self.snapdir.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()

    def _f(self, did):
        if not DID.match(str(did)):
            raise ValueError("identifiant de manuscrit invalide")
        return self.dir / f"{did}.json"

    @staticmethod
    def _write(path, obj):
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, path)            # jamais de fichier à moitié écrit, même en cas de coupure

    def list(self):
        out = []
        for p in self.dir.glob("*.json"):
            try:
                out.append(json.loads(p.read_text(encoding="utf-8")))
            except (OSError, ValueError):
                pass
        return out

    def get(self, did):
        try:
            return json.loads(self._f(did).read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def put(self, d):
        with self.lock:
            self._write(self._f(d["id"]), d)

    def merge_in(self, did, inc):
        """Fusionne ce qui arrive du serveur avec la version locale la plus récente ; renvoie le résultat."""
        with self.lock:
            m = merge(self.get(did), inc)
            self._write(self._f(did), m)
            return m

    # ---- historique : une version par état différent, les SNAPS plus récentes ----
    def snap(self, d):
        d_dir = self.snapdir / self._f(d["id"]).stem
        d_dir.mkdir(exist_ok=True)
        files = sorted(d_dir.glob("*.json"))
        st = stamp(d)
        if files:
            try:
                if json.loads(files[-1].read_text(encoding="utf-8")).get("stamp") == st:
                    return
            except (OSError, ValueError):
                pass
        at = int(time.time() * 1000)
        self._write(d_dir / f"{at}.json", {"at": at, "stamp": st, "d": d})
        for f in sorted(d_dir.glob("*.json"))[:-SNAPS]:
            f.unlink(missing_ok=True)

    def snaps(self, did):
        d_dir = self.snapdir / self._f(did).stem
        out = []
        for f in sorted(d_dir.glob("*.json"), reverse=True) if d_dir.exists() else []:
            try:
                s = json.loads(f.read_text(encoding="utf-8"))
                out.append({"at": s["at"], "d": s["d"]})
            except (OSError, ValueError, KeyError):
                pass
        return out

    # ---- état de synchro par manuscrit : dernière révision du serveur connue, horodatage local du dernier envoi ----
    def _state_file(self):
        return self.dir / "sync.state"

    def state(self):
        try:
            return json.loads(self._state_file().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def set_state(self, did, rev, at):
        with self.lock:
            s = self.state(); s[did] = {"rev": rev, "at": at}
            self._write(self._state_file(), s)

    def forget_state(self):
        self._state_file().unlink(missing_ok=True)


def push(api, store, did):
    """Envoie ce qui a changé depuis le dernier envoi réussi ; le serveur répond avec ce qui nous manque.
    Renvoie True si la réponse apporte du nouveau (l'éditeur doit se rafraîchir)."""
    d = store.get(did)
    if not d:
        return False
    s = store.state().get(did) or {"rev": 0, "at": 0}
    st = stamp(d)
    body = {**d, "chapters": [c for c in d.get("chapters", []) if (c.get("updated") or 0) > s["at"]]}
    if not (d.get("coverAt") or 0) > s["at"]:
        body.pop("cover", None)
    r = api._json("PUT", f"/api/drafts/{did}?since={int(s['rev'])}", body)
    before = store.get(did) or d
    store.merge_in(did, r)
    store.set_state(did, r["rev"], st)
    return bool(r.get("chapters")) or r.get("cover") is not None or (r.get("updated") or 0) > (before.get("updated") or 0)


def sync_all(api, store):
    """Synchro complète : envoie les manuscrits modifiés, récupère ceux écrits ailleurs. Renvoie les ids changés."""
    remote = {x["id"]: x["rev"] for x in api._json("GET", "/api/drafts")}
    changed, state = [], store.state()
    local = store.list()
    for d in local:
        did, s = d["id"], state.get(d["id"])
        if did not in remote:
            store.set_state(did, 0, 0)
        if did not in remote or not s or s["rev"] != remote[did] or stamp(d) > s["at"]:
            if push(api, store, did):
                changed.append(did)
    have = {d["id"] for d in local}
    for did in remote:
        if did not in have and DID.match(did):
            r = api._json("GET", f"/api/drafts/{did}")
            store.put(r); store.set_state(did, r["rev"], stamp(r)); changed.append(did)
    return changed


if __name__ == "__main__":       # petit contrôle : fusion identique à celle du serveur
    ch = lambda i, h, u, dl=0: {"id": i, "title": i, "html": h, "updated": u, "deleted": dl}  # noqa: E731
    a = {"id": "d", "updated": 1, "cover": "data:x", "chapters": [ch("c1", "un", 1), ch("c2", "deux", 1)]}
    m = merge(a, {"id": "d", "updated": 2, "title": "T", "chapters": [ch("c2", "DEUX", 2)]})
    assert m["cover"] == "data:x" and [c["html"] for c in m["chapters"]] == ["un", "DEUX"] and m["title"] == "T"
    assert merge(a, {"id": "d", "updated": 3, "deleted": 1, "chapters": []})["chapters"] == []
    assert stamp(m) == 2
    print("ok")
