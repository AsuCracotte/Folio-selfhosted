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
  const c = cur && !cur.removed ? cur : { position: {}, bookmarks: [], highlights: [] };
  const newer = (inc.position?.updated || 0) > (c.position?.updated || 0);
  return {
    hash: inc.hash,
    title: inc.title || c.title || "",
    author: inc.author || c.author || "",
    position: newer ? inc.position : c.position || { cfi: "", progress: 0, updated: 0 },
    bookmarks: items(c.bookmarks, inc.bookmarks),
    highlights: items(c.highlights, inc.highlights),
    // couverture choisie : la plus récente gagne ; les anciens clients n'envoient rien (on garde l'existante)
    cover: (inc.cover?.updated || 0) > (c.cover?.updated || 0) ? inc.cover : c.cover || { updated: 0, custom: false },
  };
}
module.exports = { mergeState };
