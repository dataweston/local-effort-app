import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { PortableText } from '@portabletext/react';
import sanityClient from '../sanityClient';
import imageUrlBuilder from '@sanity/image-url';

const builder = imageUrlBuilder(sanityClient);
const urlFor = (source) => builder.image(source);

const components = {
  types: {
    image: ({ value }) => {
      const src = value?.asset?._ref ? urlFor(value).width(1200).quality(80).url() : '';
      if (!src) return null;
      const alt = value?.alt || '';
      return <img src={src} alt={alt} className="rounded-md my-4" loading="lazy" />;
    },
  },
};

const WeeklyPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const q = `*[_type == "blogPost" && slug.current == $slug][0]{ title, publishedAt, body, mainImage }`;
        const item = await sanityClient.fetch(q, { slug });
        if (mounted) setPost(item || null);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load post');
      }
    })();
    return () => { mounted = false };
  }, [slug]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10 text-red-700">{error}</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8 py-10">
      <Helmet>
        <title>{post?.title ? `${post.title} | Weekly Meal Prep Journal` : 'Weekly Meal Prep Journal'} | Local Effort</title>
      </Helmet>
      <Link to="/weekly" className="text-sm underline">← Back to Weekly Meal Prep Journal</Link>
      <h1 className="text-4xl font-bold mt-2">{post.title}</h1>
      <div className="text-sm text-gray-500 mt-1">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}</div>
      {post.mainImage?.asset && (
        <div className="mt-4">
          <img src={urlFor(post.mainImage).width(1400).quality(80).url()} alt={post.mainImage.alt || ''} className="rounded-md" />
        </div>
      )}
      <article className="prose max-w-none mt-6">
        <PortableText value={post.body} components={components} />
      </article>
    </div>
  );
};

export default WeeklyPost;
