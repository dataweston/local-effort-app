import cloudinary from '../../shared/cloudinary.json';

// Photos on /pizza-on-smith are chosen in Sanity Studio (Pizza on Smith Page →
// Photos) and stored as Cloudinary public IDs. Cropping happens at delivery so
// the editor never has to prepare a size.
const BASE = `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload`;

export const cloudinaryUrl = (publicId, { width, ratio }) =>
  `${BASE}/c_fill,${ratio ? `ar_${ratio},` : ''}g_auto,w_${width},f_auto,q_auto/${publicId}`;

export const cloudinarySrcSet = (publicId, widths, ratio) =>
  widths.map((width) => `${cloudinaryUrl(publicId, { width, ratio })} ${width}w`).join(', ');

export const usablePhotos = (photos) =>
  (Array.isArray(photos) ? photos : []).filter((photo) => photo?.publicId && photo?.alt);
