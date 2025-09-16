import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import client from '../sanityClient';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const q = `*[_type == "product" && slug.current == $slug][0]{
          _id, title, shortDescription, longDescription, images[]{asset->{url}}, price, salePrice
        }`;
        const data = await client.fetch(q, { slug }).catch(() => null);
        if (!alive) return;
        setProduct(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const images = useMemo(() => (product?.images || []).map((i) => i?.asset?.url).filter(Boolean), [product]);
  const price = product ? ((product.salePrice ?? product.price) || 0) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 py-8">
      <Helmet>
        <title>{product ? `${product.title} | Local Effort` : 'Product | Local Effort'}</title>
        {product && (
          <meta name="description" content={product.shortDescription || ''} />
        )}
      </Helmet>
      <div className="mb-4 text-sm text-neutral-600"><Link to="/sale" className="underline">Back to Sale</Link></div>
      {loading ? (
        <div>Loading…</div>
      ) : !product ? (
        <div>Not found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="aspect-[4/3] bg-neutral-100 rounded overflow-hidden">
              {images[0] ? (
                <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-neutral-400">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {images.slice(1, 5).map((u, i) => (
                  <img key={i} src={u} alt="" className="h-20 w-full object-cover rounded" />
                ))}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
            {product.shortDescription && (
              <p className="mt-2 text-neutral-700">{product.shortDescription}</p>
            )}
            <div className="mt-3 text-xl font-semibold">${(price/100).toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
