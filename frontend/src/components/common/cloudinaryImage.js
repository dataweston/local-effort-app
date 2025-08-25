import React from 'react';
import { AdvancedImage, responsive, lazyload } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { auto } from "@cloudinary/url-gen/actions/quality";
import { auto as formatAuto } from "@cloudinary/url-gen/actions/delivery";

// Initialize Cloudinary just once
const cld = new Cloudinary({
  cloud: {
    cloudName: 'dokyhfvyd' // Replace with your cloud name
  }
});

/**
 * A powerful, reusable Cloudinary image component.
 * @param {string} publicId - The public ID of the image from Cloudinary.
 * @param {string} alt - The alt text for the image.
 * @param {number} width - The desired width for a fill transformation.
 * @param {number} height - The desired height for a fill transformation.
 * @param {string} className - Optional CSS classes.
 * @param {object} transforms - Optional object for advanced transformations.
 */
const CloudinaryImage = ({ publicId, alt, width, height, className, transforms }) => {
  if (!publicId) {
    return <div className="bg-neutral-200" style={{ width, height }} />;
  }

  const myImage = cld.image(publicId);

  // Apply standard optimizations and transformations
  myImage
    .quality(auto()) // Automatic quality selection
    .delivery(formatAuto()); // Automatic format selection (e.g., AVIF, WebP)

  if (width && height) {
    myImage.resize(fill(width, height).gravity(autoGravity()));
  }

  // Apply any custom transformations passed via props
  if (transforms) {
    // Example: myImage.effect(vignette());
    // You would build a small utility to apply these.
  }

  return (
    <AdvancedImage
      cldImg={myImage}
      alt={alt}
      className={className}
      // This is the magic for responsive images and performance
      plugins={[
        responsive({ steps: [800, 1000, 1400] }), // Generates srcset automatically
        lazyload() // Lazy loads images
      ]}
    />
  );
};

export default CloudinaryImage;