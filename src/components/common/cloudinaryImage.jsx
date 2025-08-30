// src/components/CloudinaryImage.jsx
import React from 'react';
import { AdvancedImage, responsive, lazyload } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';

// --- CORRECTED IMPORTS ---
// Each function/action must be imported from its specific file path within the library.
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
// The 'auto' helpers for quality and format are 'qualifiers', not 'actions'.
import { auto as qualityAuto } from '@cloudinary/url-gen/qualifiers/quality';
import { auto as formatAuto } from '@cloudinary/url-gen/qualifiers/format';

// Initialize Cloudinary.
// Cloud name can be provided via Vite env var VITE_CLOUDINARY_CLOUD_NAME or
// NODE env CLOUDINARY_CLOUD_NAME. Falls back to the current default.
const CLOUD_NAME =
  import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME ||
  (typeof process !== 'undefined' && process?.env?.CLOUDINARY_CLOUD_NAME) ||
  'dokyhfvyd';

const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME,
  },
});

/**
 * A powerful, reusable Cloudinary image component.
 * @param {string} publicId - The public ID of the image from Cloudinary.
 * @param {string} alt - The alt text for the image.
 * @param {number} [width] - The desired width for a fill transformation.
 * @param {number} [height] - The desired height for a fill transformation.
 * @param {string} [className] - Optional CSS classes to apply to the image.
 */
import { useState, useEffect, useRef } from 'react';

const CloudinaryImage = ({ publicId, alt, width, height, className, disableLazy = false }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
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

  // Build a small blurred placeholder URL (low-res but not tiny so it looks better on slow networks)
  const phW = 80; // small preview width
  const phH = Math.max(20, Math.round((height || 80) * (phW / (width || 80))));
  const placeholderImg = cld.image(publicId).resize(fill(phW, phH)).quality(20).format(formatAuto());
  const placeholderUrl = placeholderImg.toURL();

  // Apply standard optimizations and transformations using the correctly imported functions
  myImage
    .quality(qualityAuto()) // Use the .quality() method for q_auto
    .format(formatAuto()); // Use the .format() method for f_auto

  // If width and height are provided, apply a fill transformation with auto-gravity
  if (width && height) {
    myImage.resize(fill(width, height).gravity(autoGravity()));
  }

  // use effect to attach a load handler to the AdvancedImage internal <img>
  useEffect(() => {
    let mounted = true;
    let el = null;
    let pollTimer = null;
    let onLoad = null;

    // Safety fallback: if the high-res image doesn't load within this time, show it anyway
    const fallbackTimeout = setTimeout(() => {
      if (mounted) setLoaded(true);
    }, 2500);

    const attachListener = () => {
      el = imgRef.current && imgRef.current.querySelector('img');
      if (!el) {
        // try again briefly
        pollTimer = setTimeout(attachListener, 200);
        return;
      }

      onLoad = () => {
        if (!mounted) return;
        clearTimeout(fallbackTimeout);
        setLoaded(true);
      };

      el.addEventListener('load', onLoad);
      // If the image is already cached/complete, trigger immediately
      if (el.complete) onLoad();
    };

    attachListener();

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      if (pollTimer) clearTimeout(pollTimer);
      if (el && onLoad) el.removeEventListener('load', onLoad);
    };
  }, [publicId]);

  return (
    <div
      ref={imgRef}
      className={`${className} relative overflow-hidden`}
      style={{ backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <AdvancedImage
        cldImg={myImage}
        alt={alt}
        className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        plugins={disableLazy ? [responsive({ steps: [800, 1000, 1400] })] : [responsive({ steps: [800, 1000, 1400] }), lazyload()]}
      />
    </div>
  );
};

export default CloudinaryImage;
