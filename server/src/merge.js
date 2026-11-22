// Fusion identique à celle des clients : le plus récent gagne, les suppressions (deleted=1) sont conservées.
const items = (a = [], b = []) => {
  const m = new Map(a.map((x) => [x.cfi, x]));
  for (const r of b) {
    const l = m.get(r.cfi);
    if (!l || (l.updated || 0) < (r.updated || 0)) m.set(r.cfi, { ...r, deleted: r.deleted ? 1 : 0 });
  }
  return [...m.values()];
};

function mergeState(cur, inc) {
  if (inc.removed) return { hash: inc.hash, removed: inc.removed };
  const c = cur && !cur.removed ? cur : { position: {}, bookmarks: [], highlights: [], postits: [] };
  const newer = (inc.position?.updated || 0) > (c.position?.updated || 0);
  // titre renommé par l'utilisateur : le plus récent gagne ; les anciens clients n'envoient que le titre du fichier
  const name = (inc.name?.updated || 0) > (c.name?.updated || 0) ? inc.name : c.name || { title: "", updated: 0 };
  return {
    hash: inc.hash,
    title: name.title || inc.title || c.title || "",
    name,
    author: inc.author || c.author || "",
    position: newer ? inc.position : c.position || { cfi: "", progress: 0, updated: 0 },
    bookmarks: items(c.bookmarks, inc.bookmarks),
    highlights: items(c.highlights, inc.highlights),
    postits: items(c.postits, inc.postits),      // les clients d'avant n'envoient rien : on garde ce qui existe
    // couverture choisie : la plus récente gagne ; les anciens clients n'envoient rien (on garde l'existante)
    cover: (inc.cover?.updated || 0) > (c.cover?.updated || 0) ? inc.cover : c.cover || { updated: 0, custom: false },
  };
}
// Manuscrit : les métadonnées (titre, ordre des chapitres, couverture…) les plus récentes gagnent,
// puis chaque chapitre est fusionné séparément : deux appareils peuvent écrire deux chapitres différents sans rien perdre.
// Envois partiels : seuls les chapitres modifiés voyagent, et la couverture absente (undefined) veut dire « inchangée ».
function mergeDraft(cur, inc) {
  if (!cur) return inc;
  const meta = (inc.updated || 0) > (cur.updated || 0) ? { ...inc, cover: inc.cover ?? cur.cover } : cur;
  const m = new Map(cur.chapters.map((c) => [c.id, c]));
  for (const c of inc.chapters) { const l = m.get(c.id); if (!l || (l.updated || 0) < (c.updated || 0)) m.set(c.id, c); }
  return { ...meta, chapters: meta.deleted ? [] : [...m.values()] };
}
module.exports = { mergeState, mergeDraft };
