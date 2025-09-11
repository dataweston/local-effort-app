import React, { useEffect, useMemo, useState } from 'react';
import CloudinaryImage from './cloudinaryImage';

/**
 * PhotoGrid: Renders a responsive grid of images fetched from Cloudinary via our serverless search API.
 * Props:
 * - tags: string | string[] — one or more tags to fetch; if multiple, results are merged uniquely.
 * - title?: string — optional heading above the grid.
 * - perPage?: number — max images to fetch per tag.
 */
export default function PhotoGrid({ tags, title, perPage = 24, layout, masonry = false }) {
  const tagList = useMemo(() => (Array.isArray(tags) ? tags.filter(Boolean) : [tags].filter(Boolean)), [tags]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();

    (async () => {
      if (!tagList.length) {
        setImages([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetches = tagList.map(async (t) => {
          const res = await fetch(`/api/search-images?query=${encodeURIComponent(t)}&per_page=${perPage}`, { signal: controller.signal });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Failed loading tag ${t}`);
          return Array.isArray(data.images) ? data.images : [];
        });
        const results = await Promise.all(fetches);
        if (abort) return;
        const merged = [].concat(...results);
        // unique by asset_id or public_id
        const seen = new Set();
        const unique = merged.filter((img) => {
          const key = img.asset_id || img.public_id || img.publicId;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setImages(unique);
      } catch (e) {
        if (abort) return;
        setError(e.message || String(e));
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, [tagList.join(','), perPage]);

  if (!tagList.length) return null;

  const useMasonry = masonry || String(layout || '').toLowerCase() === 'masonry';

  return (
    <section className="space-y-4">
      {title ? <h3 className="text-2xl font-bold">{title}</h3> : null}
      {loading ? (
        <p>Loading photos…</p>
      ) : error ? (
        <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded">
          <p className="font-semibold">{error}</p>
          <p className="text-sm mt-1">If this persists, check Cloudinary env vars and the serverless function logs.</p>
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-gray-600">No photos found.</p>
      ) : useMasonry ? (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
          {images.map((img, idx) => (
            <div
              key={(img.asset_id || img.public_id || idx) + ':' + idx}
              className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
            >
              {img.thumbnail_url ? (
                <img
                  src={img.thumbnail_url}
                  alt={img.context?.alt || 'Grid image'}
                  className="rounded-lg w-full h-auto"
                  loading="lazy"
                />
              ) : (
                <CloudinaryImage
                  publicId={img.public_id || img.publicId}
                  alt={img.context?.alt || 'Grid image'}
                  width={800}
                  className="rounded-lg w-full h-auto"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={(img.asset_id || img.public_id || idx) + ':' + idx} className="border p-2 bg-white rounded-lg overflow-hidden">
              {img.thumbnail_url ? (
                <img
                  src={img.thumbnail_url}
                  alt={img.context?.alt || 'Grid image'}
                  className="rounded-lg object-cover w-full h-full aspect-square"
                  loading="lazy"
                />
              ) : (
                <CloudinaryImage
                  publicId={img.public_id || img.publicId}
                  alt={img.context?.alt || 'Grid image'}
                  width={600}
                  height={600}
                  className="rounded-lg object-cover w-full h-full aspect-square"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
