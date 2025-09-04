// Central place to list Cloudinary public IDs used around the site.
// Edit these strings to your actual public_ids. Folders are optional.

export const cloudinaryConfig = {
  cloudName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) || 'dokyhfvyd',
};

// Home hero image public_id
export const heroPublicId = 'site/hero/home-hero-1'; // update to your hero image id
export const heroFallbackSrc = '/gallery/IMG_3145.jpg'; // local fallback image

// Partner logo public_ids (add/remove as needed)
export const partnerLogos = [
  { publicId: 'site/partners/local-effort-logo', name: 'Local Effort', fallbackSrc: '/gallery/logo.png' },
  { publicId: 'site/partners/logo-sticker', name: 'Logo Sticker', fallbackSrc: '/gallery/logo_sticker.png' },
];

// People headshots mapped by simple slugs (lowercase names)
export const peoplePublicIds = {
  // Provided by user
  weston: 'site/people/weston',
  // Update this to your actual public_id when ready
  catherine: 'site/people/catherine',
};
