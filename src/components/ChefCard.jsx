import React from 'react';
import AspectRatio from './AspectRatio';

export default function ChefCard({ name, bio, imageSrc, imageAlt, className = '', textClass = 'prose-lite max-w-none' }) {
  const fallbackSrc = '/gallery/catherine.jpg';
  const src = imageSrc || fallbackSrc;
  return (
    <figure
      className={[
        'card',
        'p-5 md:p-6',
        'ring-1 ring-neutral-200',
        'bg-white',
        'transition-transform duration-200 ease-out hover:scale-[1.01] hover:shadow-md',
        className,
      ].filter(Boolean).join(' ')}
    >
      <AspectRatio ratio={4 / 3} className="rounded-xl overflow-hidden bg-neutral-100">
        <img
          src={src}
          alt={imageAlt || name}
          loading="lazy"
          width={1200}
          height={900}
          className="absolute inset-0 h-full w-full object-contain bg-neutral-100"
          onError={(e) => { if (e.currentTarget.src.indexOf(fallbackSrc) === -1) e.currentTarget.src = fallbackSrc; }}
        />
      </AspectRatio>
      <figcaption className="mt-4">
        <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
        <p className={["mt-2 text-neutral-700", textClass].filter(Boolean).join(' ')}>{bio}</p>
      </figcaption>
    </figure>
  );
}
