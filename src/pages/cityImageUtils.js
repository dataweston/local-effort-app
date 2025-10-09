import { cloudinaryConfig, heroFallbackSrc } from '../data/cloudinaryContent';

const CLOUD_NAME = cloudinaryConfig?.cloudName || 'dokyhfvyd';

const buildUrl = (publicId, width) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;

/**
 * Helper to create a responsive image descriptor for city landing pages.
 * Provides Cloudinary URLs plus a local fallback for environments where the
 * asset might not be available (or when in-app browsers block third-party cookies).
 */
export const makeCityImage = (publicId, options = {}) => {
  const fallback = options.fallback || heroFallbackSrc;
  if (!publicId) {
    return {
      src: fallback,
      src400: fallback,
      src800: fallback,
      src1200: fallback,
      fallback,
      thumb: fallback,
    };
  }

  const src1200 = buildUrl(publicId, 1200);
  const src800 = buildUrl(publicId, 800);
  const src400 = buildUrl(publicId, 400);

  return {
    src: src1200,
    src400,
    src800,
    src1200,
    fallback,
    thumb: fallback,
  };
};

export default makeCityImage;
