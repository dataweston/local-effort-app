import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { PortableText } from '@portabletext/react'
import { motion } from 'framer-motion'
import { portableTextComponents } from '../utils/portableTextComponents'
import { SITE_URL } from '../config/siteMetadata'

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(value))
  } catch {
    return ''
  }
}

const ErrorState = ({ children }) => (
  <div className="blog-page fullpage-demo-scope">
    <div className="blog-post-shell">
      <Link to="/blog" className="blog-post-back">← Local Report</Link>
      <div className="blog-state is-error">{children}</div>
    </div>
  </div>
)

const BlogPost = () => {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [statusCode, setStatusCode] = useState(0)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const response = await fetch(`/api/v1/posts/${encodeURIComponent(slug || '')}?include=full`)
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.ok === false) {
          if (mounted) { setStatusCode(response.status || 500); setError(payload?.error || 'Failed to load post') }
          return
        }
        if (mounted) { setPost(payload?.post || null); setStatusCode(200) }
      } catch (err) {
        if (mounted) { setStatusCode(500); setError(err?.message || 'Failed to load post') }
      }
    })()
    return () => { mounted = false }
  }, [slug])

  if (error && statusCode === 404) return <ErrorState>Post not found.</ErrorState>
  if (error && statusCode === 403) return <ErrorState>This post is for members only.</ErrorState>
  if (error) return <ErrorState>{error}</ErrorState>

  if (!post) {
    return (
      <div className="blog-page fullpage-demo-scope">
        <div className="blog-post-shell">
          <div className="blog-state">Loading…</div>
        </div>
      </div>
    )
  }

  const canonicalUrl = post.canonicalUrl || `${SITE_URL}/blog/${slug}`
  const pageTitle = post.metaTitle || (post.title ? `${post.title} | Local Report | Local Effort` : 'Local Report | Local Effort')
  const description = post.metaDescription || post.excerpt || ''
  const ogImage = post.ogImageUrl || ''
  const heroSrc = post.mainImageUrl || post.ogImageUrl || ''
  const heroAlt = post.mainImageAlt || post.ogImageAlt || post.title || ''

  return (
    <div className="blog-page fullpage-demo-scope">
      <Helmet>
        <title>{pageTitle}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.metaTitle || post.title || 'Local Report'} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <link rel="canonical" href={canonicalUrl} />
        {post.slug && (
          <link rel="alternate" type="application/activity+json" href={`/api/activitypub/objects/${encodeURIComponent(post.slug)}`} />
        )}
      </Helmet>

      <div className="blog-post-shell">
        <Link to="/blog" className="blog-post-back">← Local Report</Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {/* Header */}
          <header className="blog-post-header">
            <div className="blog-post-header-meta">
              {post.category && <span className="blog-chip is-category">{post.category}</span>}
              {(post.tags || []).slice(0, 3).map((tag) => (
                <span key={tag} className="blog-chip">{tag}</span>
              ))}
            </div>

            <h1 className="blog-post-title">{post.title}</h1>

            {post.excerpt && <p className="blog-post-excerpt">{post.excerpt}</p>}

            <div className="blog-post-byline">
              {(post.authors || []).length > 0 && (
                <div className="blog-post-byline-item">
                  <span className="blog-post-byline-label">By</span>
                  <span className="blog-post-byline-value">{post.authors.map((a) => a.name).join(', ')}</span>
                </div>
              )}
              {post.publishedAt && (
                <div className="blog-post-byline-item">
                  <span className="blog-post-byline-label">Published</span>
                  <span className="blog-post-byline-value">{formatDate(post.publishedAt)}</span>
                </div>
              )}
              {post.readingTimeMinutes && (
                <div className="blog-post-byline-item">
                  <span className="blog-post-byline-label">Read time</span>
                  <span className="blog-post-byline-value">{post.readingTimeMinutes} min</span>
                </div>
              )}
            </div>
          </header>

          {/* Hero image */}
          {heroSrc && (
            <div className="blog-post-hero">
              <img src={heroSrc} alt={heroAlt} loading="eager" />
            </div>
          )}

          {/* Body */}
          <div className="blog-post-prose prose prose-lg">
            {Array.isArray(post.body) && post.body.length > 0
              ? <PortableText value={post.body} components={portableTextComponents} />
              : <div dangerouslySetInnerHTML={{ __html: post?.html || '' }} />}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default BlogPost
