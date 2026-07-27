// Pull a public Rijksstudio user set + resolve each object to its LOD id.
const fs = require('fs');
const SET = 'fe081a96-33a8-4831-77e0-08dee78d1c6c';
const UA = { 'User-Agent': 'Mozilla/5.0 research', Accept: 'application/json' };

const get = async (url, headers = UA) => {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

(async () => {
  const objects = [];
  for (let page = 1; page <= 5; page++) {
    const u = `https://www.rijksmuseum.nl/api/v1/collection/userset?userSetId=${SET}&language=en&setObjectsPage=${page}`;
    const { userSet } = await get(u);
    if (page === 1) console.log(`set "${userSet.title}" by ${userSet.userName} — ${userSet.totalSetObjects} objects, public=${userSet.isPublic}\n`);
    objects.push(...userSet.setObjects);
    if (!userSet.hasMoreResults) break;
  }

  const out = [];
  for (const o of objects) {
    let lodId = null;
    try {
      const s = await get(`https://data.rijksmuseum.nl/search/collection?objectNumber=${encodeURIComponent(o.objectNumber)}`,
        { Accept: 'application/json' });
      lodId = (s.orderedItems || [])[0]?.id || null;
    } catch (e) { lodId = `ERR ${e.message}`; }
    out.push({
      objectNumber: o.objectNumber,
      title: o.title,
      maker: o.makerSubtitleLine,
      lodId,
      micrioId: o.micrioImage?.micrioId || null,
      w: o.micrioImage?.width, h: o.micrioImage?.height,
      downloadable: o.micrioImage?.isDownloadable,
      onView: o.museumLocationFacet,
    });
  }

  out.forEach((o, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${o.title}`);
    console.log(`    ${o.maker}`);
    console.log(`    ${o.objectNumber}  ·  ${o.lodId || 'no LOD match'}  ·  iiif ${o.micrioId} ${o.w}x${o.h}${o.downloadable ? '' : '  [NOT downloadable]'}`);
  });
  fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
  console.log(`\nwrote ${out.length} → ${process.argv[2]}`);
})();
