#!/usr/bin/env python3
"""Folio — liseuse EPUB pour Linux (GTK4 / libadwaita / WebKitGTK)."""
import base64
import hashlib
import json
import re
import shutil
import subprocess
import os
import queue
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("WebKit", "6.0")
gi.require_version("PangoCairo", "1.0")
from gi.repository import Adw, Gdk, GdkPixbuf, Gio, GLib, Graphene, Gsk, Gtk, Pango, PangoCairo, WebKit  # noqa: E402
import cairo  # noqa: E402
import math  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from library import COVERS, DATA, SYNC_GROUPS, Library, synced_keys  # noqa: E402
import sync as syncmod  # noqa: E402
from sync import ApiSync, Sync, public_post  # noqa: E402
from i18n import LANG, T, pct  # noqa: E402
import drafts as draftsmod  # noqa: E402

syncmod.LANG = LANG            # messages du serveur dans la langue de l'interface

SHARE = os.path.dirname(os.path.abspath(__file__))
# serveur proposé par défaut à la connexion : FOLIO_URL au moment de construire le paquet (config.json)
try:
    DEFAULT_SERVER = json.load(open(os.path.join(SHARE, "config.json"))).get("server", "")
except (OSError, ValueError):
    DEFAULT_SERVER = ""


def register_fonts():
    """Fraunces (titres, comme sur le site) est livrée avec l'appli : ajoutée à fontconfig pour ce processus seulement."""
    import ctypes
    import ctypes.util
    lib = ctypes.util.find_library("fontconfig")
    if not lib:
        return
    try:
        fc = ctypes.CDLL(lib)
        fc.FcConfigAppFontAddFile.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        for f in ("Fraunces.ttf", "Fraunces-Italic.ttf"):
            p = os.path.join(SHARE, "fonts", f)
            if os.path.exists(p):
                fc.FcConfigAppFontAddFile(None, p.encode())
    except (OSError, AttributeError):
        pass                                   # sans la police, les titres prennent la serif du système


register_fonts()
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
HL_COLORS = {"yellow": "#f6d55c", "green": "#7bd88f", "blue": "#6cb6ff", "pink": "#ff8fb1", "orange": "#ffa94d", "red": "#ff6b6b", "purple": "#b197fc", "teal": "#4fd1c5"}


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


SPINE_COLORS = [("#3d4a63", "#f4efe8"), ("#6b3a2c", "#f4efe8"), ("#4d5b3d", "#f4efe8"), ("#e8dcc2", "#3a2a12"),
                ("#5e3c55", "#f4efe8"), ("#2f5757", "#f4efe8"), ("#8a6a3c", "#f4efe8")]


def hn(s):
    """Petit hachage stable (même résultat que le site) : couleur et hauteur de la tranche."""
    a = 7
    for ch in str(s):
        a = (a * 31 + ord(ch)) & 0xFFFFFFFF
    return a


def spine_words(title):
    w = ""
    for p in (title or T("Sans titre")).split():
        if len((w + " " + p).strip()) > 24 and w:
            break
        w = (w + " " + p).strip()
    return w


def spine_jpeg(path=None, data=None, turn=None, pb=None):
    """Photo de tranche : redressée (une tranche est haute), réduite et compressée en JPEG."""
    if pb is not None:
        pass
    elif data is not None:
        ld = GdkPixbuf.PixbufLoader(); ld.write(data); ld.close(); pb = ld.get_pixbuf()
    else:
        pb = GdkPixbuf.Pixbuf.new_from_file(path); pb = pb.apply_embedded_orientation() or pb
    if (pb.get_width() > pb.get_height()) if turn is None else turn:
        pb = pb.rotate_simple(GdkPixbuf.PixbufRotation.CLOCKWISE)
    w, h = pb.get_width(), pb.get_height(); k = min(1, 1400 / h, 360 / w)
    if k < 1:
        pb = pb.scale_simple(max(1, round(w * k)), max(1, round(h * k)), GdkPixbuf.InterpType.HYPER)
    ok, buf = pb.save_to_bufferv("jpeg", ["quality"], ["86"])
    return bytes(buf)


def face_jpeg(pb):
    """Photo de couverture ou de dos : réduite (900 × 1350 au plus) et compressée en JPEG."""
    w, h = pb.get_width(), pb.get_height(); k = min(1, 900 / w, 1350 / h)
    if k < 1:
        pb = pb.scale_simple(max(1, round(w * k)), max(1, round(h * k)), GdkPixbuf.InterpType.HYPER)
    ok, buf = pb.save_to_bufferv("jpeg", ["quality"], ["85"])
    return bytes(buf)


# décorations (plantes, peluches) : mêmes dessins que le site, posées entre les livres et sur les étagères vides
DECO = {"succ": (70, 100), "snake": (60, 150), "stack": (92, 96), "bear": (80, 92), "bunny": (64, 112), "cat": (74, 80)}
DECO_K, DECO_GAP = ["succ", "bear", "snake", "stack", "bunny", "cat"], [6, 9, 5, 8, 7, 10]


def deco_widget(n, big=False):
    k = DECO_K[n % len(DECO_K)]; w, h = DECO[k]; z = 1 if big else .86
    W, H = round(w * z), round(h * z)
    try:   # dessin rendu au double de la taille puis réduit : net sur les écrans HiDPI
        pb = GdkPixbuf.Pixbuf.new_from_file_at_scale(os.path.join(SHARE, "decor", k + ".svg"), W * 2, H * 2, True)
    except GLib.Error:
        pb = None
    area = Gtk.DrawingArea(content_width=W, content_height=H, valign=Gtk.Align.END)

    def draw(_a, cr, aw, ah):
        if pb:
            cr.scale(aw / pb.get_width(), ah / pb.get_height()); Gdk.cairo_set_source_pixbuf(cr, pb, 0, 0); cr.paint()
    area.set_draw_func(draw); area.add_css_class("deco"); area.deco_w = W + 24
    return area


def cover_pixbuf(path):
    try:
        return GdkPixbuf.Pixbuf.new_from_file(str(path)) if path and os.path.exists(path) else None
    except GLib.Error:
        return None


class FaceCover(Gtk.DrawingArea):
    """Livre posé de face sur l'étagère : on voit sa couverture."""

    def __init__(self, item, pb, on_click):
        super().__init__(valign=Gtk.Align.END, margin_start=6, margin_end=6)
        self.pb, self.scaled = pb, None
        h = 184; w = round(min(150, h * pb.get_width() / pb.get_height()))
        self.set_content_width(w); self.set_content_height(h); self.add_css_class("face")
        self.set_tooltip_text((item.get("title") or "") + (" — " + item["author"] if item.get("author") else ""))
        self.set_draw_func(self.draw); self.set_cursor(Gdk.Cursor.new_from_name("pointer"))
        c = Gtk.GestureClick(); c.connect("released", lambda *_: on_click(item)); self.add_controller(c)

    def draw(self, _a, cr, w, h):
        if not self.scaled or self.scaled.get_width() != w:
            self.scaled = self.pb.scale_simple(max(1, w), max(1, h), GdkPixbuf.InterpType.BILINEAR)
        Gdk.cairo_set_source_pixbuf(cr, self.scaled, 0, 0); cr.paint()
        g = cairo.LinearGradient(0, 0, 10, 0)                 # pli de la reliure
        g.add_color_stop_rgba(0, 0, 0, 0, .3); g.add_color_stop_rgba(1, 0, 0, 0, 0); cr.set_source(g); cr.paint()


class LyingStack(Gtk.DrawingArea):
    """Pile de livres couchés : leurs tranches à l'horizontale, légèrement décalées."""

    def __init__(self, items, on_click):
        super().__init__(valign=Gtk.Align.END, margin_start=8, margin_end=8)
        self.parts = []
        for x in items:
            sp = Spine(x); L = round((150 + hn(x["id"]) % 44) * .78)
            self.parts.append((sp, L, sp.get_content_width(), ((hn(x["id"]) % 5) - 2) * 4, x))
        W = max(L + abs(o) * 2 for _s, L, _t, o, _x in self.parts); H = sum(t for _s, _L, t, _o, _x in self.parts)
        self.set_content_width(W); self.set_content_height(H); self.deco_w = W + 16
        self.set_draw_func(self.draw); self.set_cursor(Gdk.Cursor.new_from_name("pointer"))
        c = Gtk.GestureClick(); c.connect("released", lambda _g, _n, _x, y: on_click(self.at(y))); self.add_controller(c)

    def rows(self, h):
        y = h
        for sp, L, t, o, x in self.parts:            # le premier livre est en bas de la pile
            y -= t; yield sp, L, t, o, x, y

    def at(self, y):
        for _sp, _L, t, _o, x, top in self.rows(self.get_height()):
            if top <= y <= top + t:
                return x
        return self.parts[-1][4]

    def draw(self, _a, cr, w, h):
        for sp, L, t, o, _x, top in self.rows(h):
            cr.save(); cr.translate((w - L) / 2 + o, top + t); cr.rotate(-math.pi / 2)
            sp.draw(None, cr, t, L); cr.restore()


class Book3D(Gtk.DrawingArea):
    """Un livre en 3D (projection orthogonale, faces en Cairo) : il arrive tranche face à nous puis pivote vers sa couverture.
    Glisser pour le tourner."""

    def __init__(self, item, cover_pb, back_pb=None):
        super().__init__(hexpand=True, vexpand=True, content_height=380)
        H = 300.0
        self.front = self.surface_from(cover_pb) if cover_pb else self.gen_cover(item)
        self.back = self.surface_from(back_pb) if back_pb else "back"
        sp = Spine(item, big=True); sw, sh = sp.get_content_width(), sp.get_content_height()
        self.spine = cairo.ImageSurface(cairo.FORMAT_ARGB32, sw, sh); sp.draw(None, cairo.Context(self.spine), sw, sh)
        fw, fh = self.front.get_width(), self.front.get_height()
        self.H, self.W = H, H * max(.5, min(.85, fw / fh))
        self.T = H * max(.07, min(.22, sw / sh))
        # textures réduites une fois à la taille affichée (×2 pour les écrans HiDPI) : une photo de 12 Mpx
        # n'est plus rééchantillonnée à chaque image de l'animation
        S = 2
        self.front = self.fit(self.front, self.W * S, H * S)
        self.spine = self.fit(self.spine, self.T * S, H * S)
        if self.back != "back":
            self.back = self.fit(self.back, self.W * S, H * S)
        c = Gdk.RGBA(); c.parse(SPINE_COLORS[hn(item["id"]) % 7][0]); self.bg = c
        self.pages = cairo.ImageSurface(cairo.FORMAT_ARGB32, 100, 100); pc = cairo.Context(self.pages)
        pc.set_source_rgb(.95, .93, .88); pc.paint(); pc.set_source_rgba(.6, .55, .45, .35); pc.set_line_width(.6)
        for i in range(0, 100, 3):
            pc.move_to(0, i); pc.line_to(100, i)
        pc.stroke()
        self.a, self.t0, self.a0, self.a1, self.tick_id = 90.0, None, 90.0, -24.0, None
        self.set_draw_func(self.draw)
        d = Gtk.GestureDrag(); d.connect("drag-begin", self.drag_begin); d.connect("drag-update", self.drag_update)
        d.connect("drag-end", self.drag_end); self.add_controller(d)
        self.set_cursor(Gdk.Cursor.new_from_name("grab"))

    @staticmethod
    def surface_from(pb):
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, pb.get_width(), pb.get_height()); cr = cairo.Context(s)
        Gdk.cairo_set_source_pixbuf(cr, pb, 0, 0); cr.paint(); return s

    @staticmethod
    def fit(src, w, h):
        w, h = max(1, round(w)), max(1, round(h))
        if src.get_width() <= w and src.get_height() <= h:
            return src
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, w, h); cr = cairo.Context(s)
        cr.scale(w / src.get_width(), h / src.get_height()); cr.set_source_surface(src, 0, 0)
        cr.get_source().set_filter(cairo.FILTER_GOOD); cr.paint()
        return s

    @staticmethod
    def gen_cover(item):
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, 400, 600); cr = cairo.Context(s)
        bg, fg = SPINE_COLORS[hn(item["id"]) % 7]; c1, c2 = Gdk.RGBA(), Gdk.RGBA(); c1.parse(bg); c2.parse(fg)
        Gdk.cairo_set_source_rgba(cr, c1); cr.paint()
        cr.set_source_rgba(c2.red, c2.green, c2.blue, 1)
        for text, font, y in ((item.get("title") or T("Sans titre"), "Fraunces Medium 30", 230), (item.get("author") or "", "Fraunces Italic 18", 420)):
            lay = PangoCairo.create_layout(cr); lay.set_font_description(Pango.FontDescription.from_string(font))
            lay.set_text(text, -1); lay.set_width(320 * Pango.SCALE); lay.set_alignment(Pango.Alignment.CENTER)
            lay.set_wrap(Pango.WrapMode.WORD_CHAR); cr.move_to(40, y - lay.get_pixel_size()[1] / 2); PangoCairo.show_layout(cr, lay)
        return s

    def tick(self, _w, clock):
        k = min(1.0, (clock.get_frame_time() / 1e6 - self.t0) / 1.15)
        self.a = self.a0 + (self.a1 - self.a0) * (1 - (1 - k) ** 3); self.queue_draw()
        if k >= 1:
            self.tick_id = None
            return GLib.SOURCE_REMOVE        # au repos, plus aucune image n'est redessinée
        return GLib.SOURCE_CONTINUE

    def stop(self):
        if self.tick_id:
            self.remove_tick_callback(self.tick_id); self.tick_id = None

    def start(self, to=-24.0):
        self.stop(); self.a0, self.a1 = self.a, to
        clock = self.get_frame_clock()
        if not clock:
            self.a = to; self.queue_draw(); return
        self.t0 = clock.get_frame_time() / 1e6
        self.tick_id = self.add_tick_callback(self.tick)

    def drag_begin(self, *_):
        self.stop(); self.drag_a = self.a

    def drag_update(self, _g, dx, _dy):
        self.a = max(-180, min(180, self.drag_a + dx * .6)); self.queue_draw()

    def drag_end(self, *_):
        self.start(180.0 if self.a > 100 else -180.0 if self.a < -100 else -24.0 if abs(self.a) < 70 else self.a)

    def draw(self, _a, cr, w, h):
        W, H, T = self.W, self.H, self.T
        th, ph = math.radians(self.a), math.radians(4)
        ct, st, cp, sp = math.cos(th), math.sin(th), math.cos(ph), math.sin(ph)
        cx, cy = w / 2, h / 2

        def rot(x, y, z):
            x2, z2 = x * ct + z * st, -x * st + z * ct
            return x2, y * cp - z2 * sp, y * sp + z2 * cp

        def proj(p):
            x, y, _z = rot(*p); return cx + x, cy + y
        faces = [  # (coin haut-gauche, coin haut-droit, coin bas-gauche, normale, texture)
            ((-W/2, -H/2, T/2), (W/2, -H/2, T/2), (-W/2, H/2, T/2), (0, 0, 1), self.front),
            ((-W/2, -H/2, -T/2), (-W/2, -H/2, T/2), (-W/2, H/2, -T/2), (-1, 0, 0), self.spine),
            ((W/2, -H/2, T/2), (W/2, -H/2, -T/2), (W/2, H/2, T/2), (1, 0, 0), "pages"),
            ((-W/2, -H/2, -T/2), (W/2, -H/2, -T/2), (-W/2, -H/2, T/2), (0, -1, 0), "pages"),
            ((W/2, -H/2, -T/2), (-W/2, -H/2, -T/2), (W/2, H/2, -T/2), (0, 0, -1), self.back)]
        # ombre portée
        cr.save(); cr.translate(cx, cy + H / 2 + 16); cr.scale(max(W, T) * .75, 10); cr.arc(0, 0, 1, 0, 2 * math.pi); cr.restore()
        cr.set_source_rgba(0, 0, 0, .18); cr.fill()
        for p00, p10, p01, n, tex in faces:
            nz = rot(*n)[2]
            if nz <= 0.001:
                continue
            (x0, y0), (x1, y1), (x2, y2) = proj(p00), proj(p10), proj(p01)
            tw, tht = (tex.get_width(), tex.get_height()) if isinstance(tex, cairo.ImageSurface) else (100, 100)
            cr.save()
            cr.transform(cairo.Matrix((x1 - x0) / tw, (y1 - y0) / tw, (x2 - x0) / tht, (y2 - y0) / tht, x0, y0))
            cr.rectangle(0, 0, tw, tht); cr.clip()
            if tex == "pages":
                tex = self.pages
            if isinstance(tex, cairo.ImageSurface):
                cr.set_source_surface(tex, 0, 0); cr.get_source().set_filter(cairo.FILTER_BILINEAR); cr.paint()
            else:
                Gdk.cairo_set_source_rgba(cr, self.bg); cr.paint()
            cr.set_source_rgba(0, 0, 0, (1 - nz) * .35); cr.paint()          # lumière de face
            cr.restore()


class Spine(Gtk.DrawingArea):
    """Tranche d'un livre debout : la photo si elle existe, sinon les premiers mots du titre, à la verticale."""

    def __init__(self, item, big=False, on_click=None):
        super().__init__()
        self.item, self.pb, self.scaled = item, None, None
        n = hn(item["id"])
        self.bg, self.fg = SPINE_COLORS[n % 7]
        h = 236 if big else 150 + n % 44
        w = round(min(48, 24 + len(item.get("title") or "") * .45 + n % 6) * (1.4 if big else 1))
        path = item.get("photo") or (Library.spine_path(item["id"]) if item.get("spine") else None)
        if path and os.path.exists(path):
            try:
                self.pb = GdkPixbuf.Pixbuf.new_from_file(str(path))
                w = round(max(16, min(150 if big else 110, h * self.pb.get_width() / self.pb.get_height())))
            except GLib.Error:
                self.pb = None
        self.set_content_width(w); self.set_content_height(h)
        self.set_valign(Gtk.Align.END)
        self.add_css_class("spine")
        self.set_tooltip_text((item.get("title") or "") + (" — " + item["author"] if item.get("author") else ""))
        self.set_draw_func(self.draw)
        if on_click:
            self.set_cursor(Gdk.Cursor.new_from_name("pointer"))
            c = Gtk.GestureClick(); c.connect("released", lambda *_: on_click(item)); self.add_controller(c)

    def draw(self, _area, cr, w, h):
        r = 3
        cr.new_sub_path(); cr.arc(w - r, r, r, -math.pi / 2, 0); cr.line_to(w, h); cr.line_to(0, h)
        cr.arc(r, r, r, math.pi, 3 * math.pi / 2); cr.close_path(); cr.clip()
        if self.pb:
            if not self.scaled or self.scaled.get_width() != w or self.scaled.get_height() != h:
                self.scaled = self.pb.scale_simple(max(1, w), max(1, h), GdkPixbuf.InterpType.BILINEAR)
            Gdk.cairo_set_source_pixbuf(cr, self.scaled, 0, 0); cr.paint()
        else:
            bg, fg = Gdk.RGBA(), Gdk.RGBA(); bg.parse(self.bg); fg.parse(self.fg)
            Gdk.cairo_set_source_rgba(cr, bg); cr.paint()
            cr.set_source_rgba(fg.red, fg.green, fg.blue, .35); cr.set_line_width(1)
            for y in (8.5, h - 8.5):
                cr.move_to(4, y); cr.line_to(w - 4, y); cr.stroke()
            lay = PangoCairo.create_layout(cr)
            lay.set_font_description(Pango.FontDescription.from_string("Fraunces Medium 10"))
            lay.set_text(spine_words(self.item.get("title")), -1)
            lay.set_width(int((h - 28) * Pango.SCALE)); lay.set_ellipsize(Pango.EllipsizeMode.END)
            tw, th = lay.get_pixel_size()
            cr.save(); cr.set_source_rgba(fg.red, fg.green, fg.blue, 1)
            cr.translate(w / 2 + th / 2, 14 + max(0, (h - 28 - tw) / 2)); cr.rotate(math.pi / 2)
            PangoCairo.show_layout(cr, lay); cr.restore()
        g = cairo.LinearGradient(0, 0, w, 0)                   # relief : dos arrondi
        g.add_color_stop_rgba(0, 1, 1, 1, .14); g.add_color_stop_rgba(.12, 1, 1, 1, 0)
        g.add_color_stop_rgba(.8, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0, 0, 0, .3)
        cr.set_source(g); cr.paint()


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
        self.drafts = draftsmod.Drafts()
        self.writer_ready = False
        self.draft_wait, self.draft_timer = {}, {}
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
        self.stack.add_named(self.build_rack_page(), "rack")
        self.stack.add_named(self.build_writer_page(), "writer")
        self.build_actions()
        self.apply_theme()
        self.refresh_library()
        self.init_sync()
        # synchro au retour sur la fenêtre (au plus une fois par minute) et toutes les 2 min
        self.connect("notify::is-active", lambda *_: self.is_active() and time.time() - self.last_sync > 60
                     and self.sync_now(quiet=True))
        GLib.timeout_add_seconds(120, lambda: (self.sync_now(quiet=True), True)[1])
        GLib.timeout_add_seconds(8, lambda: self.check_update() and False)
        GLib.timeout_add_seconds(6 * 3600, lambda: (self.check_update(), True)[1])

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
                          (T("Synchroniser maintenant"), lambda: self.sync_now()), (T("Langue…"), self.language_dialog),
                          (T("Mises à jour…"), lambda: self.check_update(manual=True)), (T("Site de Folio ↗"), self.open_site)):
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
        write = Gtk.Button(icon_name="document-edit-symbolic", tooltip_text=T("Écrire un livre"), valign=Gtk.Align.CENTER)
        write.add_css_class("flat"); write.add_css_class("circ")
        write.connect("clicked", lambda *_: self.open_writer())
        header.pack_end(add); header.pack_end(acc_btn); header.pack_end(self.sync_btn); header.pack_end(write)
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

        # étagère : les livres debout (numériques et papier), photo de tranche facultative
        rack_head = Gtk.Box(spacing=8, margin_top=10)
        rt = Gtk.Label(label=T("Étagère"), xalign=0, margin_end=10); rt.add_css_class("section-title")
        self.rack_count = Gtk.Label(hexpand=True, xalign=1); self.rack_count.add_css_class("muted"); self.rack_count.add_css_class("caption")
        allb = Gtk.Button(label=T("Tout voir"), valign=Gtk.Align.CENTER); allb.add_css_class("chip")
        allb.connect("clicked", lambda *_: self.open_rack())
        paper = Gtk.Button(child=Adw.ButtonContent(icon_name="list-add-symbolic", label=T("Livre papier")), valign=Gtk.Align.CENTER)
        paper.add_css_class("chip"); paper.add_css_class("chip-new"); paper.connect("clicked", lambda *_: self.spine_dialog(None))
        for w in (self.fold_button("rack"), rt, self.rack_count, allb, paper):
            rack_head.append(w)
        self.rack_row = Gtk.Box(spacing=3, valign=Gtk.Align.END, margin_start=4, margin_end=4)
        self.rack_scroll = Gtk.ScrolledWindow(child=self.rack_row, vscrollbar_policy=Gtk.PolicyType.NEVER,
                                              hscrollbar_policy=Gtk.PolicyType.AUTOMATIC, propagate_natural_height=True)
        self.rack_scroll.add_css_class("plank")

        # étagères : Tous / En cours / À lire / Terminés
        sect = Gtk.Box(spacing=8, margin_top=10, margin_bottom=4)
        st = Gtk.Label(label=T("Bibliothèque"), xalign=0, margin_end=10); st.add_css_class("section-title")
        sect.append(self.fold_button("lib")); sect.append(st)
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
        page.append(welcome); page.append(self.hero); page.append(rack_head); page.append(self.rack_scroll)
        page.append(sect); page.append(self.coll_scroll)
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
            badge = Gtk.Label(label=T("Terminé"), halign=Gtk.Align.START, valign=Gtk.Align.START, margin_top=0, margin_start=12)
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
        row.append(self.fold_button("cols"))
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
        self.apply_folds()

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

    def ask_text(self, heading, text, ok, cb, placeholder=None, max_length=80):
        d = Adw.AlertDialog(heading=heading)
        e = Gtk.Entry(text=text, max_length=max_length, activates_default=True, placeholder_text=placeholder or T("Nom de la collection"))
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
        item(T("Renommer…"), "document-edit-symbolic", lambda: self.ask_text(T("Renommer le livre"), b["title"], T("Renommer"),
                                                                       lambda name: self.rename_book(bid, name), T("Titre du livre"), 300))
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

    def rename_book(self, bid, title):
        b = self.lib.book(bid)
        if not b or title == b["title"]:
            return
        self.lib.rename_book(bid, title)
        if self.cur and self.cur["id"] == bid:
            self.cur = self.lib.book(bid)
        self.toast(T("Livre renommé"))
        if self.stack.get_visible_child_name() == "library":
            self.refresh_library()
        if self.sync:
            self.worker.submit(self.sync_cfg, lambda s: s.push(bid, force=False))

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
            self.lib_stack.set_visible_child_name("books" if books or any(x["kind"] == "paper" for x in self.lib.shelf_items()) else "empty")
        self.fill_collections(books)
        self.fill_rack(books)
        self.apply_filter()

    # ------------------------------------------------------------------ sections repliables (propre à cet appareil)
    def fold_button(self, key):
        b = Gtk.Button(icon_name="pan-down-symbolic", valign=Gtk.Align.CENTER)
        b.add_css_class("flat"); b.add_css_class("circ"); b.add_css_class("fold")
        b.fold_key = key
        b.connect("clicked", lambda *_: self.toggle_fold(key))
        self.fold_btns = [x for x in getattr(self, "fold_btns", []) if x.get_root()] + [b]
        return b

    def folded(self, key):
        return bool((self.settings.get("fold") or {}).get(key))

    def toggle_fold(self, key):
        f = dict(self.settings.get("fold") or {}); f[key] = not f.get(key)
        self.settings["fold"] = f; self.lib.save_settings(self.settings)
        self.apply_folds(); self.apply_filter()

    def apply_folds(self):
        for b in getattr(self, "fold_btns", []):
            f = self.folded(b.fold_key)
            b.set_icon_name("pan-end-symbolic" if f else "pan-down-symbolic"); b.set_tooltip_text(T("Déplier") if f else T("Replier"))
        if hasattr(self, "rack_scroll"):
            self.rack_scroll.set_visible(not self.folded("rack"))
            self.flow.set_visible(not self.folded("lib")); self.coll_scroll.set_visible(not self.folded("lib"))
            c, i = self.coll_row.get_first_child(), 0
            while c:                                       # collections repliées : on garde le bouton et le titre
                if i >= 2 and c is not getattr(self, "coll_menu", None):
                    c.set_visible(not self.folded("cols"))
                c, i = c.get_next_sibling(), i + 1

    # ------------------------------------------------------------------ étagère
    def rack_items(self, books=None):
        books = self.lib.books() if books is None else books
        sh = {x["id"]: x for x in self.lib.shelf_items()}
        out = [{"id": b["hash"], "kind": "book", "bid": b["id"], "title": b["title"] or "", "author": b["author"] or "",
                "at": b["added"] or 0, "spine": (sh.get(b["hash"]) or {}).get("spine", 0), "cover": b["cover"] or "",
                "back": (sh.get(b["hash"]) or {}).get("back", 0)} for b in books]
        out += [{"id": x["id"], "kind": "paper", "title": x["title"] or "", "author": x["author"] or "",
                 "at": x["created"] or 0, "spine": x["spine"], "front": x["front"] or 0, "back": x["back"] or 0}
                for x in sh.values() if x["kind"] == "paper"]
        k = self.settings.get("rack_sort", "author")
        last = lambda a: (a or "").split()[-1].casefold() if (a or "").split() else ""
        if k == "recent":
            out.sort(key=lambda x: -x["at"])
        elif k == "title":
            out.sort(key=lambda x: x["title"].casefold())
        else:
            out.sort(key=lambda x: (last(x["author"]), x["title"].casefold()))
        return out

    def spine_add_tile(self):
        b = Gtk.Button(icon_name="list-add-symbolic", tooltip_text=T("Ajouter un livre papier"), valign=Gtk.Align.END,
                       width_request=34, height_request=150)
        b.add_css_class("spine-add"); b.connect("clicked", lambda *_: self.spine_dialog(None))
        return b

    def fill_rack(self, books=None):
        items = self.rack_items(books)
        c = self.rack_row.get_first_child()
        while c:
            nxt = c.get_next_sibling(); self.rack_row.remove(c); c = nxt
        for x in items[:60]:
            self.rack_row.append(Spine(x, on_click=self.book_view))
        self.rack_row.append(self.spine_add_tile())
        self.rack_count.set_label(T("{n} livres" if len(items) > 1 else "{n} livre", n=len(items)))
        if self.stack.get_visible_child_name() == "rack":
            self.layout_case(force=True)

    def build_rack_page(self):
        view = Adw.ToolbarView()
        header = Adw.HeaderBar(show_title=False); header.add_css_class("lib-head")
        back = Gtk.Button(icon_name="go-previous-symbolic", tooltip_text=T("Bibliothèque")); back.add_css_class("flat")
        back.connect("clicked", lambda *_: self.close_rack())
        title = Gtk.Label(label=T("Étagère")); title.add_css_class("section-title")
        self.case_count = Gtk.Label(); self.case_count.add_css_class("muted"); self.case_count.add_css_class("caption")
        tb = Gtk.Box(spacing=10); tb.append(title); tb.append(self.case_count)
        header.pack_start(back); header.pack_start(tb)
        add = Gtk.Button(child=Adw.ButtonContent(icon_name="list-add-symbolic", label=T("Livre papier")), valign=Gtk.Align.CENTER)
        add.add_css_class("suggested-action"); add.add_css_class("pill-small"); add.connect("clicked", lambda *_: self.spine_dialog(None))
        seg, first = Gtk.Box(valign=Gtk.Align.CENTER), None
        seg.add_css_class("seg")
        for key, label in (("author", T("Auteur")), ("title", T("Titre")), ("recent", T("Récents"))):
            b = Gtk.ToggleButton(label=label, group=first, active=self.settings.get("rack_sort", "author") == key)
            first = first or b
            b.connect("toggled", lambda w, k=key: w.get_active() and self.set_rack_sort(k)); seg.append(b)
        deco = Gtk.ToggleButton(icon_name="folio-leaf-symbolic", tooltip_text=T("Décorations"), valign=Gtk.Align.CENTER,
                                active=self.settings.get("rack_deco", True))
        deco.add_css_class("flat"); deco.add_css_class("circular"); deco.add_css_class("rack-deco")
        deco.connect("toggled", lambda w: self.set_rack_deco(w.get_active()))
        header.pack_end(add); header.pack_end(deco); header.pack_end(seg)
        view.add_top_bar(header)
        self.case = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, margin_top=16); self.case.add_css_class("bookcase")
        tip = Gtk.Label(label=T("Importez la photo de la tranche de vos livres, numériques ou papier : votre étagère se compose et vous suit sur tous vos appareils. Depuis votre téléphone, vous pouvez la photographier directement."),
                        wrap=True, xalign=0, margin_top=18); tip.add_css_class("muted")
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, margin_start=28, margin_end=28, margin_bottom=40)
        foot = Gtk.Box(); foot.add_css_class("case-foot")
        box.append(self.case); box.append(foot); box.append(tip)
        self.case_w = 0
        self.case.add_tick_callback(lambda *_: (self.layout_case() if self.stack.get_visible_child_name() == "rack" else None) or True)
        view.set_content(Gtk.ScrolledWindow(vexpand=True, hscrollbar_policy=Gtk.PolicyType.NEVER,
                                            child=Adw.Clamp(maximum_size=1240, tightening_threshold=1240, child=box)))
        return view

    def layout_case(self, force=False):
        """Range les tranches en rangées selon la largeur disponible (refait quand la fenêtre change de taille)."""
        w = self.case.get_width()
        if not w or (not force and abs(w - self.case_w) < 8):
            return
        self.case_w = w
        c = self.case.get_first_child()
        while c:
            nxt = c.get_next_sibling(); self.case.remove(c); c = nxt
        items = self.rack_items()
        self.case_count.set_label(T("{n} livres" if len(items) > 1 else "{n} livre", n=len(items)))
        on = self.settings.get("rack_deco", True)
        # comme une vraie bibliothèque (et comme le site) : livres debout, quelques couvertures de face, des piles couchées
        wids, nd, nxt, i, n, since_face, since_lie = [], 0, DECO_GAP[0], 0, 0, 3, 4
        while i < len(items):
            x, hh = items[i], hn(items[i]["id"])
            if on and n == nxt:
                wids.append(deco_widget(nd)); nd += 1; nxt += DECO_GAP[nd % len(DECO_GAP)]
            pb = cover_pixbuf(x.get("cover")) if since_face >= 6 and hh % 3 == 0 and x["kind"] == "book" else None
            if pb:
                wids.append(FaceCover(x, pb, self.book_view)); since_face = 0; i += 1
            elif since_lie >= 8 and len(items) - i >= 3 and hh % 4 == 1:
                k = 2 + hh % 2; wids.append(LyingStack(items[i:i + k], self.book_view)); since_lie = 0; i += k; n += 1
                continue
            else:
                wids.append(Spine(x, on_click=self.book_view)); i += 1
            since_face += 1; since_lie += 1; n += 1
        wids.append(self.spine_add_tile())
        if on and len(items) < 4:
            wids.append(deco_widget(nd)); nd += 1
        inner = w - 32                                          # rembourrage des rangées
        row, used, rows = None, 0, 0
        for wid in wids:
            ww = wid.get_content_width() + (12 if isinstance(wid, FaceCover) else 0) if isinstance(wid, (Spine, FaceCover)) else getattr(wid, "deco_w", 34)
            if row is None or (used and used + ww + 3 > inner):
                row, used = Gtk.Box(spacing=3), 0; rows += 1
                row.add_css_class("shelf-row"); self.case.append(row)
            row.append(wid); used += ww + 3
        # plusieurs étages même avec peu de livres : on complète par des étagères décorées
        for r in range(rows, 3):
            row = Gtk.Box(spacing=round(inner * .2)); row.add_css_class("shelf-row"); self.case.append(row)
            if on:
                d = deco_widget(nd, True); nd += 1; d.set_margin_start(round(inner * (.08 + (r * 29) % 46 / 100))); row.append(d)
                if r % 2:
                    row.append(deco_widget(nd, True)); nd += 1

    # un livre de l'étagère, en 3D : il pivote de la tranche vers la couverture
    def book_view(self, item):
        dlg = Adw.Dialog(content_width=460, content_height=640, title=item.get("title") or T("Sans titre"))
        tv = Adw.ToolbarView(); tv.add_top_bar(Adw.HeaderBar(show_title=False))
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6, margin_start=24, margin_end=24, margin_bottom=24)
        ph = lambda f: cover_pixbuf(Library.spine_path(item["id"], f)) if item.get(f) else None  # noqa: E731
        b3 = Book3D(item, cover_pixbuf(item.get("cover")) if item["kind"] == "book" else ph("front"), ph("back")); box.append(b3)
        t = Gtk.Label(label=item.get("title") or T("Sans titre"), wrap=True, justify=Gtk.Justification.CENTER); t.add_css_class("title-2")
        sub = [item.get("author") or "", T("Livre numérique") if item["kind"] == "book" else T("Livre papier")]
        a = Gtk.Label(label=" · ".join(x for x in sub if x), wrap=True, justify=Gtk.Justification.CENTER); a.add_css_class("muted")
        acts = Gtk.Box(spacing=10, halign=Gtk.Align.CENTER, margin_top=12)
        if item["kind"] == "book":
            o = Gtk.Button(label=T("Ouvrir le livre")); o.add_css_class("suggested-action"); o.add_css_class("pill")
            o.connect("clicked", lambda *_: (dlg.close(), self.open_book(item["bid"]))); acts.append(o)
        e = Gtk.Button(label=T("Tranche et infos")); e.add_css_class("pill")
        e.connect("clicked", lambda *_: (dlg.close(), self.spine_dialog(item))); acts.append(e)
        for wdg in (t, a, acts):
            box.append(wdg)
        tv.set_content(box); dlg.set_child(tv); dlg.present(self)
        GLib.timeout_add(120, lambda: b3.start() and False)

    def set_rack_deco(self, on):
        self.settings["rack_deco"] = on; self.lib.save_settings(self.settings)
        self.layout_case(force=True)

    def set_rack_sort(self, k):
        self.settings["rack_sort"] = k; self.lib.save_settings(self.settings)
        self.layout_case(force=True); self.fill_rack()

    def open_rack(self):
        self.stack.set_visible_child_name("rack"); self.case_w = 0

    def close_rack(self):
        self.stack.set_visible_child_name("library"); self.refresh_library()

    def rack_changed(self):
        if self.stack.get_visible_child_name() in ("library", "rack"):
            self.refresh_library()
            self.layout_case(force=True)
        self.push_shelf_soon()

    def push_shelf_soon(self):
        if not self.sync:
            return
        if getattr(self, "shelf_push_id", 0):
            GLib.source_remove(self.shelf_push_id)

        def go():
            self.shelf_push_id = 0
            self.worker.submit(self.sync_cfg, lambda s: s.shelf(),
                               lambda ch: ch and self.stack.get_visible_child_name() in ("library", "rack") and (self.refresh_library(), self.layout_case(force=True)),
                               lambda e: None)
            return False
        self.shelf_push_id = GLib.timeout_add(1500, go)

    def crop_dialog(self, pb, done, hint=None):
        """Recadrage d'une photo de tranche : rectangle déplaçable, redimensionnable par ses coins et ses bords."""
        st = {"pb": pb, "r": [0.0, 0.0, float(pb.get_width()), float(pb.get_height())], "k": 1.0, "o": (0.0, 0.0), "sc": None, "hd": None, "r0": None}
        d = Adw.Dialog(title=T("Recadrer"), content_width=820, content_height=660)
        tv = Adw.ToolbarView(); hb = Adw.HeaderBar(); tv.add_top_bar(hb)
        area = Gtk.DrawingArea(hexpand=True, vexpand=True); area.add_css_class("crop-area")
        HANDLES = {"nw": (0, 0), "n": (.5, 0), "ne": (1, 0), "e": (1, .5), "se": (1, 1), "s": (.5, 1), "sw": (0, 1), "w": (0, .5)}

        def geom(aw, ah):
            p = st["pb"]; W, H = p.get_width(), p.get_height()
            k = min((aw - 48) / W, (ah - 48) / H); st["k"] = k; st["o"] = ((aw - W * k) / 2, (ah - H * k) / 2)
            return W, H, k

        def screen_rect():
            x, y, w, h = st["r"]; k = st["k"]; ox, oy = st["o"]
            return ox + x * k, oy + y * k, w * k, h * k

        def draw(_a, cr, aw, ah):
            W, H, k = geom(aw, ah); ox, oy = st["o"]; sw, sh = max(1, round(W * k)), max(1, round(H * k))
            if not st["sc"] or st["sc"].get_width() != sw or st["sc"].get_height() != sh:
                st["sc"] = st["pb"].scale_simple(sw, sh, GdkPixbuf.InterpType.BILINEAR)
            cr.set_source_rgb(.05, .047, .063); cr.paint()
            Gdk.cairo_set_source_pixbuf(cr, st["sc"], ox, oy); cr.paint()
            X, Y, w, h = screen_rect()
            cr.set_fill_rule(cairo.FILL_RULE_EVEN_ODD); cr.rectangle(ox, oy, sw, sh); cr.rectangle(X, Y, w, h)
            cr.set_source_rgba(.03, .02, .06, .62); cr.fill()
            cr.set_source_rgb(1, 1, 1); cr.set_line_width(2); cr.rectangle(X, Y, w, h); cr.stroke()
            for fx, fy in HANDLES.values():
                cr.arc(X + w * fx, Y + h * fy, 6, 0, 2 * math.pi); cr.set_source_rgb(1, 1, 1); cr.fill_preserve()
                cr.set_source_rgb(.427, .357, .816); cr.set_line_width(2); cr.stroke()

        def hit(px, py):
            X, Y, w, h = screen_rect()
            for name, (fx, fy) in HANDLES.items():
                if abs(px - (X + w * fx)) < 14 and abs(py - (Y + h * fy)) < 14:
                    return name
            return "m" if X <= px <= X + w and Y <= py <= Y + h else None

        def begin(g, px, py):
            st["hd"] = hit(px, py); st["r0"] = list(st["r"])

        def update(g, dx, dy):
            hd = st["hd"]
            if not hd:
                return
            k = st["k"]; dx, dy = dx / k, dy / k; x, y, w, h = st["r0"]; W, H, m = st["pb"].get_width(), st["pb"].get_height(), 16
            if hd == "m":
                x, y = x + dx, y + dy
            else:
                if "w" in hd:
                    nx = min(max(0, x + dx), x + w - m); w += x - nx; x = nx
                if "e" in hd:
                    w = min(max(m, w + dx), W - x)
                if "n" in hd:
                    ny = min(max(0, y + dy), y + h - m); h += y - ny; y = ny
                if "s" in hd:
                    h = min(max(m, h + dy), H - y)
            w, h = min(w, W), min(h, H); x, y = min(max(x, 0), W - w), min(max(y, 0), H - h)
            st["r"] = [x, y, w, h]; area.queue_draw()

        CURS = {"nw": "nwse-resize", "se": "nwse-resize", "ne": "nesw-resize", "sw": "nesw-resize", "n": "ns-resize", "s": "ns-resize",
                "e": "ew-resize", "w": "ew-resize", "m": "move"}
        mo = Gtk.EventControllerMotion(); mo.connect("motion", lambda c, px, py: area.set_cursor(Gdk.Cursor.new_from_name(CURS.get(hit(px, py), "default"))))
        dg = Gtk.GestureDrag(); dg.connect("drag-begin", begin); dg.connect("drag-update", update)
        area.add_controller(mo); area.add_controller(dg); area.set_draw_func(draw)

        def rotate(*_):
            p = st["pb"]; H = p.get_height(); x, y, w, h = st["r"]
            st["pb"] = p.rotate_simple(GdkPixbuf.PixbufRotation.CLOCKWISE); st["r"] = [H - y - h, x, h, w]; st["sc"] = None; area.queue_draw()

        def use(*_):
            x, y, w, h = (round(v) for v in st["r"]); p = st["pb"]
            w, h = max(1, min(w, p.get_width() - x)), max(1, min(h, p.get_height() - y))
            sub = p.new_subpixbuf(x, y, w, h).copy(); d.close(); done(sub)

        rot = Gtk.Button(icon_name="object-rotate-right-symbolic", tooltip_text=T("Faire pivoter")); rot.connect("clicked", rotate)
        ok = Gtk.Button(label=T("Utiliser")); ok.add_css_class("suggested-action"); ok.connect("clicked", use)
        hb.pack_start(rot); hb.pack_end(ok)
        tip = Gtk.Label(label=hint or T("Ajustez le cadre sur la tranche"), margin_top=8, margin_bottom=12); tip.add_css_class("muted")
        body = Gtk.Box(orientation=Gtk.Orientation.VERTICAL); body.append(area); body.append(tip)
        tv.set_content(body); d.set_child(tv); d.present(self)

    def pick_image(self, title, done):
        flt = Gtk.FileFilter(name=T("Images"))
        for m in ("image/png", "image/jpeg", "image/webp"):
            flt.add_mime_type(m)
        fl = Gio.ListStore.new(Gtk.FileFilter); fl.append(flt)

        def picked(dlg, res):
            try:
                f = dlg.open_finish(res)
            except GLib.Error:
                return
            try:
                pb = GdkPixbuf.Pixbuf.new_from_file(f.get_path()); pb = pb.apply_embedded_orientation() or pb
            except GLib.Error as e:
                return self.toast(T("Image illisible : {e}", e=e.message))
            done(pb)
        Gtk.FileDialog(title=title, filters=fl).open(self, None, picked)

    def spine_dialog(self, item):
        """Fiche d'un livre de l'étagère ; item None = nouveau livre papier."""
        new = item is None
        st = {"photo": None}                       # photo choisie avant d'enregistrer un nouveau livre
        d = Adw.Dialog(title=T("Ajouter un livre papier") if new else (item["title"] or T("Sans titre")), content_width=480)
        tv = Adw.ToolbarView(); tv.add_top_bar(Adw.HeaderBar())
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14, margin_start=22, margin_end=22, margin_bottom=22)
        top = Gtk.Box(spacing=20)
        holder = Gtk.Box(valign=Gtk.Align.END); holder.add_css_class("spine-prev")
        fields = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8, hexpand=True, valign=Gtk.Align.END)
        is_book = bool(item and item["kind"] == "book")
        kind = Gtk.Label(label=T("Livre numérique") if is_book else T("Livre papier"), xalign=0); kind.add_css_class("kicker")
        lb = Gtk.ListBox(selection_mode=Gtk.SelectionMode.NONE); lb.add_css_class("boxed-list")
        te, ae = Adw.EntryRow(title=T("Titre")), Adw.EntryRow(title=T("Auteur"))
        if item:
            te.set_text(item["title"] or ""); ae.set_text(item.get("author") or "")
        te.set_sensitive(not is_book); ae.set_sensitive(not is_book)
        lb.append(te); lb.append(ae)
        fields.append(kind); fields.append(lb)
        top.append(holder); top.append(fields)
        base = lambda: ({"kind": "book", "title": item["title"], "author": item.get("author") or ""} if is_book
                        else {"kind": "paper", "title": te.get_text().strip()[:300], "author": ae.get_text().strip()[:200]})
        ph_row = Gtk.Box(spacing=10, homogeneous=True)

        def current():
            if new:
                return {"id": "nouveau", "kind": "paper", "title": te.get_text(), "photo": st["photo"]}
            x = self.lib.shelf_item(item["id"])
            return {**item, "spine": x["spine"] if x and not x["deleted"] else 0}

        def repaint():
            c = holder.get_first_child()
            if c:
                holder.remove(c)
            it = current(); holder.append(Spine(it, big=True))
            ph_row.set_visible(bool(it.get("photo") or (it.get("spine") and Library.spine_path(it["id"]).exists())))

        def store(data):
            if new:
                f = Path(tempfile.gettempdir()) / f"folio-spine-new-{os.getpid()}.jpg"
                if data:
                    f.write_bytes(data)
                st["photo"] = str(f) if data else None
            else:
                self.lib.set_spine(item["id"], data, **base())
                self.toast(T("Tranche mise à jour") if data else T("Photo retirée")); self.rack_changed()
            repaint()

        def pick(*_):
            flt = Gtk.FileFilter(name=T("Images"))
            for m in ("image/png", "image/jpeg", "image/webp"):
                flt.add_mime_type(m)
            fl = Gio.ListStore.new(Gtk.FileFilter); fl.append(flt)

            def picked(dlg, res):
                try:
                    f = dlg.open_finish(res)
                except GLib.Error:
                    return
                try:
                    pb = GdkPixbuf.Pixbuf.new_from_file(f.get_path()); pb = pb.apply_embedded_orientation() or pb
                except GLib.Error as e:
                    return self.toast(T("Image illisible : {e}", e=e.message))
                self.crop_dialog(pb, lambda sub: store(spine_jpeg(pb=sub)))
            Gtk.FileDialog(title=T("Photo de la tranche"), filters=fl).open(self, None, picked)

        # couverture (livres papier : un livre numérique a déjà la sienne) et dos : pour la vue 3D
        faces = Gtk.Box(spacing=18)
        faces_t = Gtk.Label(label=T("Couverture et dos (vue 3D)"), xalign=0); faces_t.add_css_class("kicker")

        def face_tile(face, label):
            col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
            pic = Gtk.Picture(content_fit=Gtk.ContentFit.COVER, width_request=84, height_request=126, can_shrink=True); pic.add_css_class("face-thumb")
            btns = Gtk.Box(spacing=2, halign=Gtk.Align.CENTER)
            imp_b = Gtk.Button(icon_name="image-x-generic-symbolic", tooltip_text=T("Importer une image")); imp_b.add_css_class("flat")
            rm_b = Gtk.Button(icon_name="user-trash-symbolic", tooltip_text=T("Retirer la photo")); rm_b.add_css_class("flat")
            btns.append(imp_b); btns.append(rm_b)
            lab = Gtk.Label(label=label); lab.add_css_class("caption"); lab.add_css_class("muted")
            for w in (pic, lab, btns):
                col.append(w)

            def path():
                if new:
                    return st.get(face)
                x = self.lib.shelf_item(item["id"]) or {}
                p = Library.spine_path(item["id"], face)
                return str(p) if x.get(face) and not x.get("deleted") and p.exists() else None

            def paint():
                p = path(); pic.set_filename(p); rm_b.set_visible(bool(p))
            def store_face(data):
                if new:
                    f = Path(tempfile.gettempdir()) / f"folio-{face}-new-{os.getpid()}.jpg"
                    if data:
                        f.write_bytes(data)
                    else:
                        f.unlink(missing_ok=True)
                    st[face] = str(f) if data else None
                else:
                    self.lib.set_spine(item["id"], data, face=face, **base())
                    self.toast(T("Photo enregistrée") if data else T("Photo retirée")); self.rack_changed()
                paint()
            hint = T("Cadrez la couverture du livre") if face == "front" else T("Cadrez le dos du livre (4e de couverture)")
            imp_b.connect("clicked", lambda *_: self.pick_image(label, lambda pb: self.crop_dialog(pb, lambda sub: store_face(face_jpeg(sub)), hint)))
            rm_b.connect("clicked", lambda *_: store_face(None))
            paint()
            return col
        if not is_book:
            faces.append(face_tile("front", T("Couverture")))
        faces.append(face_tile("back", T("Dos")))

        def rotate(*_):
            p = st["photo"] if new else str(Library.spine_path(item["id"]))
            if p and os.path.exists(p):
                store(spine_jpeg(data=Path(p).read_bytes(), turn=True))

        imp = Gtk.Button(child=Adw.ButtonContent(icon_name="image-x-generic-symbolic", label=T("Importer la photo de la tranche")))
        imp.add_css_class("pill"); imp.add_css_class("suggested-action"); imp.connect("clicked", pick)
        def recrop(*_):
            p = st["photo"] if new else str(Library.spine_path(item["id"]))
            if p and os.path.exists(p):
                self.crop_dialog(GdkPixbuf.Pixbuf.new_from_file(p), lambda sub: store(spine_jpeg(pb=sub)))

        rot = Gtk.Button(child=Adw.ButtonContent(icon_name="object-rotate-right-symbolic", label=T("Faire pivoter"))); rot.add_css_class("pill")
        rot.connect("clicked", rotate)
        crp = Gtk.Button(child=Adw.ButtonContent(icon_name="folio-crop-symbolic", label=T("Recadrer"))); crp.add_css_class("pill")
        crp.connect("clicked", recrop); ph_row.append(crp)
        rm = Gtk.Button(label=T("Retirer la photo")); rm.add_css_class("pill"); rm.connect("clicked", lambda *_: store(None))
        ph_row.append(rot); ph_row.append(rm)
        acts = Gtk.Box(spacing=10, homogeneous=True)
        if is_book:
            ob = Gtk.Button(child=Adw.ButtonContent(icon_name="accessories-dictionary-symbolic", label=T("Ouvrir le livre"))); ob.add_css_class("pill")
            ob.connect("clicked", lambda *_: (d.close(), self.open_book(item["bid"]))); acts.append(ob)
        if new:
            sv = Gtk.Button(label=T("Enregistrer")); sv.add_css_class("pill"); sv.add_css_class("suggested-action")

            def save(*_):
                b = base()
                if not b["title"]:
                    return self.toast(T("Indiquez au moins le titre"))
                sid = self.lib.new_paper(b["title"], b["author"])
                if st["photo"]:
                    self.lib.set_spine(sid, Path(st["photo"]).read_bytes(), **b); Path(st["photo"]).unlink(missing_ok=True)
                for face in ("front", "back"):
                    if st.get(face):
                        self.lib.set_spine(sid, Path(st[face]).read_bytes(), face=face, **b); Path(st[face]).unlink(missing_ok=True)
                d.close(); self.toast(T("« {t} » rangé sur l’étagère", t=b["title"])); self.rack_changed()
            sv.connect("clicked", save); acts.append(sv)
        elif not is_book:
            dl = Gtk.Button(child=Adw.ButtonContent(icon_name="user-trash-symbolic", label=T("Retirer de l’étagère")))
            dl.add_css_class("pill"); dl.add_css_class("destructive-action")

            def remove(*_):
                for face in self.lib.FACES:
                    self.lib.set_spine(item["id"], None, face=face)
                self.lib.shelf_put(item["id"], deleted=1)
                d.close(); self.toast(T("Livre retiré de l’étagère")); self.rack_changed()
            dl.connect("clicked", remove); acts.append(dl)

        def closed(*_):                           # titre ou auteur d'un livre papier modifiés
            if not new and not is_book:
                b, x = base(), self.lib.shelf_item(item["id"])
                if x and not x["deleted"] and b["title"] and (b["title"] != x["title"] or b["author"] != x["author"]):
                    self.lib.shelf_put(item["id"], title=b["title"], author=b["author"]); self.rack_changed()
            for k in ("photo", "front", "back"):
                if new and st.get(k):
                    Path(st[k]).unlink(missing_ok=True)
        d.connect("closed", closed)
        tip = Gtk.Label(label=T("Astuce : livre debout, tranche bien droite et cadrée serrée. Une photo prise à plat est redressée."), wrap=True, xalign=0)
        tip.add_css_class("muted"); tip.add_css_class("caption")
        for w in (top, imp, ph_row, faces_t, faces, acts, tip):
            box.append(w)
        repaint()
        tv.set_content(box); d.set_child(tv); d.present(self)
        if new:
            te.grab_focus()

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
        self.nomatch.set_visible(not shown and (bool(self.query) or self.shelf != "all") and not self.folded("lib"))
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
        self.AVATAR.unlink(missing_ok=True); self.lib.reset_sync_marks(); self.drafts.forget_state()
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
        mine = {k: self.settings.get(k) for k in synced_keys(self.settings)}
        upd = self.settings.get("settings_updated", 0)
        api = isinstance(self.sync, ApiSync)
        want_profile = api and (profile or not quiet or time.time() - self.last_profile > 600)
        known_av = (self.settings.get("account") or {}).get("avatar", 0)
        store = self.drafts

        def job(s):                      # thread de synchro
            s.moved.clear()
            changed = s.pull()
            s.push_all()
            remote = s.settings(mine, upd)
            try:
                colls = s.collections()
            except (OSError, ValueError):
                colls = False
            try:
                colls = s.shelf() or colls
            except (OSError, ValueError):
                pass
            prof = self.fetch_profile(s, known_av) if want_profile else None
            try:
                drafts = draftsmod.sync_all(s, store) if api else []
            except (OSError, ValueError, KeyError):
                drafts = []
            return changed, set(s.moved), remote, prof, colls, drafts

        def done(r):                     # retour dans l'interface
            self.sync_finished()
            changed, moved, remote, prof, colls, drafts = r
            for did in drafts:
                self.wjs(f"Writer.remote({json.dumps(did)})")
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
                self.js(f"Folio.resume({json.dumps(self.cur['cfi'])})"); self.toast(T("Repris à la position de l’autre appareil"))
        if not in_reader:
            self.refresh_library()

    def apply_remote_settings(self, remote, rupd):
        """Le serveur l'emporte s'il est plus récent, ou à égalité (ex. jamais modifié : horodatage 0)."""
        upd = self.settings.get("settings_updated", 0)
        mine = {k: self.settings.get(k) for k in synced_keys(self.settings)}
        if rupd >= upd and any(remote.get(k) != mine.get(k) for k in mine if k in remote):
            self.settings.update({k: remote[k] for k in mine if k in remote})
            self.settings["settings_updated"] = rupd
            self.refresh_appearance()

    def refresh_appearance(self):
        self.lib.save_settings(self.settings)
        pop = self.aa_btn.get_popover()
        if not pop.get_visible():
            self.aa_btn.set_popover(self.build_settings_popover())
        elif not getattr(pop, "_stale", False):    # ouvert : on le reconstruit à la fermeture
            pop._stale = True
            pop.connect("closed", lambda *_: GLib.idle_add(lambda: self.aa_btn.set_popover(self.build_settings_popover()) and False))
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
            mine = {k: self.settings.get(k) for k in synced_keys(self.settings)}
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

    # ------------------------------------------------------------------ mise à jour depuis l'appli
    # Le serveur Folio liste ses paquets (/api/releases, avec SHA-256) ; le .deb plus récent est téléchargé, vérifié,
    # puis installé par apt (mot de passe administrateur demandé par le système, via pkexec) et Folio redémarre.
    @staticmethod
    def installed_version():
        try:
            return Path(SHARE, "VERSION").read_text().strip()
        except OSError:
            return ""                   # lancé depuis les sources : pas de mise à jour automatique

    def check_update(self, manual=False):
        cur = self.installed_version()
        if not cur:
            return manual and self.toast(T("Mise à jour : seulement pour Folio installé depuis le paquet .deb"))
        server = ((self.settings.get("account") or {}).get("server") or DEFAULT_SERVER).rstrip("/")
        if not server:
            return manual and self.toast(T("Mise à jour impossible"))
        vt = lambda v: tuple(int(x) for x in v.split("."))  # noqa: E731

        def run():
            best = None
            try:
                req = urllib.request.Request(server + "/api/releases", headers={"User-Agent": "Folio-Linux/" + cur})
                for r in json.load(urllib.request.urlopen(req, timeout=20)):
                    m = re.match(r"^Folio-(\d+\.\d+\.\d+)-linux\.deb$", r.get("name", ""))
                    if m and re.match(r"^[0-9a-f]{64}$", r.get("sha256", "")) and vt(m[1]) > vt(cur) and (not best or vt(m[1]) > vt(best[0])):
                        best = (m[1], r)
            except (OSError, ValueError):
                best = False
            GLib.idle_add(lambda: self.update_found(best, server, manual) and False)
        threading.Thread(target=run, daemon=True).start()

    def update_found(self, best, server, manual):
        if not best:
            if manual:
                self.toast(T("Mise à jour impossible") if best is False else T("Folio est à jour"))
            return
        t = Adw.Toast(title=T("Folio {v} est disponible", v=best[0]), button_label=T("Mettre à jour"), timeout=0)
        t.connect("button-clicked", lambda *_: self.do_update(best[1], server))
        self.toasts.add_toast(t)

    def do_update(self, rel, server):
        self.toast(T("Téléchargement de la mise à jour…"))
        dest = Path(tempfile.mkdtemp(prefix="folio-upd-")) / rel["name"]

        def run():
            try:
                h = hashlib.sha256()
                with urllib.request.urlopen(urllib.request.Request(server + "/dl/" + urllib.parse.quote(rel["name"]),
                                                                   headers={"User-Agent": "Folio-Linux"}), timeout=60) as r, open(dest, "wb") as f:
                    while chunk := r.read(1 << 16):
                        h.update(chunk); f.write(chunk)
                ok = h.hexdigest() == rel["sha256"]
            except OSError:
                ok = False
            GLib.idle_add(lambda: self.install_update(dest, ok) and False)
        threading.Thread(target=run, daemon=True).start()

    def install_update(self, deb, ok):
        if not ok:
            deb.unlink(missing_ok=True)
            return self.toast(T("Mise à jour impossible"))
        os.chmod(deb.parent, 0o755); os.chmod(deb, 0o644)       # lisible par apt (utilisateur _apt)
        p = Gio.Subprocess.new(["pkexec", "apt-get", "install", "-y", "--allow-downgrades", str(deb)],
                               Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE)

        def done(proc, res):
            proc.wait_finish(res); shutil.rmtree(deb.parent, ignore_errors=True)
            if not proc.get_successful():
                return self.toast(T("Mise à jour annulée"))
            # relance de la nouvelle version, puis on ferme celle-ci
            subprocess.Popen(["sh", "-c", "sleep 1; exec folio"], start_new_session=True)
            self.get_application().quit()
        p.wait_async(None, done)

    def open_site(self):
        url = (self.settings.get("account") or {}).get("server") or DEFAULT_SERVER
        if not url:
            return
        Gtk.UriLauncher(uri=url.rstrip("/") + "/").launch(self, None, None)

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
        voice = Gtk.Button(icon_name="audio-headphones-symbolic", tooltip_text=T("Lecture à voix haute"), valign=Gtk.Align.CENTER)
        voice.add_css_class("circ"); voice.connect("clicked", lambda *_: self.js("Folio.voice()"))
        header.pack_end(aa); header.pack_end(self.side_btn); header.pack_end(self.bm_btn); header.pack_end(voice)
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

    # ------------------------------------------------------------------ lecture à voix haute (voix Piper du serveur)
    def tts_ask(self, m):
        rid, acc = int(m.get("id") or 0), self.settings.get("account")
        if not acc:
            return self.js(f"Folio.reply({rid}, null)")

        def run():                       # hors du thread de l'interface (et sans attendre une synchro en cours)
            api = ApiSync(None, acc["server"], acc["token"])
            try:
                if m["t"] == "tts_voices":
                    v = api._json("GET", "/api/tts/voices")
                else:
                    body = json.dumps({"voice": str(m.get("voice", "")), "text": str(m.get("text", ""))[:1000]}).encode()
                    resp = api._req("POST", "/api/tts", body)       # MP3 (voix Google) ou WAV (Piper)
                    v = {"data": base64.b64encode(resp.read()).decode(), "type": resp.headers.get_content_type()}
            except Exception:  # noqa: BLE001 — la barre affiche « voix indisponible »
                v = [] if m["t"] == "tts_voices" else None
            GLib.idle_add(lambda: self.js(f"Folio.reply({rid}, {json.dumps(v)})") and False)
        threading.Thread(target=run, daemon=True).start()

    # ------------------------------------------------------------------ écrire un livre (writer/write.js)
    def build_writer_page(self):
        view = Adw.ToolbarView(top_bar_style=Adw.ToolbarStyle.FLAT)
        header = Adw.HeaderBar(title_widget=Gtk.Label())   # le titre est dans la page
        back = Gtk.Button(icon_name="go-previous-symbolic", tooltip_text=T("Bibliothèque (Échap)"), valign=Gtk.Align.CENTER)
        back.add_css_class("circ"); back.connect("clicked", lambda *_: self.close_writer())
        header.pack_start(back)
        view.add_top_bar(header)
        self.wweb = WebKit.WebView(hexpand=True, vexpand=True)
        ws = self.wweb.get_settings()
        getattr(ws, "set_allow_file_access_from_file_urls", lambda v: None)(True)
        ws.set_enable_developer_extras(bool(os.environ.get("FOLIO_DEBUG")))
        self.wweb.set_settings(ws)
        self.wweb.set_background_color(Gdk.RGBA(alpha=0))
        ucm = self.wweb.get_user_content_manager()
        ucm.register_script_message_handler("writer", None)
        ucm.connect("script-message-received::writer", self.on_writer_message)
        self.wweb.load_uri(GLib.filename_to_uri(os.path.join(SHARE, "writer", "writer.html")))
        view.set_content(self.wweb)
        return view

    def wjs(self, code):
        if self.writer_ready:
            self.wweb.evaluate_javascript(code, -1)

    # raccourcis de la fenêtre (Ctrl+F, Ctrl+O, Échap…) coupés pendant l'écriture : l'éditeur a les siens
    def writer_keys(self, on):
        for n in ("add", "search", "back", "toc", "bookmark"):
            a = self.lookup_action(n)
            if a:
                a.set_enabled(on)

    def open_writer(self):
        self.stack.set_visible_child_name("writer")
        self.writer_keys(False)
        self.writer_start()

    def writer_start(self):
        self.wjs(f"Writer.start({json.dumps({'bg': self.settings['bg'], 'fg': self.settings['fg'], 'lang': LANG})})")
        self.wweb.grab_focus()

    def close_writer(self):
        self.wjs("Writer.flush()")
        self.writer_keys(True)
        self.stack.set_visible_child_name("library")
        self.refresh_library()

    def on_writer_message(self, _ucm, value):
        try:
            m = json.loads(value.to_string())
        except ValueError:
            return
        t, rid = m.get("t"), int(m.get("id") or 0)
        reply = lambda v: self.wjs(f"Writer.reply({rid}, {json.dumps(v)})")  # noqa: E731
        try:
            if t == "ready":
                self.writer_ready = True
                if self.stack.get_visible_child_name() == "writer":
                    self.writer_start()
            elif t == "list":
                reply(self.drafts.list())
            elif t == "get":
                reply(self.drafts.get(m.get("did")))
            elif t == "put":
                self.drafts.put(m["d"]); reply(True)
            elif t == "snap":
                self.drafts.snap(m["d"]); reply(True)
            elif t == "snaps":
                reply(self.drafts.snaps(m.get("did")))
            elif t == "changed":
                self.draft_changed(str(m.get("did")), rid)
            elif t == "export":
                self.export_epub(m, reply)
            elif t == "library":
                self.draft_to_library(m, reply)
            elif t == "toast":
                self.toast(str(m.get("s", "")))
            elif t == "close":
                self.close_writer()
        except (OSError, ValueError, KeyError, TypeError) as e:
            self.toast(T("Enregistrement impossible : {e}", e=e)); reply(None)

    # envoi au serveur 2 s après la dernière frappe ; l'éditeur reçoit true (synchronisé), false (injoignable) ou null (pas de compte)
    def draft_changed(self, did, rid):
        if not isinstance(self.sync, ApiSync) or not draftsmod.DID.match(did):
            return self.wjs(f"Writer.reply({rid}, null)")
        self.draft_wait.setdefault(did, []).append(rid)
        if self.draft_timer.get(did):
            GLib.source_remove(self.draft_timer[did])
        self.draft_timer[did] = GLib.timeout_add(2000, lambda: self.draft_push(did))

    def draft_push(self, did):
        self.draft_timer.pop(did, None)
        rids, store = self.draft_wait.pop(did, []), self.drafts

        def finish(ok, fresh=False):
            for r in rids:
                self.wjs(f"Writer.reply({r}, {json.dumps(ok)})")
            if fresh:
                self.wjs(f"Writer.remote({json.dumps(did)})")
        self.worker.submit(self.sync_cfg, lambda s: draftsmod.push(s, store, did), lambda fresh: finish(True, fresh), lambda e: finish(False))
        return False

    def export_epub(self, m, reply):
        data = base64.b64decode(m.get("data") or "")
        fl = Gio.ListStore.new(Gtk.FileFilter); f = Gtk.FileFilter(name="EPUB"); f.add_pattern("*.epub"); fl.append(f)
        dlg = Gtk.FileDialog(title=T("Exporter en EPUB"), initial_name=str(m.get("name") or "livre.epub"), filters=fl)

        def done(d, res):
            try:
                gf = d.save_finish(res)
            except GLib.Error:
                return reply(False)
            Path(gf.get_path()).write_bytes(data)
            self.toast(T("EPUB enregistré")); reply(True)
        dlg.save(self, None, done)

    # le livre ajouté remplace la version précédente du même manuscrit
    def draft_to_library(self, m, reply):
        did = str(m.get("did"))
        if not draftsmod.DID.match(did):
            return reply(False)
        tmp = Path(tempfile.gettempdir()) / f"folio-draft-{did}.epub"
        tmp.write_bytes(base64.b64decode(m.get("data") or ""))
        try:
            bid = self.add_files([str(tmp)])
        finally:
            tmp.unlink(missing_ok=True)
        links = self.settings.setdefault("draft_lib", {})
        prev = links.get(did)
        if bid and prev and prev != bid and self.lib.book(prev):
            self.do_remove(prev)
        if bid:
            links[did] = bid; self.lib.save_settings(self.settings)
            if self.sync:
                self.sync_now(quiet=True)
        reply(bool(bid))

    def on_message(self, _ucm, value):
        try:
            m = json.loads(value.to_string())
        except ValueError:
            return
        t = m.get("t")
        if t in ("tts_voices", "tts"):
            return self.tts_ask(m)
        if t == "login":
            self.close_book(); return self.account_dialog()
        if t == "ready":
            self.web_ready = True
            if self.pending_open and self.cur:
                self.send_open()
        elif not self.cur:
            return
        elif t == "relocated":
            self.state = m
            if not m.get("keep"):   # position reçue et pas encore bougée : on ne la redate pas
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
        acc = "#a798ff" if dark else "#6d5bd0"      # violet, comme le site
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
        self.fonts = [T("Police du livre"), "OpenDyslexic"] + [f for f in fams if f != "OpenDyslexic"]   # OpenDyslexic : livrée avec l'appli (dyslexie)
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
        # --- ce qui est partagé avec les autres appareils
        hdr2 = Gtk.Label(label=T("SYNCHRONISATION ENTRE APPAREILS"), xalign=0, margin_start=6, margin_top=4)
        hdr2.add_css_class("sub-head"); outer.append(hdr2)
        note = Gtk.Label(label=T("Décochez ce que cet appareil doit garder pour lui : il ne l’enverra plus et ne recevra plus celui des autres."),
                         xalign=0, wrap=True, max_width_chars=44, margin_start=6, margin_end=6)
        note.add_css_class("dim-label"); outer.append(note)
        sg = Gtk.ListBox(selection_mode=Gtk.SelectionMode.NONE); sg.add_css_class("boxed-list")
        for g, label in (("colors", "Thème et couleurs"), ("font", "Police"), ("size", "Taille du texte"),
                         ("spacing", "Interligne et typographie"), ("margin", "Marges"),
                         ("layout", "Justification, pages ou défilement")):
            w = Gtk.Switch(active=g not in (s.get("nosync") or []), valign=Gtk.Align.CENTER)
            w.connect("notify::active", lambda w, _p, g=g: self.set_sync_group(g, w.get_active()))
            r = Adw.ActionRow(title=T(label), activatable=False); r.add_suffix(w); sg.append(r)
        outer.append(sg)
        reset = Gtk.Button(label=T("Réinitialiser l’apparence"), halign=Gtk.Align.CENTER)
        reset.add_css_class("flat"); reset.connect("clicked", lambda *_: self.reset_appearance())
        outer.append(reset)
        pop.set_child(Gtk.ScrolledWindow(child=outer, propagate_natural_height=True, max_content_height=640,
                                         hscrollbar_policy=Gtk.PolicyType.NEVER))
        return pop

    def set_sync_group(self, group, on):
        off = [g for g in (self.settings.get("nosync") or []) if g != group]
        self.settings["nosync"] = off if on else off + [group]
        self.lib.save_settings(self.settings)
        if on and self.sync:                    # on reprend la valeur partagée
            keys = SYNC_GROUPS[group]

            def got(r):
                remote = r[0]
                if any(k in remote and remote[k] != self.settings.get(k) for k in keys):
                    self.settings.update({k: remote[k] for k in keys if k in remote})
                    self.refresh_appearance()
            self.worker.submit(self.sync_cfg, lambda s: s.settings({}, 0), got, lambda e: None)

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
        if self.stack.get_visible_child_name() == "rack":
            return self.close_rack()
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
