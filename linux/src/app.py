#!/usr/bin/env python3
"""Folio — liseuse EPUB pour Linux (GTK4 / libadwaita / WebKitGTK)."""
import json
import os
import queue
import sys
import threading
import time

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("WebKit", "6.0")
from gi.repository import Adw, Gdk, GdkPixbuf, Gio, GLib, Graphene, Gsk, Gtk, WebKit  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from library import COVERS, DATA, SYNC_KEYS, Library  # noqa: E402
import sync as syncmod  # noqa: E402
from sync import ApiSync, Sync, public_post  # noqa: E402
from i18n import LANG, T, pct  # noqa: E402

syncmod.LANG = LANG            # messages du serveur dans la langue de l'interface

SHARE = os.path.dirname(os.path.abspath(__file__))
APP_ID = "org.folio.Reader"
THEMES = {  # nom: (fond, texte, libellé)
    "clair": ("#fbfbfa", "#222222", "Clair"),
    "sepia": ("#f4ecd8", "#5b4636", "Sépia"),
    "sombre": ("#1e1f24", "#d6d6d6", "Sombre"),
    "noir": ("#000000", "#b8b8b8", "Noir"),
    "gris": ("#e8e8e6", "#2b2b2b", "Gris"),
    "nuit": ("#141a24", "#c9d1dc", "Nuit"),
    "foret": ("#1c2420", "#cdd8c4", "Forêt"),
}
INDENTS = [(-1, "Celui du livre"), (0, "Aucun"), (1.5, "Normal"), (3, "Large")]
WEIGHTS = {300: "Fine", 400: "Normale", 500: "Moyenne", 600: "Demi-grasse", 700: "Grasse"}
# serveur proposé par défaut à la connexion : FOLIO_URL au moment de construire le paquet (config.json)
try:
    DEFAULT_SERVER = json.load(open(os.path.join(SHARE, "config.json"))).get("server", "")
except (OSError, ValueError):
    DEFAULT_SERVER = ""
HL_COLORS = {"yellow": "#f6d55c", "green": "#7bd88f", "blue": "#6cb6ff", "pink": "#ff8fb1"}


def load_css(provider, css):
    try:
        provider.load_from_string(css)
    except AttributeError:
        provider.load_from_data(css.encode())


def is_dark(hex_color):
    n = int(hex_color[1:], 16)
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.5


def rgba_to_hex(c):
    return "#%02x%02x%02x" % (round(c.red * 255), round(c.green * 255), round(c.blue * 255))


class CoverPicture(Gtk.Widget):
    """Couverture à taille fixe, recadrée comme object-fit: cover (Gtk.Picture prendrait la taille de l'image)."""

    def __init__(self, tex, w, h):
        super().__init__()
        self.tex, self.w, self.h = tex, w, h

    def do_measure(self, orientation, for_size):
        s = self.w if orientation == Gtk.Orientation.HORIZONTAL else self.h
        return s, s, -1, -1

    def do_snapshot(self, snap):
        W, H = self.get_width(), self.get_height()
        tw, th = self.tex.get_width(), self.tex.get_height()
        sc = max(W / tw, H / th); dw, dh = tw * sc, th * sc
        snap.push_clip(Graphene.Rect().init(0, 0, W, H))
        rect = Graphene.Rect().init((W - dw) / 2, (H - dh) / 2, dw, dh)
        if hasattr(snap, "append_scaled_texture"):
            snap.append_scaled_texture(self.tex, Gsk.ScalingFilter.TRILINEAR, rect)
        else:
            snap.append_texture(self.tex, rect)
        snap.pop()


class SyncWorker:
    """Fait tout le réseau hors du thread de l'interface : avant, chaque synchro figeait la fenêtre ~1 s."""

    def __init__(self):
        self.q = queue.Queue()
        threading.Thread(target=self._loop, daemon=True, name="folio-sync").start()

    def submit(self, cfg, fn, done=None, fail=None):
        self.q.put((cfg, fn, done, fail))

    def _loop(self):
        lib, cfg, sync = Library(), None, None     # connexion SQLite propre à ce thread
        while True:
            c, fn, done, fail = self.q.get()
            if c != cfg:
                cfg = c
                try:
                    sync = None if not c else ApiSync(lib, c[1], c[2]) if c[0] == "api" else Sync(lib, c[1])
                except OSError:
                    sync = None
            if not sync:
                continue
            try:
                r = fn(sync)
            except Exception as e:  # noqa: BLE001 — l'erreur est relayée à l'interface
                if fail:
                    GLib.idle_add(lambda e=e: fail(e) and False)
                continue
            if done:
                GLib.idle_add(lambda r=r: done(r) and False)


class FolioWindow(Adw.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="Folio", default_width=1180, default_height=800)
        self.lib = Library()
        self.settings = self.lib.load_settings()
        self.cur = None            # livre ouvert (sqlite Row)
        self.state = {}            # dernière position reçue du lecteur
        self.web_ready = False
        self.pending_open = False
        self.updating_ui = False
        self.sync = None           # utilisé par les dialogues du compte (requêtes ponctuelles)
        self.sync_cfg = None       # configuration transmise au thread de synchro
        self.worker = SyncWorker()
        self.syncing = False
        self.last_sync = self.last_profile = 0
        self.push_id = self.set_push_id = self.apply_id = 0
        self.tex_cache = {}
        self.lib_sig = None
        self.theme_key = None
        self.theme_css = Gtk.CssProvider()
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(), self.theme_css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 1)

        self.toasts = Adw.ToastOverlay()
        self.set_content(self.toasts)
        self.stack = Gtk.Stack(transition_type=Gtk.StackTransitionType.CROSSFADE, transition_duration=180)
        self.toasts.set_child(self.stack)
        self.stack.add_named(self.build_library_page(), "library")
        self.stack.add_named(self.build_reader_page(), "reader")
        self.build_actions()
        self.apply_theme()
        self.refresh_library()
        self.init_sync()
        # synchro au retour sur la fenêtre (au plus une fois par minute) et toutes les 2 min
        self.connect("notify::is-active", lambda *_: self.is_active() and time.time() - self.last_sync > 60
                     and self.sync_now(quiet=True))
        GLib.timeout_add_seconds(120, lambda: (self.sync_now(quiet=True), True)[1])

        drop = Gtk.DropTarget.new(Gdk.FileList, Gdk.DragAction.COPY)
        drop.connect("drop", lambda t, files, x, y: self.add_files([f.get_path() for f in files.get_files()]) or True)
        self.add_controller(drop)

    # ------------------------------------------------------------------ bibliothèque
    def build_library_page(self):
        view = Adw.ToolbarView(top_bar_style=Adw.ToolbarStyle.FLAT)
        header = Adw.HeaderBar()
        header.add_css_class("lib-head")
        brand = Gtk.Box(spacing=10, margin_start=4, valign=Gtk.Align.CENTER)
        logo_path = os.path.join(SHARE, "org.folio.Reader.svg")
        if not os.path.exists(logo_path):
            logo_path = os.path.join(SHARE, "..", "packaging", "org.folio.Reader.svg")
        logo = Gtk.Image.new_from_file(logo_path) if os.path.exists(logo_path) else Gtk.Image(icon_name=APP_ID)
        logo.set_pixel_size(30); logo.add_css_class("brand-logo")
        name = Gtk.Label(label="Folio"); name.add_css_class("brand")
        brand.append(logo); brand.append(name)
        header.pack_start(brand)

        add = Gtk.Button(tooltip_text=T("Ajouter des livres (Ctrl+O)"),
                         child=Adw.ButtonContent(icon_name="list-add-symbolic", label=T("Ajouter")), valign=Gtk.Align.CENTER)
        add.add_css_class("suggested-action"); add.add_css_class("pill-small")
        add.connect("clicked", lambda *_: self.pick_files())
        pop = Gtk.Popover(); box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, margin_top=6, margin_bottom=6, margin_start=6, margin_end=6)
        self.menu_who = Gtk.Label(xalign=0, margin_start=10, margin_end=10, margin_top=4, margin_bottom=6, ellipsize=3)
        self.menu_who.add_css_class("dim-label"); self.menu_who.add_css_class("caption"); box.append(self.menu_who)
        for label, cb in ((T("Mon compte…"), self.account_dialog), (T("Dossier de synchronisation…"), self.choose_sync_dir),
                          (T("Synchroniser maintenant"), lambda: self.sync_now()), (T("Langue…"), self.language_dialog)):
            b = Gtk.Button(label=label, halign=Gtk.Align.FILL); b.add_css_class("flat")
            b.get_child().set_xalign(0)
            b.connect("clicked", lambda _b, cb=cb: (pop.popdown(), cb())); box.append(b)
        pop.set_child(box)
        self.head_avatar = Adw.Avatar(size=30, show_initials=True)
        acc_btn = Gtk.MenuButton(child=self.head_avatar, popover=pop, tooltip_text=T("Compte et synchronisation"), valign=Gtk.Align.CENTER)
        acc_btn.add_css_class("flat"); acc_btn.add_css_class("avatar-btn")
        self.sync_btn = Gtk.Button(icon_name="view-refresh-symbolic", tooltip_text=T("Synchroniser"), valign=Gtk.Align.CENTER)
        self.sync_btn.add_css_class("flat"); self.sync_btn.add_css_class("circ")
        self.sync_btn.connect("clicked", lambda *_: self.sync_now())
        header.pack_end(add); header.pack_end(acc_btn); header.pack_end(self.sync_btn)
        view.add_top_bar(header)

        self.search = Gtk.SearchEntry(placeholder_text=T("Rechercher un titre, un auteur…"), hexpand=True)
        self.search.add_css_class("lib-search")
        self.search.connect("search-changed", lambda *_: self.apply_filter())
        header.set_title_widget(Adw.Clamp(maximum_size=420, child=self.search, hexpand=True))
        header.set_show_title(True)

        self.flow = Gtk.FlowBox(valign=Gtk.Align.START, homogeneous=True, min_children_per_line=2,
                                max_children_per_line=12, column_spacing=22, row_spacing=30,
                                selection_mode=Gtk.SelectionMode.NONE, activate_on_single_click=True)
        self.flow.connect("child-activated", lambda fb, child: self.open_book(child.book_id) if child.book_id
                          else self.pick_files())
        self.flow.set_filter_func(self.book_visible)
        self.query, self.shelf = "", "all"

        # accueil : « Bonsoir, Prénom » + petites statistiques
        welcome = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin_top=10, margin_bottom=4)
        self.greet = Gtk.Label(xalign=0, ellipsize=3); self.greet.add_css_class("greet")
        self.stats = Gtk.Label(xalign=0); self.stats.add_css_class("muted")
        welcome.append(self.greet); welcome.append(self.stats)
        self.hero = Gtk.Box()

        # étagères : Tous / En cours / À lire / Terminés
        sect = Gtk.Box(spacing=8, margin_top=10, margin_bottom=4)
        st = Gtk.Label(label=T("Bibliothèque"), xalign=0, margin_end=10); st.add_css_class("section-title")
        sect.append(st)
        self.chips, first = {}, None
        for key, label in (("all", T("Tous")), ("reading", T("En cours")), ("unread", T("À lire")), ("done", T("Terminés"))):
            c = Gtk.ToggleButton(label=label, group=first, active=key == "all", valign=Gtk.Align.CENTER)
            c.add_css_class("chip"); first = first or c
            c.connect("toggled", lambda b, k=key: b.get_active() and self.set_shelf(k))
            sect.append(c); self.chips[key] = c
        self.count = Gtk.Label(hexpand=True, xalign=1); self.count.add_css_class("muted"); self.count.add_css_class("caption")
        sect.append(self.count)
        # collections : une puce par collection (même groupe que les étagères) + « Nouvelle collection »
        self.coll_row = Gtk.Box(spacing=8, margin_bottom=4)
        self.coll_scroll = Gtk.ScrolledWindow(child=self.coll_row, vscrollbar_policy=Gtk.PolicyType.NEVER,
                                              hscrollbar_policy=Gtk.PolicyType.AUTOMATIC, propagate_natural_height=True)
        self.coll_map, self.coll_names = {}, {}
        self.nomatch = Gtk.Label(margin_top=40, visible=False)
        self.nomatch.add_css_class("muted")
        page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12, margin_top=2, margin_bottom=40,
                       margin_start=28, margin_end=28)
        page.append(welcome); page.append(self.hero); page.append(sect); page.append(self.coll_scroll)
        page.append(self.flow); page.append(self.nomatch)
        clamp = Adw.Clamp(maximum_size=1240, tightening_threshold=1000, child=page)
        scroller = Gtk.ScrolledWindow(vexpand=True, child=clamp, hscrollbar_policy=Gtk.PolicyType.NEVER)

        empty = Adw.StatusPage(icon_name="library-symbolic", title=T("Votre bibliothèque est vide"),
                               description=T("Ajoutez des fichiers EPUB ou glissez-les dans cette fenêtre.\nConnectez-vous pour retrouver ceux de vos autres appareils."))
        empty.add_css_class("empty-lib")
        btn = Gtk.Button(child=Adw.ButtonContent(icon_name="list-add-symbolic", label=T("Ajouter un livre")), halign=Gtk.Align.CENTER)
        btn.add_css_class("suggested-action"); btn.add_css_class("pill")
        btn.connect("clicked", lambda *_: self.pick_files())
        empty.set_child(btn)
        self.lib_stack = Gtk.Stack(transition_type=Gtk.StackTransitionType.CROSSFADE)
        self.lib_stack.add_named(scroller, "books")
        self.lib_stack.add_named(empty, "empty")
        view.set_content(self.lib_stack)
        return view

    def cover_texture(self, path):
        """Vignette de couverture (360 px de large, mise en cache sur disque et en mémoire)."""
        if path in self.tex_cache:
            return self.tex_cache[path]
        tex = None
        try:
            thumb = COVERS / f"thumb-{os.path.splitext(os.path.basename(path))[0]}.png"
            if not thumb.exists() or thumb.stat().st_mtime < os.path.getmtime(path):
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 360, 540, True)
                pb.savev(str(thumb), "png", [], [])
            tex = Gdk.Texture.new_from_filename(str(thumb))
        except (GLib.Error, OSError):
            pass
        self.tex_cache[path] = tex
        return tex

    def cover_widget(self, b, w=150, h=225):
        box = Gtk.Box(width_request=w, height_request=h, overflow=Gtk.Overflow.HIDDEN, valign=Gtk.Align.START,
                      halign=Gtk.Align.START, hexpand=False)
        box.add_css_class("cover")
        path = Library.shown_cover(b)
        tex = self.cover_texture(path) if path and os.path.exists(path) else None
        if tex:
            box.append(CoverPicture(tex, w, h))
        else:
            box.add_css_class(f"g{int((b['hash'] or '0')[:4], 16) % 6}")
            lbl = Gtk.Label(label=b["title"], wrap=True, xalign=0, hexpand=True, valign=Gtk.Align.END,
                            ellipsize=3, lines=5, margin_start=14, margin_end=14, margin_bottom=14,
                            max_width_chars=1, wrap_mode=2)
            lbl.add_css_class("ph-title")
            if w < 120:
                lbl.add_css_class("ph-small"); lbl.set_margin_start(9); lbl.set_margin_end(9); lbl.set_margin_bottom(9)
            box.append(lbl)
        return box

    def make_card(self, b):
        card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, width_request=150)
        card.add_css_class("book-card")
        p = b["progress"] or 0
        overlay = Gtk.Overlay(child=self.cover_widget(b), halign=Gtk.Align.START)
        if p > .98:
            badge = Gtk.Label(label=T("Terminé"), halign=Gtk.Align.START, valign=Gtk.Align.START, margin_top=8, margin_start=8)
            badge.add_css_class("badge"); overlay.add_overlay(badge)
        menu = Gtk.MenuButton(icon_name="view-more-symbolic", halign=Gtk.Align.END, valign=Gtk.Align.START,
                              margin_top=6, margin_end=6, direction=Gtk.ArrowType.NONE, tooltip_text=T("Options"))
        menu.add_css_class("circular"); menu.add_css_class("card-menu")
        menu.set_popover(Gtk.Popover())
        menu.set_create_popup_func(lambda m, bid=b["id"]: self.book_popover(m, bid))
        overlay.add_overlay(menu)
        right = Gtk.GestureClick(button=3)
        right.connect("pressed", lambda *_: menu.popup())
        card.add_controller(right)
        card.append(overlay)
        title = Gtk.Label(label=b["title"], xalign=0, ellipsize=3, lines=2, wrap=True, max_width_chars=1,
                          margin_top=10, hexpand=True)
        title.add_css_class("card-title")
        card.append(title)
        a = Gtk.Label(label=b["author"] or " ", xalign=0, ellipsize=3, max_width_chars=1, hexpand=True, margin_top=2)
        a.add_css_class("card-author")
        card.append(a)
        if 0 < p <= .98:
            card.append(self.progress_row(p))
        return card

    @staticmethod
    def progress_row(p):
        row = Gtk.Box(spacing=8, margin_top=7)
        pb = Gtk.ProgressBar(fraction=min(p, 1.0), hexpand=True, valign=Gtk.Align.CENTER)
        pb.add_css_class("thin")
        s = Gtk.Label(label=T("Terminé") if p > .98 else pct(p))
        s.add_css_class("caption"); s.add_css_class("muted")
        row.append(pb); row.append(s)
        return row

    @staticmethod
    def shelf_of(b):
        p = b["progress"] or 0
        return "done" if p > .98 else "reading" if p > 0 or b["last_read"] else "unread"

    def book_visible(self, child):
        if child.book_id is None:                       # tuile « Ajouter »
            return not self.query and self.shelf == "all"
        if self.shelf.startswith("c:"):
            ok = child.hash in self.coll_map.get(self.shelf[2:], ())
        else:
            ok = self.shelf in ("all", child.shelf)
        return (not self.query or self.query in child.search_text) and ok

    def set_shelf(self, key):
        self.shelf = key
        self.coll_menu.set_visible(key.startswith("c:"))
        self.apply_filter()

    # ------------------------------------------------------------------ collections
    def fill_collections(self, books=None):
        books = self.lib.books() if books is None else books
        have = {b["hash"] for b in books}
        row = self.coll_row
        c = row.get_first_child()
        while c:
            nxt = c.get_next_sibling(); row.remove(c); c = nxt
        colls = self.lib.collections()
        self.coll_map = {c["id"]: set(c["books"]) for c in colls}
        self.coll_names = {c["id"]: c["name"] for c in colls}
        if self.shelf.startswith("c:") and self.shelf[2:] not in self.coll_map:
            self.shelf = "all"; self.chips["all"].set_active(True)
        lbl = Gtk.Label(label=T("Collections"), xalign=0, margin_end=6); lbl.add_css_class("coll-title"); row.append(lbl)
        for c in colls:
            n = len(self.coll_map[c["id"]] & have)
            b = Gtk.ToggleButton(group=self.chips["all"], valign=Gtk.Align.CENTER, tooltip_text=c["name"])
            inner = Gtk.Box(spacing=7)
            inner.append(Gtk.Image(icon_name="folder-symbolic"))
            inner.append(Gtk.Label(label=c["name"], ellipsize=3, max_width_chars=22))
            cnt = Gtk.Label(label=str(n)); cnt.add_css_class("chip-count"); inner.append(cnt)
            b.set_child(inner); b.add_css_class("chip")
            b.set_active(self.shelf == "c:" + c["id"])
            b.connect("toggled", lambda w, k="c:" + c["id"]: w.get_active() and self.set_shelf(k))
            rc = Gtk.GestureClick(button=3)
            rc.connect("pressed", lambda *_a, w=b: (w.set_active(True), self.coll_menu.popup()))
            b.add_controller(rc)
            row.append(b)
        new = Gtk.Button(child=Adw.ButtonContent(icon_name="list-add-symbolic", label=T("Nouvelle collection")), valign=Gtk.Align.CENTER)
        new.add_css_class("chip"); new.add_css_class("chip-new")
        new.connect("clicked", lambda *_a: self.new_collection_dialog())
        row.append(new)
        self.coll_menu = Gtk.MenuButton(icon_name="view-more-symbolic", tooltip_text=T("Options de la collection"),
                                        valign=Gtk.Align.CENTER, visible=self.shelf.startswith("c:"))
        self.coll_menu.add_css_class("flat"); self.coll_menu.add_css_class("circular")
        self.coll_menu.set_popover(Gtk.Popover())
        self.coll_menu.set_create_popup_func(self.collection_popover)
        row.append(self.coll_menu)

    def collections_changed(self, select=None):
        if select:
            self.shelf = "c:" + select
        self.fill_collections(); self.apply_filter()
        self.push_collections_soon()

    def push_collections_soon(self):
        if not self.sync:
            return
        if getattr(self, "coll_push_id", 0):
            GLib.source_remove(self.coll_push_id)

        def go():
            self.coll_push_id = 0
            self.worker.submit(self.sync_cfg, lambda s: s.collections(),
                               lambda ch: ch and self.stack.get_visible_child_name() == "library" and self.collections_changed_remote())
            return False
        self.coll_push_id = GLib.timeout_add(1500, go)

    def collections_changed_remote(self):
        self.fill_collections(); self.apply_filter()

    def ask_text(self, heading, text, ok, cb):
        d = Adw.AlertDialog(heading=heading)
        e = Gtk.Entry(text=text, max_length=80, activates_default=True, placeholder_text=T("Nom de la collection"))
        d.set_extra_child(e)
        d.add_response("cancel", T("Annuler")); d.add_response("ok", ok)
        d.set_response_appearance("ok", Adw.ResponseAppearance.SUGGESTED); d.set_default_response("ok")
        d.connect("response", lambda _d, r: r == "ok" and e.get_text().strip() and cb(e.get_text().strip()))
        d.present(self)
        GLib.idle_add(lambda: e.grab_focus() and False)

    def new_collection_dialog(self, add_hash=None):
        def made(name):
            cid = self.lib.new_collection(name, [add_hash] if add_hash else [])
            self.toast(T("Collection « {t} » créée", t=name)); self.collections_changed(select=cid)
        self.ask_text(T("Nouvelle collection"), "", T("Créer"), made)

    def collection_popover(self, btn):
        cid = self.shelf[2:] if self.shelf.startswith("c:") else None
        if not cid:
            return
        pop = Gtk.Popover()
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin_top=6, margin_bottom=6, margin_start=6, margin_end=6)
        def item(label, cb, cls=None):
            b = Gtk.Button(label=label); b.add_css_class("flat"); b.get_child().set_xalign(0)
            if cls: b.add_css_class(cls)
            b.connect("clicked", lambda *_a: (pop.popdown(), cb())); box.append(b)
        item(T("Ajouter des livres…"), lambda: self.pick_books(cid))
        item(T("Renommer…"), lambda: self.ask_text(T("Renommer la collection"), self.coll_names.get(cid, ""), T("Renommer"),
                                                    lambda n: (self.lib.set_collection(cid, name=n), self.collections_changed())))
        item(T("Supprimer la collection"), lambda: self.confirm_delete_collection(cid), "destructive-action")
        pop.set_child(box); btn.set_popover(pop)

    def confirm_delete_collection(self, cid):
        d = Adw.AlertDialog(heading=T("Supprimer la collection « {t} » ?", t=self.coll_names.get(cid, "")),
                            body=T("Les livres restent dans votre bibliothèque."))
        d.add_response("cancel", T("Annuler")); d.add_response("del", T("Supprimer"))
        d.set_response_appearance("del", Adw.ResponseAppearance.DESTRUCTIVE)
        def resp(_d, r):
            if r == "del":
                self.lib.set_collection(cid, deleted=True); self.shelf = "all"; self.chips["all"].set_active(True)
                self.collections_changed(); self.toast(T("Collection supprimée"))
        d.connect("response", resp); d.present(self)

    def pick_books(self, cid):
        c = self.lib.collection(cid)
        if not c:
            return
        d = Adw.AlertDialog(heading=T("Ajouter à « {t} »", t=c["name"]))
        lb = Gtk.ListBox(selection_mode=Gtk.SelectionMode.NONE); lb.add_css_class("boxed-list")
        for b in sorted(self.lib.books(), key=lambda x: (x["title"] or "").lower()):
            row = Adw.ActionRow(title=GLib.markup_escape_text(b["title"] or ""), subtitle=GLib.markup_escape_text(b["author"] or ""), activatable=True)
            ck = Gtk.CheckButton(active=b["hash"] in c["books"], valign=Gtk.Align.CENTER)
            ck.connect("toggled", lambda w, h=b["hash"]: self.lib.toggle_in_collection(cid, h, w.get_active()))
            row.add_prefix(ck); row.set_activatable_widget(ck); lb.append(row)
        sc = Gtk.ScrolledWindow(child=lb, propagate_natural_height=True, max_content_height=420, min_content_width=360,
                                hscrollbar_policy=Gtk.PolicyType.NEVER)
        d.set_extra_child(sc)
        d.add_response("ok", T("OK")); d.set_default_response("ok")
        d.connect("response", lambda *_a: self.collections_changed())
        d.present(self)

    # ------------------------------------------------------------------ menu d'un livre
    def book_popover(self, menu, bid):
        b = self.lib.book(bid)
        if not b:
            return
        pop = Gtk.Popover()
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, margin_top=8, margin_bottom=6, margin_start=6, margin_end=6,
                      width_request=250)
        h = Gtk.Label(label=T("Collections").upper(), xalign=0, margin_start=8, margin_bottom=2); h.add_css_class("sub-head"); box.append(h)
        for c in self.lib.collections():
            ck = Gtk.CheckButton(label=c["name"], active=b["hash"] in c["books"], margin_start=4)
            ck.connect("toggled", lambda w, cid=c["id"]: (self.lib.toggle_in_collection(cid, b["hash"], w.get_active()),
                                                          self.collections_changed()))
            box.append(ck)
        def item(label, icon, cb, cls=None):
            bt = Gtk.Button(child=Adw.ButtonContent(icon_name=icon, label=label, halign=Gtk.Align.START)); bt.add_css_class("flat")
            if cls: bt.add_css_class(cls)
            bt.connect("clicked", lambda *_a: (pop.popdown(), cb())); box.append(bt)
        item(T("Nouvelle collection…"), "list-add-symbolic", lambda: self.new_collection_dialog(b["hash"]))
        box.append(Gtk.Separator(margin_top=4, margin_bottom=4))
        st = self.shelf_of(b)
        if st != "done":
            item(T("Marquer comme terminé"), "object-select-symbolic", lambda: self.mark_status(bid, "done"))
        if st != "unread":
            item(T("Marquer comme non lu"), "view-refresh-symbolic", lambda: self.mark_status(bid, "unread"))
        box.append(Gtk.Separator(margin_top=4, margin_bottom=4))
        item(T("Changer la couverture…"), "image-x-generic-symbolic", lambda: self.pick_cover(bid))
        if b["custom_cover"]:
            item(T("Couverture d’origine"), "edit-undo-symbolic", lambda: self.set_cover(bid, None))
        box.append(Gtk.Separator(margin_top=4, margin_bottom=4))
        item(T("Retirer de la bibliothèque"), "user-trash-symbolic", lambda: self.confirm_remove(bid, b["title"]), "destructive-action")
        pop.set_child(box); menu.set_popover(pop)

    def mark_status(self, bid, st):
        self.lib.set_status(bid, st)
        self.toast(T("Rangé dans « Terminés »") if st == "done" else T("Rangé dans « À lire »"))
        self.refresh_library()
        if self.sync:
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, force=False))

    # ------------------------------------------------------------------ couvertures personnalisées
    def pick_cover(self, bid):
        flt = Gtk.FileFilter(name=T("Images"))
        for m in ("image/png", "image/jpeg", "image/webp", "image/gif"):
            flt.add_mime_type(m)
        fl = Gio.ListStore.new(Gtk.FileFilter); fl.append(flt)
        def picked(d, res):
            try:
                f = d.open_finish(res)
            except GLib.Error:
                return
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(f.get_path(), 600, 900, True)
                pb = pb.apply_embedded_orientation() or pb
                ok, buf = pb.save_to_bufferv("jpeg", ["quality"], ["88"])
            except GLib.Error as e:
                return self.toast(T("Image illisible : {e}", e=e.message))
            self.set_cover(bid, bytes(buf))
        Gtk.FileDialog(title=T("Choisir une couverture"), filters=fl).open(self, None, picked)

    def set_cover(self, bid, data):
        self.lib.set_custom_cover(bid, data)
        if self.cur and self.cur["id"] == bid:
            self.cur = self.lib.book(bid)
        self.toast(T("Couverture mise à jour") if data else T("Couverture d’origine rétablie"))
        if self.stack.get_visible_child_name() == "library":
            self.refresh_library()
        if self.sync:
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, force=False))

    # ------------------------------------------------------------------ langue
    def language_dialog(self):
        d = Adw.AlertDialog(heading=T("Langue"), body=T("Folio va redémarrer pour changer de langue."))
        d.add_response("cancel", T("Annuler")); d.add_response("auto", T("Automatique (langue du système)"))
        d.add_response("fr", "Français"); d.add_response("en", "English")
        d.set_response_appearance(LANG, Adw.ResponseAppearance.SUGGESTED)
        d.set_prefer_wide_layout(True)
        def resp(_d, r):
            if r == "cancel":
                return
            if r == "auto":
                self.settings.pop("lang", None)
            else:
                self.settings["lang"] = r
            self.lib.save_settings(self.settings)
            if isinstance(self.sync, ApiSync) and r in ("fr", "en"):
                try:
                    self.sync.set_lang(r)
                except OSError:
                    pass
            os.execv(sys.executable, [sys.executable, os.path.abspath(sys.argv[0])] + sys.argv[1:])
        d.connect("response", resp); d.present(self)

    def make_add_tile(self):
        tile = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10, width_request=150, height_request=225,
                       valign=Gtk.Align.START, halign=Gtk.Align.START)
        tile.add_css_class("add-tile")
        inner = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10, vexpand=True, valign=Gtk.Align.CENTER)
        ic = Gtk.Image(icon_name="list-add-symbolic", pixel_size=24, halign=Gtk.Align.CENTER); ic.add_css_class("add-ic")
        lb = Gtk.Label(label=T("Ajouter des livres"), wrap=True, justify=Gtk.Justification.CENTER)
        hint = Gtk.Label(label=T("ou glissez des EPUB ici"), wrap=True, justify=Gtk.Justification.CENTER)
        hint.add_css_class("caption"); hint.add_css_class("muted")
        for w in (ic, lb, hint):
            inner.append(w)
        tile.append(inner); tile.set_cursor_from_name("pointer")
        return tile

    def update_welcome(self, books=None):
        books = self.lib.books() if books is None else books
        h = time.localtime().tm_hour
        hello = T("Bonjour") if 5 <= h < 13 else T("Bon après-midi") if h < 18 else T("Bonsoir")
        acc = self.settings.get("account") or {}
        name = (acc.get("name") or "").split(" ")[0]
        self.greet.set_label(f"{hello}, {name}" if name else hello)
        n = {k: 0 for k in ("reading", "unread", "done")}
        for b in books:
            n[self.shelf_of(b)] += 1
        parts = [T("{n} livres" if len(books) > 1 else "{n} livre", n=len(books))]
        if n["reading"]: parts.append(T("{n} en cours", n=n["reading"]))
        if n["done"]: parts.append(T("{n} terminés" if n["done"] > 1 else "{n} terminé", n=n["done"]))
        self.stats.set_label(" · ".join(parts))

    @staticmethod
    def ago(ts):
        if not ts:
            return ""
        d = time.time() - ts
        if d < 90: return T("à l’instant")
        if d < 3600: return T("il y a {n} min", n=int(d // 60))
        if d < 86400: return T("il y a {n} h", n=int(d // 3600))
        if d < 2 * 86400: return T("hier")
        if d < 30 * 86400: return T("il y a {n} jours", n=int(d // 86400))
        return time.strftime(T("le %d/%m/%Y"), time.localtime(ts))

    def make_hero(self, b):
        """Grande carte « Reprendre la lecture » en haut de la bibliothèque."""
        box = Gtk.Box(spacing=20, hexpand=True)
        box.append(self.cover_widget(b, 104, 156))
        meta = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2, valign=Gtk.Align.CENTER, hexpand=True)
        k = Gtk.Label(label=T("REPRENDRE LA LECTURE"), xalign=0); k.add_css_class("kicker")
        t = Gtk.Label(label=b["title"], xalign=0, wrap=True, lines=2, ellipsize=3, margin_top=4); t.add_css_class("hero-title")
        meta.append(k); meta.append(t)
        if b["author"]:
            a = Gtk.Label(label=b["author"], xalign=0, ellipsize=3); a.add_css_class("muted"); meta.append(a)
        pr = self.progress_row(b["progress"] or 0); pr.set_size_request(340, -1); pr.set_halign(Gtk.Align.START); pr.set_margin_top(14)
        meta.append(pr)
        when = self.ago(b["last_read"])
        if when:
            w = Gtk.Label(label=T("Lu {when}", when=when), xalign=0, margin_top=6); w.add_css_class("caption"); w.add_css_class("muted")
            meta.append(w)
        box.append(meta)
        go = Gtk.Button(child=Adw.ButtonContent(icon_name="media-playback-start-symbolic", label=T("Continuer")),
                        valign=Gtk.Align.CENTER, margin_end=6)
        go.add_css_class("suggested-action"); go.add_css_class("pill")
        go.connect("clicked", lambda *_: self.open_book(b["id"]))
        box.append(go)
        box.add_css_class("hero"); box.set_cursor_from_name("pointer")
        click = Gtk.GestureClick()
        click.connect("released", lambda *_: self.open_book(b["id"]))
        box.add_controller(click)
        return box

    def refresh_library(self, force=False):
        books = self.lib.books()
        sig = tuple((b["id"], b["title"], b["author"], Library.shown_cover(b), round(b["progress"] or 0, 3)) for b in books)
        if sig != self.lib_sig or force:          # sinon rien n'a changé : on évite de tout reconstruire
            self.lib_sig = sig
            child = self.flow.get_first_child()
            while child:
                nxt = child.get_next_sibling(); self.flow.remove(child); child = nxt
            for b in books:
                fc = Gtk.FlowBoxChild(child=self.make_card(b))
                fc.book_id = b["id"]; fc.search_text = f"{b['title']} {b['author'] or ''}".lower()
                fc.shelf = self.shelf_of(b); fc.hash = b["hash"]
                self.flow.append(fc)
            fc = Gtk.FlowBoxChild(child=self.make_add_tile()); fc.book_id = None; fc.search_text = ""; fc.shelf = ""; fc.hash = ""
            self.flow.append(fc)
            c = self.hero.get_first_child()
            if c:
                self.hero.remove(c)
            last = next((b for b in books if (b["last_read"] or (b["progress"] or 0) > 0) and (b["progress"] or 0) <= .98), None)
            if last:
                self.hero.append(self.make_hero(last))
            self.total = len(books)
            self.update_welcome(books)
            self.lib_stack.set_visible_child_name("books" if books else "empty")
        self.fill_collections(books)
        self.apply_filter()

    def apply_filter(self):
        self.query = self.search.get_text().strip().lower()
        self.flow.invalidate_filter()
        n = getattr(self, "total", 0)
        shown, c = 0, self.flow.get_first_child()
        while c:
            shown += c.book_id is not None and self.book_visible(c); c = c.get_next_sibling()
        self.hero.set_visible(not self.query and self.shelf == "all")
        empty = {"reading": T("Aucun livre en cours."), "unread": T("Tous vos livres ont été commencés."),
                 "done": T("Aucun livre terminé pour l’instant.")}
        coll = T("Cette collection est vide : ajoutez-y des livres depuis leur menu ⋯")
        self.nomatch.set_label(T("Aucun livre ne correspond à cette recherche.") if self.query
                               else coll if self.shelf.startswith("c:") else empty.get(self.shelf, ""))
        self.nomatch.set_visible(not shown and (bool(self.query) or self.shelf != "all"))
        self.count.set_label(("" if shown == n else f"{shown} / ") + T("{n} livres" if n > 1 else "{n} livre", n=n))

    def pick_files(self):
        flt = Gtk.FileFilter(name=T("Livres EPUB")); flt.add_pattern("*.epub"); flt.add_mime_type("application/epub+zip")
        filters = Gio.ListStore.new(Gtk.FileFilter); filters.append(flt)
        dlg = Gtk.FileDialog(title=T("Ajouter des livres"), filters=filters)

        def done(d, res):
            try:
                files = d.open_multiple_finish(res)
            except GLib.Error:
                return
            self.add_files([files.get_item(i).get_path() for i in range(files.get_n_items())])
        dlg.open_multiple(self, None, done)

    def add_files(self, paths):
        added, last = 0, None
        for p in paths:
            if not p or not p.lower().endswith(".epub"):
                continue
            try:
                bid, new = self.lib.add_book(p)
                added += new; last = bid
            except Exception as e:  # fichier illisible
                self.toast(T("Impossible d’ajouter « {f} » ({e})", f=os.path.basename(p), e=e))
        self.refresh_library()
        if added:
            self.toast(T("{n} livres ajoutés" if added > 1 else "{n} livre ajouté", n=added))
        return last

    def confirm_remove(self, bid, title):
        d = Adw.AlertDialog(heading=T("Retirer ce livre ?"),
                            body=T("« {t} » sera retiré de la bibliothèque, ainsi que ses marque-pages et surlignages.", t=title))
        d.add_response("cancel", T("Annuler")); d.add_response("remove", T("Retirer"))
        d.set_response_appearance("remove", Adw.ResponseAppearance.DESTRUCTIVE)
        d.connect("response", lambda _d, r: (r == "remove") and self.do_remove(bid))
        d.present(self)

    # ------------------------------------------------------------------ synchronisation
    def init_sync(self):
        d, acc = self.settings.get("sync_dir"), self.settings.get("account")
        self.sync, self.sync_cfg = None, None
        try:
            if acc:
                self.sync = ApiSync(self.lib, acc["server"], acc["token"])
                self.sync_cfg = ("api", acc["server"], acc["token"])
            elif d and os.path.isdir(d):
                self.sync = Sync(self.lib, d)
                self.sync_cfg = ("dir", d)
        except OSError:
            self.sync, self.sync_cfg = None, None
        self.update_avatar_widgets()
        if self.sync:
            self.sync_now(quiet=True, profile=True)

    # ------------------------------------------------------------------ compte / profil
    AVATAR = DATA / "avatar.img"

    def avatar_texture(self):
        try:
            return Gdk.Texture.new_from_filename(str(self.AVATAR)) if self.AVATAR.exists() else None
        except GLib.Error:
            return None

    def update_avatar_widgets(self):
        acc = self.settings.get("account") or {}
        name = acc.get("name") or acc.get("email", "")
        tex = self.avatar_texture() if acc else None
        for av in [self.head_avatar] + ([self.big_avatar] if getattr(self, "big_avatar", None) else []):
            av.set_text(name or "Folio"); av.set_show_initials(bool(acc)); av.set_custom_image(tex)
            if not acc:
                av.set_icon_name("avatar-default-symbolic")
        self.menu_who.set_label(f"{acc.get('name') or T('Connecté')} · {acc['email']}" if acc else T("Non connecté"))
        if hasattr(self, "greet"):
            self.update_welcome()

    def fetch_profile(self, sync, known_avatar):
        """Réseau seulement (appelable depuis le thread de synchro). Retourne (me, image | None | False=inchangée)."""
        me = sync.me()
        data = False
        if me.get("avatar", 0) != known_avatar or (me.get("avatar") and not self.AVATAR.exists()):
            data = sync.get_avatar() if me.get("avatar") else None
        return me, data

    def apply_profile(self, me, data):
        if data is not False:
            if data:
                self.AVATAR.write_bytes(data)
            else:
                self.AVATAR.unlink(missing_ok=True)
        acc = self.settings.get("account")
        if not acc:
            return
        acc.update(name=me.get("name", ""), avatar=me.get("avatar", 0), email=me.get("email", acc["email"]))
        self.lib.save_settings(self.settings)
        self.me = me
        self.update_avatar_widgets()

    def refresh_profile(self):
        """Version immédiate, utilisée à l'ouverture du dialogue du compte."""
        if not isinstance(self.sync, ApiSync):
            return
        self.apply_profile(*self.fetch_profile(self.sync, self.settings["account"].get("avatar", 0)))

    def api_try(self, fn, ok=None):
        """Appelle le serveur ; affiche l'erreur renvoyée sous forme de toast. Retourne le résultat ou None."""
        import urllib.error
        try:
            r = fn()
        except urllib.error.HTTPError as e:
            try: m = json.load(e)["error"]
            except Exception: m = T("Erreur {n}", n=e.code)
            self.toast(m); return None
        except (OSError, ValueError) as e:
            self.toast(T("Serveur injoignable : {e}", e=e)); return None
        if ok:
            self.toast(ok)
        return r if r is not None else True

    def account_dialog(self):
        if self.settings.get("account") and isinstance(self.sync, ApiSync):
            return self.profile_dialog()
        return self.login_dialog()

    def profile_dialog(self):
        acc = self.settings["account"]
        self.api_try(self.refresh_profile)
        me = getattr(self, "me", {}) or {}
        dlg = Adw.PreferencesDialog(title=T("Mon compte"), search_enabled=False)
        dlg.connect("closed", lambda *_: setattr(self, "big_avatar", None))

        # ---- page Profil
        page = Adw.PreferencesPage(title=T("Profil"), icon_name="avatar-default-symbolic")
        top = Adw.PreferencesGroup()
        hb = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10, halign=Gtk.Align.CENTER, margin_bottom=6)
        self.big_avatar = Adw.Avatar(size=112, show_initials=True)
        hb.append(self.big_avatar)
        nm = Gtk.Label(); nm.add_css_class("title-2"); hb.append(nm)
        em = Gtk.Label(label=acc["email"]); em.add_css_class("dim-label"); hb.append(em)
        btns = Gtk.Box(spacing=8, halign=Gtk.Align.CENTER, margin_top=4)
        ch = Gtk.Button(label=T("Changer la photo")); ch.add_css_class("pill"); ch.add_css_class("suggested-action")
        rm = Gtk.Button(label=T("Retirer")); rm.add_css_class("pill")
        btns.append(ch); btns.append(rm); hb.append(btns)
        top.add(hb); page.add(top)

        def refresh_head():
            nm.set_label(acc.get("name") or T("Sans pseudo"))
            rm.set_sensitive(bool(acc.get("avatar")))
            self.update_avatar_widgets()
        refresh_head()

        def picked(d, res):
            try:
                f = d.open_finish(res)
            except GLib.Error:
                return
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file(f.get_path())
                pb = pb.apply_embedded_orientation() or pb
                w, h = pb.get_width(), pb.get_height(); side = min(w, h)
                sq = pb.new_subpixbuf((w - side) // 2, (h - side) // 2, side, side).scale_simple(256, 256, GdkPixbuf.InterpType.BILINEAR)
                ok, buf = sq.save_to_bufferv("png", [], [])
            except GLib.Error as e:
                return self.toast(T("Image illisible : {e}", e=e.message))
            if self.api_try(lambda: self.sync.put_avatar(bytes(buf), "image/png"), T("Photo de profil mise à jour")):
                self.api_try(self.refresh_profile); refresh_head()
        def choose(*_):
            flt = Gtk.FileFilter(name=T("Images")); flt.add_mime_type("image/png"); flt.add_mime_type("image/jpeg"); flt.add_mime_type("image/webp")
            fl = Gio.ListStore.new(Gtk.FileFilter); fl.append(flt)
            Gtk.FileDialog(title=T("Choisir une photo de profil"), filters=fl).open(self, None, picked)
        ch.connect("clicked", choose)
        def remove(*_):
            if self.api_try(self.sync.del_avatar, T("Photo retirée")):
                self.api_try(self.refresh_profile); refresh_head()
        rm.connect("clicked", remove)

        ident = Adw.PreferencesGroup(title=T("Identité"))
        pseudo = Adw.EntryRow(title=T("Pseudo"), text=acc.get("name", ""), show_apply_button=True)
        def apply_name(row):
            if self.api_try(lambda: self.sync.set_name(row.get_text()), T("Pseudo enregistré")):
                self.api_try(self.refresh_profile); refresh_head()
        pseudo.connect("apply", apply_name)
        ident.add(pseudo)
        ident.add(Adw.ActionRow(title=T("Email"), subtitle=acc["email"], subtitle_selectable=True))
        ident.add(Adw.ActionRow(title=T("Serveur"), subtitle=acc["server"], subtitle_selectable=True))
        page.add(ident)
        stats = Adw.PreferencesGroup(title=T("Bibliothèque"))
        since = str(me.get("createdAt", ""))[:10]
        if since:
            y, m, d_ = since.split("-"); since = f"{d_}/{m}/{y}"
        stats.add(Adw.ActionRow(title=T("Livres synchronisés"), subtitle=str(me.get("books", "—"))))
        stats.add(Adw.ActionRow(title=T("Membre depuis"), subtitle=since or "—"))
        page.add(stats)
        dlg.add(page)

        # ---- page Sécurité
        sec = Adw.PreferencesPage(title=T("Sécurité"), icon_name="channel-secure-symbolic")
        mfa_on = bool(me.get("mfaEnabled"))
        mg = Adw.PreferencesGroup(title=T("Double authentification"),
                                  description=T("Un code à 6 chiffres de votre application d’authentification est demandé à chaque connexion."))
        left = me.get("recoveryLeft", 0)
        mrow = Adw.ActionRow(title=T("Activée") if mfa_on else T("Désactivée"),
                             subtitle=T("{n} codes de secours restants" if left > 1 else "{n} code de secours restant", n=left) if mfa_on
                             else T("Fortement recommandée pour protéger votre compte"))
        mrow.add_prefix(Gtk.Image(icon_name="security-high-symbolic" if mfa_on else "security-low-symbolic"))
        if mfa_on:
            b1 = Gtk.Button(label=T("Nouveaux codes"), valign=Gtk.Align.CENTER); b1.add_css_class("pill")
            b1.connect("clicked", lambda *_: self.mfa_recovery(dlg))
            b2 = Gtk.Button(label=T("Désactiver"), valign=Gtk.Align.CENTER); b2.add_css_class("pill"); b2.add_css_class("destructive-action")
            b2.connect("clicked", lambda *_: self.mfa_disable(dlg))
            mrow.add_suffix(b1); mrow.add_suffix(b2)
        else:
            b = Gtk.Button(label=T("Activer"), valign=Gtk.Align.CENTER); b.add_css_class("pill"); b.add_css_class("suggested-action")
            b.connect("clicked", lambda *_: self.mfa_setup(dlg))
            mrow.add_suffix(b)
        mg.add(mrow); sec.add(mg)

        pwg = Adw.PreferencesGroup(title=T("Mot de passe"), description=T("10 caractères minimum. Les autres appareils seront déconnectés."))
        cur, new, conf = (Adw.PasswordEntryRow(title=T(t)) for t in (T("Mot de passe actuel"), T("Nouveau mot de passe"), T("Confirmer le nouveau")))
        rows = [cur, new, conf]
        code = Adw.EntryRow(title=T("Code de double authentification"), input_purpose=Gtk.InputPurpose.DIGITS) if mfa_on else None
        if code: rows.append(code)
        for r in rows: pwg.add(r)
        chg = Gtk.Button(label=T("Changer le mot de passe"), halign=Gtk.Align.END, margin_top=10); chg.add_css_class("pill")
        def change(*_):
            if new.get_text() != conf.get_text():
                return self.toast(T("Les deux mots de passe ne correspondent pas"))
            if self.api_try(lambda: self.sync.change_password(cur.get_text(), new.get_text(), code.get_text() if code else ""),
                            T("Mot de passe changé, autres appareils déconnectés")):
                for r in rows: r.set_text("")
                fill_sessions()
        chg.connect("clicked", change)
        pwg.add(chg); sec.add(pwg)

        ses = Adw.PreferencesGroup(title=T("Appareils connectés"))
        lo = Gtk.Button(label=T("Déconnecter les autres"), valign=Gtk.Align.CENTER); lo.add_css_class("flat")
        ses.set_header_suffix(lo)
        sess_rows = []
        def fill_sessions():
            for r in sess_rows: ses.remove(r)
            sess_rows.clear()
            lst = self.api_try(self.sync.sessions) or []
            for x in lst if isinstance(lst, list) else []:
                when = time.strftime(T("%d/%m/%Y %H:%M"), time.localtime(x["lastSeen"]))
                r = Adw.ActionRow(title=x["device"], subtitle=T("Dernière activité : {when} · IP {ip}", when=when, ip=x.get("ip") or "?"))
                r.add_prefix(Gtk.Image(icon_name="computer-symbolic" if "Linux" in x["device"] else "phone-symbolic"))
                if x.get("current"):
                    t = Gtk.Label(label=T("Cet appareil"), valign=Gtk.Align.CENTER); t.add_css_class("tag"); r.add_suffix(t)
                else:
                    b = Gtk.Button(icon_name="window-close-symbolic", tooltip_text=T("Déconnecter cet appareil"), valign=Gtk.Align.CENTER)
                    b.add_css_class("flat"); b.add_css_class("circular")
                    b.connect("clicked", lambda _b, sid=x["id"]: self.api_try(lambda: self.sync.revoke(sid), T("Appareil déconnecté")) and fill_sessions())
                    r.add_suffix(b)
                ses.add(r); sess_rows.append(r)
        def others(*_):
            r = self.api_try(self.sync.logout_others)
            if r: self.toast(T("{n} appareil(s) déconnecté(s)", n=r.get("closed", 0))); fill_sessions()
        lo.connect("clicked", others)
        fill_sessions(); sec.add(ses)

        me_g = Adw.PreferencesGroup()
        out = Adw.ActionRow(title=T("Se déconnecter de cet appareil"), subtitle=T("Vos livres restent sur cet ordinateur"))
        ob = Gtk.Button(label=T("Se déconnecter"), valign=Gtk.Align.CENTER); ob.add_css_class("pill")
        ob.connect("clicked", lambda *_: (dlg.close(), self.logout()))
        out.add_suffix(ob); me_g.add(out); sec.add(me_g)

        danger = Adw.PreferencesGroup(title=T("Zone sensible"))
        drow = Adw.ActionRow(title=T("Supprimer mon compte"), subtitle=T("Efface définitivement le compte et tout ce qui est stocké sur le serveur"))
        db_ = Gtk.Button(label=T("Supprimer…"), valign=Gtk.Align.CENTER); db_.add_css_class("pill"); db_.add_css_class("destructive-action")
        db_.connect("clicked", lambda *_: self.confirm_delete_account(dlg, mfa_on))
        drow.add_suffix(db_); danger.add(drow); sec.add(danger)
        dlg.add(sec)
        dlg.present(self)

    # ---- dialogues de sécurité
    def ask_secret(self, parent, heading, body, cb, password=True, code=False, ok=T("Confirmer"), destructive=False):
        """Demande mot de passe et/ou code 2FA, puis appelle cb(password, code)."""
        d = Adw.AlertDialog(heading=heading, body=body)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        pw = Gtk.PasswordEntry(placeholder_text=T("Mot de passe"), show_peek_icon=True) if password else None
        ce = Gtk.Entry(placeholder_text=T("Code à 6 chiffres ou code de secours"), input_purpose=Gtk.InputPurpose.DIGITS, max_length=11) if code else None
        for w in (pw, ce):
            if w: box.append(w); w.connect("activate", lambda *_: d.emit("response", "ok") or d.close())
        d.set_extra_child(box)
        d.add_response("cancel", T("Annuler")); d.add_response("ok", ok)
        d.set_response_appearance("ok", Adw.ResponseAppearance.DESTRUCTIVE if destructive else Adw.ResponseAppearance.SUGGESTED)
        d.set_default_response("ok")
        d.connect("response", lambda _d, r: r == "ok" and cb(pw.get_text() if pw else "", ce.get_text().strip() if ce else ""))
        d.present(parent)
        GLib.idle_add(lambda: (pw or ce).grab_focus() and False)

    def show_recovery(self, parent, codes):
        d = Adw.AlertDialog(heading=T("Codes de secours"),
                            body=T("Chaque code ne sert qu’une fois et remplace le code de l’application si vous perdez votre téléphone. Gardez-les en lieu sûr : ils ne seront plus affichés."))
        grid = Gtk.Grid(column_spacing=10, row_spacing=8, halign=Gtk.Align.CENTER, margin_top=6)
        for i, c in enumerate(codes):
            l = Gtk.Label(label=c, selectable=True); l.add_css_class("monospace"); l.add_css_class("code-chip")
            grid.attach(l, i % 2, i // 2, 1, 1)
        d.set_extra_child(grid)
        d.add_response("copy", T("Copier")); d.add_response("save", T("Enregistrer…")); d.add_response("done", T("J’ai mis mes codes en lieu sûr"))
        d.set_response_appearance("done", Adw.ResponseAppearance.SUGGESTED)
        d.set_close_response("done")
        text = T("Codes de secours Folio — chaque code ne fonctionne qu'une fois") + "\n\n" + "\n".join(codes) + "\n"
        def resp(_d, r):
            if r == "copy":
                self.get_clipboard().set(text); self.toast(T("Codes copiés")); d.present(parent)
            elif r == "save":
                def saved(fd, res):
                    try:
                        f = fd.save_finish(res); open(f.get_path(), "w").write(text); os.chmod(f.get_path(), 0o600); self.toast(T("Codes enregistrés"))
                    except GLib.Error:
                        pass
                    d.present(parent)
                Gtk.FileDialog(title=T("Enregistrer les codes de secours"), initial_name=T("folio-codes-de-secours.txt")).save(self, None, saved)
        d.connect("response", resp)
        d.present(parent)

    def mfa_setup(self, parent):
        def go(password, _code):
            r = self.api_try(lambda: self.sync.mfa_setup(password))
            if not r: return
            import base64
            png = base64.b64decode(r["qr"].split(",", 1)[1])
            tex = Gdk.Texture.new_from_bytes(GLib.Bytes.new(png))
            d = Adw.AlertDialog(heading=T("Activer la double authentification"),
                                body=T("1. Scannez ce QR code avec une application d’authentification (Aegis, 2FAS, Google Authenticator, Bitwarden…).\n2. Entrez le code à 6 chiffres qu’elle affiche."))
            box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
            pic = Gtk.Picture.new_for_paintable(tex); pic.set_size_request(220, 220); pic.set_can_shrink(False); pic.add_css_class("qr")
            pic.set_halign(Gtk.Align.CENTER); box.append(pic)
            key = Gtk.Label(label=" ".join(r["secret"][i:i + 4] for i in range(0, len(r["secret"]), 4)), selectable=True, wrap=True, justify=Gtk.Justification.CENTER)
            key.add_css_class("monospace"); key.add_css_class("dim-label"); box.append(key)
            ce = Gtk.Entry(placeholder_text=T("Code à 6 chiffres"), input_purpose=Gtk.InputPurpose.DIGITS, max_length=6); box.append(ce)
            ce.connect("activate", lambda *_: (d.emit("response", "ok"), d.close()))
            d.set_extra_child(box)
            d.add_response("cancel", T("Annuler")); d.add_response("ok", T("Activer")); d.set_response_appearance("ok", Adw.ResponseAppearance.SUGGESTED)
            def resp(_d, rr):
                if rr != "ok": return
                res = self.api_try(lambda: self.sync.mfa_enable(ce.get_text().strip()))
                if res:
                    parent.close(); self.show_recovery(self, res["recovery"]); self.toast(T("Double authentification activée"))
                else:
                    GLib.idle_add(lambda: d.present(parent) and False)
            d.connect("response", resp)
            d.present(parent)
        self.ask_secret(parent, T("Activer la double authentification"), T("Confirmez votre mot de passe pour continuer."), go)

    def mfa_disable(self, parent):
        def go(password, code):
            if self.api_try(lambda: self.sync.mfa_disable(password, code), T("Double authentification désactivée")):
                parent.close(); self.profile_dialog()
        self.ask_secret(parent, T("Désactiver la double authentification ?"), T("Votre compte ne sera plus protégé que par le mot de passe."),
                        go, code=True, ok=T("Désactiver"), destructive=True)

    def mfa_recovery(self, parent):
        def go(password, code):
            r = self.api_try(lambda: self.sync.mfa_recovery(password, code))
            if r: parent.close(); self.show_recovery(self, r["recovery"])
        self.ask_secret(parent, T("Nouveaux codes de secours"), T("Les anciens codes ne fonctionneront plus."), go, code=True, ok=T("Générer"))

    def logout(self, remote=True):
        if remote and isinstance(self.sync, ApiSync):
            self.api_try(self.sync.logout)
        self.settings.pop("account", None); self.lib.save_settings(self.settings)
        self.AVATAR.unlink(missing_ok=True); self.lib.reset_sync_marks()
        self.init_sync(); self.toast(T("Déconnecté"))

    def session_expired(self):
        self.settings.pop("account", None); self.lib.save_settings(self.settings)
        self.sync = self.sync_cfg = None; self.update_avatar_widgets()
        self.toast(T("Session expirée : reconnectez-vous (menu du compte)"))

    def confirm_delete_account(self, parent, mfa_on=False):
        def go(password, code):
            if self.api_try(lambda: self.sync.delete_account(password, code)):
                parent.close()
                self.settings.pop("account", None); self.lib.save_settings(self.settings)
                self.AVATAR.unlink(missing_ok=True); self.init_sync(); self.toast(T("Compte supprimé"))
        self.ask_secret(parent, T("Supprimer votre compte ?"),
                        T("Votre compte, vos livres synchronisés, votre progression et vos notes seront effacés du serveur. Cette action est irréversible. Les livres déjà présents sur cet ordinateur sont conservés."),
                        go, code=mfa_on, ok=T("Supprimer définitivement"), destructive=True)

    # ---- connexion
    def login_dialog(self, prefill=None):
        acc = prefill or self.settings.get("account") or {}
        d = Adw.AlertDialog(heading=T("Compte Folio"), body=T("Connectez-vous pour synchroniser vos livres, votre progression et votre apparence."))
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        server = Gtk.Entry(placeholder_text=T("https://folio.exemple.org"), text=acc.get("server", DEFAULT_SERVER))
        email = Gtk.Entry(placeholder_text=T("Email"), text=acc.get("email", ""), input_purpose=Gtk.InputPurpose.EMAIL)
        pw = Gtk.PasswordEntry(placeholder_text=T("Mot de passe (10 caractères min. pour un nouveau compte)"), show_peek_icon=True)
        for w in (server, email, pw):
            box.append(w)
        pw.connect("activate", lambda *_: (d.emit("response", "login"), d.close()))
        d.set_extra_child(box)
        d.add_response("forgot", T("Mot de passe oublié")); d.add_response("register", T("Créer le compte")); d.add_response("login", T("Connexion"))
        d.set_response_appearance("login", Adw.ResponseAppearance.SUGGESTED)
        d.set_default_response("login")
        url = lambda: server.get_text().strip().rstrip("/")
        mail = lambda: email.get_text().strip().lower()
        again = lambda: self.login_dialog({"server": url(), "email": mail()})

        def logged(token):
            self.settings["account"] = {"server": url(), "email": mail(), "token": token}
            self.lib.save_settings(self.settings); self.lib.reset_sync_marks(); self.init_sync(); self.toast(T("Connecté et synchronisé"))

        def done(_d, r):
            if r == "forgot":
                if not mail(): return self.toast(T("Saisissez d’abord votre adresse mail"))
                code, j = self.safe_post(url(), "/api/password/forgot", {"email": mail()})
                return self.info(j.get("message") or j.get("error", T("Erreur")), T("Le lien s’ouvre dans le navigateur pour choisir un nouveau mot de passe."))
            if r == "register":
                code, j = self.safe_post(url(), "/api/register", {"email": mail(), "password": pw.get_text()})
                if code != 200: self.toast(j.get("error", T("Erreur"))); return again()
                return self.info(T("Vérifiez votre boîte mail"), j.get("message", ""))
            if r != "login":
                return
            code, j = self.safe_post(url(), "/api/login", {"email": mail(), "password": pw.get_text()})
            if code == 403 and j.get("code") == "unverified":
                a = Adw.AlertDialog(heading=T("Adresse non confirmée"), body=j["error"])
                a.add_response("close", T("Fermer")); a.add_response("resend", T("Renvoyer le mail"))
                a.connect("response", lambda _a, rr: rr == "resend" and self.info(
                    self.safe_post(url(), "/api/verify/resend", {"email": mail()})[1].get("message", T("Mail renvoyé"))))
                return a.present(self)
            if code != 200:
                self.toast(j.get("error", T("Erreur {n}", n=code))); return again()
            if j.get("mfa"):
                ticket = j["ticket"]
                def second(_p, c):
                    cc, jj = self.safe_post(url(), "/api/login/mfa", {"ticket": ticket, "code": c})
                    if cc == 200: return logged(jj["token"])
                    self.toast(jj.get("error", T("Code incorrect")))
                    if jj.get("code") == "ticket": return again()
                    self.ask_secret(self, T("Double authentification"), T("Code incorrect, réessayez."), second, password=False, code=True, ok=T("Valider"))
                return self.ask_secret(self, T("Double authentification"),
                                       T("Entrez le code à 6 chiffres de votre application d’authentification, ou un code de secours."),
                                       second, password=False, code=True, ok=T("Valider"))
            logged(j["token"])
        d.connect("response", done)
        d.present(self)

    def safe_post(self, server, path, body):
        try:
            return public_post(server, path, body)
        except (OSError, ValueError) as e:
            return 0, {"error": T("Serveur injoignable : {e}", e=e)}

    def info(self, heading, body=""):
        a = Adw.AlertDialog(heading=heading, body=body); a.add_response("ok", T("OK")); a.present(self)

    def choose_sync_dir(self):
        dlg = Gtk.FileDialog(title=T("Dossier de synchronisation (Syncthing, Nextcloud, Dropbox…)"))

        def done(d, res):
            try:
                f = d.select_folder_finish(res)
            except GLib.Error:
                return
            self.settings["sync_dir"] = f.get_path(); self.lib.save_settings(self.settings)
            self.init_sync(); self.toast(T("Synchronisation activée"))
        dlg.select_folder(self, None, done)

    def sync_now(self, quiet=False, profile=False):
        if not self.sync:
            return None if quiet else self.choose_sync_dir()
        if self.syncing:
            return None
        self.syncing = True
        self.last_sync = time.time()
        self.sync_btn.add_css_class("spinning")
        mine = {k: self.settings.get(k) for k in SYNC_KEYS}
        upd = self.settings.get("settings_updated", 0)
        api = isinstance(self.sync, ApiSync)
        want_profile = api and (profile or not quiet or time.time() - self.last_profile > 600)
        known_av = (self.settings.get("account") or {}).get("avatar", 0)

        def job(s):                      # thread de synchro
            s.moved.clear()
            changed = s.pull()
            s.push_all()
            remote = s.settings(mine, upd)
            try:
                colls = s.collections()
            except (OSError, ValueError):
                colls = False
            prof = self.fetch_profile(s, known_av) if want_profile else None
            return changed, set(s.moved), remote, prof, colls

        def done(r):                     # retour dans l'interface
            self.sync_finished()
            changed, moved, remote, prof, colls = r
            self.apply_remote_settings(*remote)
            if colls and self.stack.get_visible_child_name() == "library":
                self.collections_changed_remote()
            if prof:
                self.last_profile = time.time(); self.apply_profile(*prof)
            self.after_pull(changed, moved)
            if not quiet:
                self.toast(T("Synchronisé"))

        def fail(e):
            self.sync_finished()
            if getattr(e, "code", None) == 401 and api:
                return self.session_expired()
            if not quiet:
                self.toast(T("Synchronisation impossible : {e}", e=e))
        self.worker.submit(self.sync_cfg, job, done, fail)

    def sync_finished(self):
        self.syncing = False
        self.sync_btn.remove_css_class("spinning")

    def after_pull(self, changed, moved):
        """Applique à l'écran ce que la synchro a changé dans la base."""
        in_reader = self.stack.get_visible_child_name() == "reader"
        if self.cur and self.cur["id"] in changed and in_reader:
            fresh = self.lib.book(self.cur["id"])
            if not fresh:                                # supprimé depuis un autre appareil
                return self.close_book()
            self.cur = fresh
            self.send_notes()
            if self.cur["id"] in moved and self.cur["cfi"]:   # lu plus loin ailleurs : on y va
                self.go(self.cur["cfi"]); self.toast(T("Repris à la position de l’autre appareil"))
        if not in_reader:
            self.refresh_library()

    def apply_remote_settings(self, remote, rupd):
        """Le serveur l'emporte s'il est plus récent, ou à égalité (ex. jamais modifié : horodatage 0)."""
        upd = self.settings.get("settings_updated", 0)
        mine = {k: self.settings.get(k) for k in SYNC_KEYS}
        if rupd >= upd and any(remote.get(k) != mine.get(k) for k in SYNC_KEYS if k in remote):
            self.settings.update({k: remote[k] for k in SYNC_KEYS if k in remote})
            self.settings["settings_updated"] = rupd
            self.lib.save_settings(self.settings)
            if not self.aa_btn.get_popover().get_visible():
                self.aa_btn.set_popover(self.build_settings_popover())
            self.apply_theme()
            if self.stack.get_visible_child_name() == "reader":
                self.js(f"Folio.settings({json.dumps(self.settings)})")

    def push_settings_soon(self):
        if not self.sync:
            return
        if self.set_push_id:
            GLib.source_remove(self.set_push_id)

        def go():
            self.set_push_id = 0
            mine = {k: self.settings.get(k) for k in SYNC_KEYS}
            upd = self.settings.get("settings_updated", 0)
            self.worker.submit(self.sync_cfg, lambda s: s.settings(mine, upd), lambda r: self.apply_remote_settings(*r))
            return False
        self.set_push_id = GLib.timeout_add_seconds(2, go)

    def push_soon(self):
        if not self.sync or not self.cur:
            return
        if self.push_id:
            GLib.source_remove(self.push_id)
        bid = self.cur["id"]

        def go():
            self.push_id = 0
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, force=False))
            return False
        self.push_id = GLib.timeout_add_seconds(3, go)

    def do_remove(self, bid):
        b = self.lib.book(bid)
        if self.sync and b:
            h = b["hash"]
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, removed=True, h=h))
        self.lib.remove_book(bid); self.refresh_library()

    def toast(self, text):
        self.toasts.add_toast(Adw.Toast(title=text, timeout=3))

    # ------------------------------------------------------------------ lecteur
    def build_reader_page(self):
        self.reader_view = view = Adw.ToolbarView(top_bar_style=Adw.ToolbarStyle.FLAT)
        header = Adw.HeaderBar(show_title=False)
        header.add_css_class("reader-head")
        back = Gtk.Button(icon_name="go-previous-symbolic", tooltip_text=T("Bibliothèque (Échap)"), valign=Gtk.Align.CENTER)
        back.add_css_class("circ")
        back.connect("clicked", lambda *_: self.close_book())
        tbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, valign=Gtk.Align.CENTER, margin_start=4)
        self.r_title = Gtk.Label(xalign=0, ellipsize=3, max_width_chars=60); self.r_title.add_css_class("r-title")
        self.r_sub = Gtk.Label(xalign=0, ellipsize=3, max_width_chars=70); self.r_sub.add_css_class("r-sub")
        tbox.append(self.r_title); tbox.append(self.r_sub)
        header.pack_start(back); header.pack_start(tbox)

        self.bm_btn = Gtk.Button(icon_name="folio-bookmark-symbolic", tooltip_text=T("Marque-page (Ctrl+D)"), valign=Gtk.Align.CENTER)
        self.bm_btn.add_css_class("circ")
        self.bm_btn.connect("clicked", lambda *_: self.js("Folio.toggleBookmark()"))
        self.side_btn = Gtk.ToggleButton(icon_name="view-list-bullet-symbolic", tooltip_text=T("Sommaire et notes (Ctrl+T)"), valign=Gtk.Align.CENTER)
        self.side_btn.add_css_class("circ")
        self.side_btn.connect("toggled", lambda b: self.updating_ui or self.js(f"Folio.panel({json.dumps(b.get_active())})"))
        aa_lbl = Gtk.Label(label="Aa"); aa_lbl.add_css_class("aa-label")
        self.aa_btn = aa = Gtk.MenuButton(child=aa_lbl, tooltip_text=T("Apparence (taille, police, thème)"),
                                          popover=self.build_settings_popover(), valign=Gtk.Align.CENTER)
        aa.add_css_class("circ")
        header.pack_end(aa); header.pack_end(self.side_btn); header.pack_end(self.bm_btn)
        view.add_top_bar(header)

        # WebKit : le livre, le panneau sommaire/notes et la barre de progression sont rendus en HTML
        self.web = WebKit.WebView(hexpand=True, vexpand=True)
        ws = self.web.get_settings()
        for setter in ("set_allow_file_access_from_file_urls", "set_allow_universal_access_from_file_urls"):
            getattr(ws, setter, lambda v: None)(True)
        ws.set_enable_developer_extras(bool(os.environ.get("FOLIO_DEBUG")))
        if os.environ.get("FOLIO_DEBUG"):
            ws.set_enable_write_console_messages_to_stdout(True)
        for setter, v in (("set_enable_page_cache", False), ("set_enable_back_forward_navigation_gestures", False),
                          ("set_enable_smooth_scrolling", True)):
            getattr(ws, setter, lambda _v: None)(v)
        self.web.set_settings(ws)
        self.web.set_background_color(Gdk.RGBA(alpha=0))
        ucm = self.web.get_user_content_manager()
        ucm.register_script_message_handler("folio", None)
        ucm.connect("script-message-received::folio", self.on_message)
        self.web.connect("context-menu", lambda *a: True)   # pas de menu contextuel WebKit
        self.web.load_uri(GLib.filename_to_uri(os.path.join(SHARE, "reader", "reader.html")))
        view.set_content(self.web)
        return view

    def send_notes(self):
        if self.cur:
            self.js(f"Folio.setBookmarks({json.dumps(self.lib.bookmarks(self.cur['id']))})")
            self.js(f"Folio.setHighlights({json.dumps(self.lib.highlights(self.cur['id']))})")

    def remove_bookmarks(self, cfis):
        for c in cfis:
            self.lib.del_bookmark(self.cur["id"], c)
        self.js(f"Folio.setBookmarks({json.dumps(self.lib.bookmarks(self.cur['id']))})")
        self.push_soon()

    def go(self, target):
        self.js(f"Folio.go({json.dumps(target)})")

    # ------------------------------------------------------------------ livre ouvert
    def open_book(self, bid):
        self.cur = self.lib.book(bid)
        if not self.cur:
            return
        self.state = {}
        self.lib.touch(bid)
        self.r_title.set_label(self.cur["title"]); self.r_sub.set_label(self.cur["author"] or "")
        self.updating_ui = True; self.side_btn.set_active(False); self.updating_ui = False
        self.reader_view.set_reveal_top_bars(True)
        self.stack.set_visible_child_name("reader")
        self.pending_open = True
        if self.web_ready:
            self.send_open()
        if self.sync:   # rattrape une lecture faite ailleurs, sans retarder l'ouverture
            self.worker.submit(self.sync_cfg, lambda s: (s.moved.clear(), s.pull(), set(s.moved))[1:],
                               lambda r: self.after_pull(*r))

    def send_open(self):
        self.pending_open = False
        b = self.cur
        payload = {"url": GLib.filename_to_uri(b["path"]), "cfi": b["cfi"] or "", "settings": self.settings,
                   "highlights": self.lib.highlights(b["id"]), "bookmarks": self.lib.bookmarks(b["id"]),
                   "locs": b["locs"] or "", "title": b["title"], "lang": LANG}
        self.js(f"Folio.open({json.dumps(payload)})")
        self.web.grab_focus()

    def close_book(self):
        self.js("Folio.close()")
        if self.push_id:
            GLib.source_remove(self.push_id); self.push_id = 0
        if self.sync and self.cur:
            bid = self.cur["id"]
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, force=False))
        self.cur = None
        self.reader_view.set_reveal_top_bars(True)
        self.stack.set_visible_child_name("library")
        self.unfullscreen()
        self.refresh_library()

    def js(self, code):
        if self.web_ready:
            self.web.evaluate_javascript(code, -1)

    def on_message(self, _ucm, value):
        try:
            m = json.loads(value.to_string())
        except ValueError:
            return
        t = m.get("t")
        if t == "ready":
            self.web_ready = True
            if self.pending_open and self.cur:
                self.send_open()
        elif not self.cur:
            return
        elif t == "relocated":
            self.state = m
            self.lib.save_position(self.cur["id"], m["cfi"], m.get("pct")); self.push_soon()
            self.r_sub.set_label(m.get("chapter") or self.cur["author"] or "")
            self.bm_btn.set_icon_name("folio-bookmark-filled-symbolic" if m.get("bm") else "folio-bookmark-symbolic")
            (self.bm_btn.add_css_class if m.get("bm") else self.bm_btn.remove_css_class)("accent-btn")
        elif t == "locations":
            self.lib.save_locations(self.cur["id"], m["data"])
        elif t == "hl_add":
            self.lib.add_highlight(self.cur["id"], m["cfi"], m["color"], m["text"]); self.push_soon()
        elif t == "hl_del":
            self.lib.del_highlight(self.cur["id"], m["cfi"]); self.push_soon()
        elif t == "bm_add":
            self.lib.add_bookmark(self.cur["id"], m["cfi"], m["label"])
            self.js(f"Folio.setBookmarks({json.dumps(self.lib.bookmarks(self.cur['id']))})")
            self.push_soon(); self.toast(T("Marque-page ajouté"))
        elif t == "bm_del":
            self.remove_bookmarks(m["cfis"])
        elif t == "copy":
            self.get_clipboard().set(m.get("text", "")); self.toast(m.get("msg") or T("Copié"))
        elif t == "panel":
            self.updating_ui = True; self.side_btn.set_active(bool(m.get("open"))); self.updating_ui = False
        elif t == "bars":
            self.reader_view.set_reveal_top_bars(not m.get("full"))
        elif t == "cover":
            import base64
            data = m.get("data") or ""
            if not data.startswith("data:image/"):
                return self.toast(T("Image illisible"))
            self.set_cover(self.cur["id"], base64.b64decode(data.split(",", 1)[1]))
        elif t == "error":
            self.toast(T("Erreur de lecture : {e}", e=m.get("msg", "")))

    # ------------------------------------------------------------------ apparence
    def apply_theme(self):
        bg, fg = self.settings["bg"], self.settings["fg"]
        if self.theme_key == (bg, fg):          # recharger le CSS restyle toute la fenêtre : seulement si besoin
            return
        self.theme_key = (bg, fg)
        dark = is_dark(bg)
        Adw.StyleManager.get_default().set_color_scheme(Adw.ColorScheme.FORCE_DARK if dark else Adw.ColorScheme.FORCE_LIGHT)
        acc = "#a798ff" if dark else "#6d5bd0"
        sh = "0.45" if dark else "0.14"
        load_css(self.theme_css, f"""
          @define-color accent_bg_color {acc}; @define-color accent_color {acc};
          @define-color accent_fg_color {"#15122a" if dark else "#ffffff"};
          @define-color window_bg_color {bg}; @define-color window_fg_color {fg};
          @define-color view_bg_color {bg}; @define-color view_fg_color {fg};
          @define-color headerbar_bg_color {bg}; @define-color headerbar_fg_color {fg};
          @define-color popover_bg_color mix({bg},{fg},.03); @define-color popover_fg_color {fg};
          @define-color dialog_bg_color mix({bg},{fg},.03); @define-color dialog_fg_color {fg};
          @define-color card_bg_color mix({bg},{fg},.03); @define-color card_fg_color {fg};
          @define-color folio_muted mix({bg},{fg},.58); @define-color folio_line mix({bg},{fg},.11);
          @define-color folio_soft mix({bg},{fg},.06); @define-color folio_surface mix({bg},{fg},.03);
          window, .lib-head, scrolledwindow, flowbox {{ background-color:{bg}; color:{fg}; }}
          headerbar.reader-head {{ background:{bg}; color:{fg}; box-shadow:none; }}
          .cover {{ box-shadow: 0 1px 2px alpha(black,.08), 0 10px 28px alpha(black,{sh}); }}
          .book-card:hover .cover {{ box-shadow: 0 2px 4px alpha(black,.1), 0 16px 34px alpha(black,{float(sh) + .08:.2f}); }}
        """)

    def set_setting(self, **kw):
        if self.updating_ui:
            return
        self.settings.update(kw)
        self.settings["settings_updated"] = time.time()
        # les curseurs émettent des dizaines de valeurs par seconde : on regroupe
        if self.apply_id:
            GLib.source_remove(self.apply_id)
        self.apply_id = GLib.timeout_add(70, self._apply_settings)

    def _apply_settings(self):
        self.apply_id = 0
        self.lib.save_settings(self.settings)
        self.push_settings_soon()
        self.apply_theme(); self.mark_theme()
        self.js(f"Folio.settings({json.dumps(self.settings)})")
        return False

    def build_settings_popover(self):
        s = self.settings
        pop = Gtk.Popover()
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14, margin_top=14, margin_bottom=14,
                        margin_start=14, margin_end=14, width_request=380)

        # thèmes prédéfinis
        hdr0 = Gtk.Label(label=T("THÈME"), xalign=0, margin_start=6); hdr0.add_css_class("sub-head"); outer.append(hdr0)
        dots = Gtk.Grid(column_spacing=4, row_spacing=4, column_homogeneous=True)
        self.theme_btns = {}
        for i, (key, (bg, fg, label)) in enumerate(THEMES.items()):
            label = T(label)
            sw = Gtk.Button(child=Gtk.Label(label="Aa"), tooltip_text=label, halign=Gtk.Align.CENTER)
            sw.get_child().add_css_class("theme-aa")
            sw.add_css_class("theme-dot"); sw.add_css_class(f"theme-{key}")
            sw.connect("clicked", lambda _b, k=key: self.pick_theme(k))
            name = Gtk.Label(label=label); name.add_css_class("theme-name")
            cell = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5); cell.append(sw); cell.append(name)
            dots.attach(cell, i, 0, 1, 1); self.theme_btns[key] = sw
        outer.append(dots)
        GLib.idle_add(lambda: self.mark_theme() and False)

        hdr1 = Gtk.Label(label=T("TEXTE ET MISE EN PAGE"), xalign=0, margin_start=6, margin_top=4); hdr1.add_css_class("sub-head")
        outer.append(hdr1)
        box = Gtk.ListBox(selection_mode=Gtk.SelectionMode.NONE)
        box.add_css_class("boxed-list")

        def row(title, widget):
            r = Adw.ActionRow(title=title, activatable=False)
            widget.set_valign(Gtk.Align.CENTER)
            r.add_suffix(widget); box.append(r)

        def rgba(h):
            c = Gdk.RGBA(); c.parse(h); return c

        self.bg_btn = Gtk.ColorButton(rgba=rgba(s["bg"]), use_alpha=False)
        self.bg_btn.connect("color-set", lambda b: self.set_setting(bg=rgba_to_hex(b.get_rgba()), theme="perso"))
        self.fg_btn = Gtk.ColorButton(rgba=rgba(s["fg"]), use_alpha=False)
        self.fg_btn.connect("color-set", lambda b: self.set_setting(fg=rgba_to_hex(b.get_rgba()), theme="perso"))
        row(T("Couleur de fond"), self.bg_btn); row(T("Couleur du texte"), self.fg_btn)

        ctx = self.get_pango_context()
        fams = sorted({f.get_name() for f in ctx.list_families()}, key=str.lower)
        self.fonts = [T("Police du livre")] + fams
        dd = Gtk.DropDown.new_from_strings(self.fonts)
        dd.set_expression(Gtk.PropertyExpression.new(Gtk.StringObject, None, "string"))
        dd.set_enable_search(True); dd.set_size_request(190, -1)
        dd.set_selected(self.fonts.index(s["font"]) if s["font"] in self.fonts else 0)
        dd.connect("notify::selected", lambda d, _p: self.set_setting(font="" if d.get_selected() == 0 else self.fonts[d.get_selected()]))
        row(T("Police"), dd)

        def scale(lo, hi, step, key, digits=0, cast=float):
            sc = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, lo, hi, step)
            sc.set_value(s[key]); sc.set_digits(digits); sc.set_draw_value(True)
            sc.set_value_pos(Gtk.PositionType.RIGHT); sc.set_size_request(190, -1)
            sc.connect("value-changed", lambda w: self.set_setting(**{key: cast(round(w.get_value(), digits))}))
            return sc
        row(T("Taille du texte"), scale(12, 40, 1, "size", 0, int))
        row(T("Interligne"), scale(1.0, 2.6, 0.1, "line", 1))
        row(T("Marges"), scale(0, 160, 4, "margin", 0, int))

        sw = Gtk.Switch(active=s["justify"])
        sw.connect("notify::active", lambda w, _p: self.set_setting(justify=w.get_active()))
        row(T("Texte justifié"), sw)

        mode = Gtk.Box(spacing=2); mode.add_css_class("seg")
        pages = Gtk.ToggleButton(label=T("Pages"), active=s["flow"] == "paginated")
        scroll = Gtk.ToggleButton(label=T("Défilement"), group=pages, active=s["flow"] == "scrolled")
        pages.connect("toggled", lambda b: b.get_active() and self.set_setting(flow="paginated"))
        scroll.connect("toggled", lambda b: b.get_active() and self.set_setting(flow="scrolled"))
        mode.append(pages); mode.append(scroll)
        row(T("Lecture"), mode)

        two = Gtk.Switch(active=s["spread"])
        two.connect("notify::active", lambda w, _p: self.set_setting(spread=w.get_active()))
        row(T("Deux pages (écran large)"), two)
        outer.append(box)

        # --- typographie avancée
        adv = Gtk.ListBox(selection_mode=Gtk.SelectionMode.NONE); adv.add_css_class("boxed-list")
        def arow(title, widget, sub=None):
            r = Adw.ActionRow(title=title, subtitle=sub or "", activatable=False)
            widget.set_valign(Gtk.Align.CENTER); r.add_suffix(widget); adv.append(r)
        def fmt(sc, fn):
            if hasattr(sc, "set_format_value_func"):
                sc.set_format_value_func(lambda _s, v: fn(v))
            return sc
        para = fmt(scale(0, 2, 0.1, "para", 1), lambda v: T("Livre") if v < 0.05 else f"{v:.1f} em")
        arow(T("Espace entre paragraphes"), para)
        ind = Gtk.DropDown.new_from_strings([T(l) for _i, l in INDENTS])
        vals = [v for v, _ in INDENTS]
        ind.set_selected(vals.index(s["indent"]) if s["indent"] in vals else 0)
        ind.connect("notify::selected", lambda d, _p: self.set_setting(indent=vals[d.get_selected()]))
        arow(T("Retrait de 1re ligne"), ind)
        wt = fmt(scale(300, 700, 100, "weight", 0, int), lambda v: T(WEIGHTS.get(int(round(v / 100) * 100), "")))
        arow(T("Graisse du texte"), wt)
        ls = fmt(scale(0, 0.1, 0.01, "letter", 2), lambda v: T("Normal") if v < 0.005 else "+" + pct(v))
        arow(T("Espacement des lettres"), ls)
        hdr = Gtk.Label(label=T("TYPOGRAPHIE"), xalign=0, margin_start=6, margin_top=4); hdr.add_css_class("sub-head")
        outer.append(hdr); outer.append(adv)
        reset = Gtk.Button(label=T("Réinitialiser l’apparence"), halign=Gtk.Align.CENTER)
        reset.add_css_class("flat"); reset.connect("clicked", lambda *_: self.reset_appearance())
        outer.append(reset)
        pop.set_child(Gtk.ScrolledWindow(child=outer, propagate_natural_height=True, max_content_height=640,
                                         hscrollbar_policy=Gtk.PolicyType.NEVER))
        return pop

    def reset_appearance(self):
        from library import DEFAULT_SETTINGS
        self.settings.update(DEFAULT_SETTINGS)
        self.set_setting()
        self.aa_btn.popdown()
        GLib.idle_add(lambda: self.aa_btn.set_popover(self.build_settings_popover()) and False)
        self.toast(T("Apparence réinitialisée"))

    def mark_theme(self):
        for k, b in getattr(self, "theme_btns", {}).items():
            bg, fg, _ = THEMES[k]
            on = self.settings.get("theme") == k or (self.settings["bg"] == bg and self.settings["fg"] == fg)
            (b.add_css_class if on else b.remove_css_class)("active")

    def pick_theme(self, key):
        bg, fg, _ = THEMES[key]
        self.updating_ui = True
        for btn, col in ((self.bg_btn, bg), (self.fg_btn, fg)):
            c = Gdk.RGBA(); c.parse(col); btn.set_rgba(c)
        self.updating_ui = False
        self.set_setting(bg=bg, fg=fg, theme=key)

    # ------------------------------------------------------------------ actions
    def build_actions(self):
        def act(name, cb, accel):
            a = Gio.SimpleAction.new(name, None); a.connect("activate", lambda *_: cb())
            self.add_action(a); self.get_application().set_accels_for_action(f"win.{name}", accel)
        in_reader = lambda: self.stack.get_visible_child_name() == "reader"
        act("add", self.pick_files, ["<primary>o"])
        act("toc", lambda: in_reader() and self.side_btn.set_active(not self.side_btn.get_active()), ["<primary>t"])
        act("search", lambda: not in_reader() and self.search.grab_focus(), ["<primary>f"])
        act("bookmark", lambda: in_reader() and self.js("Folio.toggleBookmark()"), ["<primary>d"])
        act("fullscreen", lambda: self.unfullscreen() if self.is_fullscreen() else self.fullscreen(), ["F11"])
        act("back", self.escape, ["Escape"])

    def escape(self):
        """Échap : ferme le panneau, puis réaffiche les barres, puis revient à la bibliothèque."""
        if self.stack.get_visible_child_name() != "reader":
            if self.search.get_text():
                self.search.set_text("")
            return
        if self.side_btn.get_active():
            self.side_btn.set_active(False)
        elif not self.reader_view.get_reveal_top_bars():
            self.reader_view.set_reveal_top_bars(True); self.js("document.body.classList.remove('full')")
        else:
            self.close_book()


class FolioApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.HANDLES_OPEN)
        self.win = None

    def window(self):
        if not self.win:
            css = Gtk.CssProvider()
            css.load_from_path(os.path.join(SHARE, "style.css"))
            Gtk.IconTheme.get_for_display(Gdk.Display.get_default()).add_search_path(os.path.join(SHARE, "icons"))
            Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
            self.win = FolioWindow(self)
        return self.win

    def do_activate(self):
        self.window().present()

    def do_open(self, files, n, hint):
        w = self.window()
        w.present()
        last = w.add_files([f.get_path() for f in files])
        if last:
            w.open_book(last)


if __name__ == "__main__":
    sys.exit(FolioApp().run(sys.argv))
