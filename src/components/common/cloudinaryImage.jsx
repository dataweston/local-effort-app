// src/components/CloudinaryImage.jsx
import React from 'react';
import { AdvancedImage, responsive, lazyload } from '@cloudinary/react';
import { Cloudinary } from '@cloudinary/url-gen';

// --- CORRECTED IMPORTS ---
// Each function/action must be imported from its specific file path within the library.
import { fill, fit, pad } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
// The 'auto' helpers for quality and format are 'qualifiers', not 'actions'.
import { auto as qualityAuto } from '@cloudinary/url-gen/qualifiers/quality';
import { auto as formatAuto } from '@cloudinary/url-gen/qualifiers/format';
import { dpr } from '@cloudinary/url-gen/actions/delivery';

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

const CloudinaryImage = ({ publicId, alt, width, height, className, containerClassName, imgClassName, containerStyle, disableLazy = false, fallbackSrc, resizeMode = 'fill', placeholderMode = 'blur', sizes, responsiveSteps = [480, 768, 1024, 1400], eager = false }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
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
  .format(formatAuto())  // Use the .format() method for f_auto
  .delivery(dpr('auto')); // Sharper images on high-DPI screens

  // If width and height are provided, apply a fill transformation with auto-gravity
  if (width && height) {
    if (resizeMode === 'fit') {
      myImage.resize(fit(width, height));
    } else if (resizeMode === 'pad') {
      myImage.resize(pad(width, height));
    } else {
      myImage.resize(fill(width, height).gravity(autoGravity()));
    }
  }

  // use effect to attach a load handler to the AdvancedImage internal <img>
  useEffect(() => {
    let mounted = true;
    let el = null;
    let pollTimer = null;
    let onLoad = null;
    let onError = null;

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
      onError = () => {
        if (!mounted) return;
        setError(true);
        if (typeof window !== 'undefined') {
          console.warn('[CloudinaryImage] failed to load', { cloudName: CLOUD_NAME, publicId });
        }
      };

      el.addEventListener('load', onLoad);
      el.addEventListener('error', onError);
      // If the image is already cached/complete, trigger immediately
      if (el.complete) onLoad();
    };

    attachListener();

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      if (pollTimer) clearTimeout(pollTimer);
      if (el && onLoad) el.removeEventListener('load', onLoad);
      if (el && onError) el.removeEventListener('error', onError);
    };
  }, [publicId]);

  if (error && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  const baseStyle = placeholderMode === 'blur'
    ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: placeholderMode === 'solid' ? 'transparent' : '#f3f4f6' };

  // Compute image style based on resize mode; ensure it fills the container without distortion
  const imgStyle = (() => {
    const s = { };
    if (width && height) {
      s.width = '100%';
      s.height = '100%';
    }
    if (resizeMode === 'fit' || resizeMode === 'pad') {
      s.objectFit = 'contain';
    } else {
      s.objectFit = 'cover';
    }
    return s;
  })();

  return (
    <div
      ref={imgRef}
      className={`${containerClassName || className || ''} relative overflow-hidden w-full`}
      style={{ ...baseStyle, ...(containerStyle || {}) }}
    >
      <AdvancedImage
        cldImg={myImage}
        alt={alt}
        className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName || ''}`}
        sizes={sizes}
        loading={eager ? 'eager' : 'lazy'}
        style={imgStyle}
        plugins={(() => {
          const base = [responsive({ steps: responsiveSteps })];
          const isLazy = !eager && !disableLazy;
          return isLazy ? [...base, lazyload()] : base;
        })()}
      />
    </div>
  );
};

export default CloudinaryImage;
