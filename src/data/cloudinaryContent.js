// Central place to list Cloudinary public IDs used around the site.
// Edit these strings to your actual public_ids. Folders are optional.

export const cloudinaryConfig = {
  cloudName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) || 'dokyhfvyd',
};

// Home hero image public_id
export const heroPublicId = 'site/hero/home-hero-1'; // update to your hero image id

// Partner logo public_ids (add/remove as needed)
export const partnerPublicIds = [
  'site/partners/local-effort-logo',
  'site/partners/logo-sticker',
];

// People headshots mapped by simple slugs (lowercase names)
export const peoplePublicIds = {
  // Provided by user
  weston: 'auto_uploads/blazer/2021/01/img8982-9dec1364',
  // Update this to your actual public_id when ready
  catherine: 'site/people/catherine',
};
