// src/components/CloudinaryImage.jsx
import React from 'react';
import { AdvancedImage, responsive, lazyload } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';

// --- CORRECTED IMPORTS ---
// Each function/action must be imported from its specific file path within the library.
import { fill } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { auto as qualityAuto } from "@cloudinary/url-gen/actions/quality";
import { auto as formatAuto } from "@cloudinary/url-gen/actions/delivery";

// Initialize Cloudinary.
// IMPORTANT: Replace 'your-cloud-name' with your actual Cloudinary cloud name.
const cld = new Cloudinary({
  cloud: {
    cloudName: 'dokyhfvyd'
  }
});

/**
 * A powerful, reusable Cloudinary image component.
 * @param {string} publicId - The public ID of the image from Cloudinary.
 * @param {string} alt - The alt text for the image.
 * @param {number} [width] - The desired width for a fill transformation.
 * @param {number} [height] - The desired height for a fill transformation.
 * @param {string} [className] - Optional CSS classes to apply to the image.
 */
const CloudinaryImage = ({ publicId, alt, width, height, className }) => {
  // If no publicId is provided, render a placeholder to avoid errors
  if (!publicId) {
    const placeholderStyle = {
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
      backgroundColor: '#f0f0f0', // A light gray placeholder
      display: 'inline-block',
    };
    return <span style={placeholderStyle} className={className} />;
  }

  // Use the public ID to get the image object from Cloudinary
  const myImage = cld.image(publicId);

  // Apply standard optimizations and transformations using the correctly imported functions
  myImage
    .quality(qualityAuto()) // Renamed to avoid keyword conflict
    .delivery(formatAuto()); // Renamed to avoid keyword conflict

  // If width and height are provided, apply a fill transformation with auto-gravity
  if (width && height) {
    myImage.resize(fill(width, height).gravity(autoGravity()));
  }

  return (
    <AdvancedImage
      cldImg={myImage}
      alt={alt}
      className={className}
      // These plugins add responsiveness (srcset) and lazy loading for performance
      plugins={[
        responsive({ steps: [800, 1000, 1400] }),
        lazyload()
      ]}
    />
  );
};

export default CloudinaryImage;
