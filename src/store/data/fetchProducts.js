import client from '../../sanityClient';

// Fetch active products from Sanity; map to UI shape, using first image asset URL via Sanity CDN
export async function fetchSanityProducts() {
  const query = `*[_type == "product" && active == true]{
    _id,
    title,
    slug,
    shortDescription,
    longDescription,
    images[]{asset->{url}},
    price,
    salePrice,
    squareItemId,
    squareVariationId,
    variants[]{name, squareVariationId, price},
  } | order(title asc)`;
  const docs = await client.fetch(query).catch(() => []);
  return (docs || []).map((d) => ({
    id: d._id,
    title: d.title,
    slug: d.slug?.current,
    shortDescription: d.shortDescription,
    // Long description will be serialized elsewhere if needed; keep as string if already html
    longDescription: Array.isArray(d.longDescription) ? '' : (d.longDescription || ''),
    images: (d.images || []).map((i) => i?.asset?.url).filter(Boolean),
    price: d.price ?? 0,
    salePrice: d.salePrice ?? null,
    squareItemId: d.squareItemId || null,
    squareVariationId: d.squareVariationId || null,
    variants: Array.isArray(d.variants) ? d.variants : [],
  }));
}
