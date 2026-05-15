import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SITE_URL } from '../config/siteMetadata'

const formatDate = (value) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  } catch {
    return ''
  }
}

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesTotal, setCategoriesTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const selectedCategory = searchParams.get('category') || ''

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError('')
      const postParams = new URLSearchParams({ limit: '50' })
      if (selectedCategory) postParams.set('category', selectedCategory)

      try {
        const [postsResult, categoriesResult] = await Promise.allSettled([
          fetch(`/api/v1/posts?${postParams.toString()}`),
          fetch('/api/v1/categories'),
        ])

        if (postsResult.status !== 'fulfilled') throw postsResult.reason

        const postsPayload = await postsResult.value.json().catch(() => ({}))
        if (!postsResult.value.ok || postsPayload?.ok === false) {
          throw new Error(postsPayload?.error || 'Failed to load Local Report')
        }

        if (mounted) {
          setPosts(Array.isArray(postsPayload?.posts) ? postsPayload.posts : [])
          setCategoriesTotal(Number(postsPayload?.count) || 0)
        }

        if (categoriesResult.status === 'fulfilled') {
          const categoriesPayload = await categoriesResult.value.json().catch(() => ({}))
          if (categoriesResult.value.ok && categoriesPayload?.ok !== false && mounted) {
            setCategories(Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : [])
            setCategoriesTotal(Number(categoriesPayload?.totalPosts) || Number(postsPayload?.count) || 0)
          }
        } else if (mounted) {
          setCategories([])
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load Local Report')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [selectedCategory])

  const handleCategoryChange = (slug) => {
    const next = new URLSearchParams(searchParams)
    if (slug) next.set('category', slug)
    else next.delete('category')
    setSearchParams(next, { replace: true })
  }

  const [lead, ...rest] = posts

  return (
    <div className="blog-page fullpage-demo-scope">
      <Helmet>
        <title>Local Report | Local Effort</title>
        <meta name="description" content="Dispatches, stories, and kitchen notes from Local Effort Cooperative" />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <link rel="alternate" type="application/rss+xml" title="Local Report RSS" href="/api/feeds/blog.rss" />
        <link rel="alternate" type="application/atom+xml" title="Local Report Atom" href="/api/feeds/blog.atom" />
        <link rel="alternate" type="application/feed+json" title="Local Report JSON Feed" href="/api/feeds/blog.json" />
        <link rel="alternate" type="application/activity+json" title="Local Report ActivityPub Actor" href="/api/activitypub/actor" />
      </Helmet>

      <div className="blog-shell">
        {/* Masthead */}
        <motion.div
          className="blog-masthead"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          <p className="blog-masthead-kicker">Local Report</p>
          <h1 className="blog-masthead-headline">The whole story.</h1>
          <p className="blog-masthead-deck">The longer explanations and the stories that connect.</p>
        </motion.div>

        {/* Category filter bar */}
        <div className="blog-filter-bar">
          <button
            type="button"
            className={`blog-filter-pill ${!selectedCategory ? 'is-active' : ''}`}
            onClick={() => handleCategoryChange('')}
          >
            <span>All</span>
            <span className="blog-filter-count">{categoriesTotal || posts.length}</span>
          </button>

          {categories.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              className={`blog-filter-pill ${selectedCategory === entry.slug ? 'is-active' : ''}`}
              onClick={() => handleCategoryChange(entry.slug)}
            >
              <span>{entry.category}</span>
              <span className="blog-filter-count">{entry.postCount}</span>
            </button>
          ))}

          <span className="blog-feed-links">
            <a href="/api/feeds/blog.rss">RSS</a>
            <span aria-hidden="true">·</span>
            <a href="/api/feeds/blog.atom">Atom</a>
          </span>
        </div>

        {/* States */}
        {error && <div className="blog-state is-error">{error}</div>}
        {loading && !error && <div className="blog-state">Loading Local Report…</div>}

        {/* Lead card — first post */}
        {!loading && !error && lead && (
          <motion.div
            className="blog-lead-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="blog-lead-image">
              {(lead.mainImageUrl || lead.ogImageUrl) ? (
                <img
                  src={lead.mainImageUrl || lead.ogImageUrl}
                  alt={lead.mainImageAlt || lead.ogImageAlt || lead.title || ''}
                  loading="eager"
                />
              ) : (
                <div className="blog-lead-image-placeholder">
                  <span>Local Report</span>
                </div>
              )}
            </div>

            <div className="blog-lead-body">
              <div className="blog-lead-meta">
                {lead.category && <span className="blog-chip is-category">{lead.category}</span>}
                {lead.publishedAt && <span className="blog-meta-text">{formatDate(lead.publishedAt)}</span>}
                {lead.readingTimeMinutes ? <span className="blog-meta-text">{lead.readingTimeMinutes} min</span> : null}
              </div>

              <h2 className="blog-lead-title">
                <Link to={`/blog/${lead.slug}`}>{lead.title}</Link>
              </h2>

              {lead.excerpt && <p className="blog-lead-excerpt">{lead.excerpt}</p>}

              <Link to={`/blog/${lead.slug}`} className="blog-lead-cta">
                Read the full piece →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Remaining posts */}
        {!loading && !error && rest.length > 0 && (
          <div className="blog-post-list">
            {rest.map((post, index) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24), ease: 'easeOut' }}
              >
                <Link to={`/blog/${post.slug}`} className="blog-post-row">
                  <div className="blog-row-thumb">
                    {(post.mainImageUrl || post.ogImageUrl) ? (
                      <img
                        src={post.mainImageUrl || post.ogImageUrl}
                        alt={post.mainImageAlt || post.ogImageAlt || post.title || ''}
                        loading="lazy"
                      />
                    ) : (
                      <div className="blog-row-thumb-empty" />
                    )}
                  </div>

                  <div className="blog-row-body">
                    <div className="blog-row-meta">
                      {post.category && <span className="blog-chip is-category">{post.category}</span>}
                      {post.publishedAt && <span className="blog-meta-text">{formatDate(post.publishedAt)}</span>}
                      {post.readingTimeMinutes ? <span className="blog-meta-text">{post.readingTimeMinutes} min</span> : null}
                    </div>
                    <h3 className="blog-row-title">{post.title}</h3>
                    {post.excerpt && <p className="blog-row-excerpt">{post.excerpt}</p>}
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}

        {!posts.length && !error && !loading && (
          <div className="blog-state">No posts in this category yet.</div>
        )}
      </div>
    </div>
  )
}

export default BlogList
