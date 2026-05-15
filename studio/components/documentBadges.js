// Document badges surface missing-field warnings directly in the sidebar.

const MissingImageBadge = {
  label: 'No Image',
  title: 'Missing hero / main image',
  color: 'warning',
}

const MissingSlugBadge = {
  label: 'No Slug',
  title: 'Slug is required for publishing',
  color: 'danger',
}

const MissingPublishDateBadge = {
  label: 'No Date',
  title: 'publishedAt is not set',
  color: 'caution',
}

const InactiveBadge = {
  label: 'Inactive',
  title: 'Product is marked inactive',
  color: 'warning',
}

const ArchivedBadge = {
  label: 'Archived',
  title: 'This release is archived',
  color: 'caution',
}

function makeBadge(spec) {
  return (props) => {
    const doc = props.published || props.draft
    if (!doc) return null
    const show = spec.check(doc)
    if (!show) return null
    return {label: spec.label, title: spec.title, color: spec.color}
  }
}

export const blogPostBadges = [
  makeBadge({...MissingImageBadge, check: (doc) => !doc.mainImage}),
  makeBadge({...MissingSlugBadge, check: (doc) => !doc.slug?.current}),
  makeBadge({...MissingPublishDateBadge, check: (doc) => !doc.publishedAt}),
]

export const releaseBadges = [
  makeBadge({...MissingImageBadge, check: (doc) => !doc.heroImage}),
  makeBadge({...MissingSlugBadge, check: (doc) => !doc.slug?.current}),
  makeBadge({...ArchivedBadge, check: (doc) => !!doc.isArchived}),
]

export const productBadges = [
  makeBadge({...MissingImageBadge, check: (doc) => !doc.images?.length}),
  makeBadge({...InactiveBadge, check: (doc) => doc.active === false}),
]
