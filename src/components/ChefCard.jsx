import React from 'react';
import AspectRatio from './AspectRatio';

export default function ChefCard({ name, bio, imageSrc, imageAlt, className = '', textClass = 'prose-lite max-w-none' }) {
  return (
    <figure className={['card', className].filter(Boolean).join(' ')}>
      <AspectRatio ratio={4 / 3} className="rounded-md ring-1 ring-neutral-200 bg-neutral-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt || name}
            loading="lazy"
            width={1200}
            height={900}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-100" aria-hidden="true" />
        )}
      </AspectRatio>
      <figcaption>
        <h3 className="mt-4 text-xl font-semibold">{name}</h3>
        <p className={["mt-2 text-neutral-800", textClass].filter(Boolean).join(' ')}>{bio}</p>
      </figcaption>
    </figure>
  );
}
