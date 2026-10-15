// Shared by Studio, the published-data generator, seed import and browser refresh.
// Validate complete documents: never merge a partial refresh over required disclosures.
export const REQUIRED_TEXT = ['title', 'metaTitle', 'metaDescription', 'signupFeeNotice', 'benefitsHeading'];
export const REQUIRED_RICH = ['introduction', 'proposalNotice', 'independenceNotice', 'localistDistinction'];
export const REQUIRED_SECTIONS = {
  dues: { text: ['heading', 'amountLabel', 'proposalLabel', 'undecidedHeading'], rich: ['rationale', 'collectionNotice'], lists: ['undecidedTerms'] },
  equity: { text: ['heading', 'unresolvedHeading'], rich: ['body'], lists: ['unresolvedTerms'] },
  application: { text: ['heading', 'ctaLabel'], rich: ['body'] },
  privacy: { text: ['heading'], rich: ['body'] },
  contact: { text: ['heading', 'email', 'label'], rich: ['body'] },
};

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
export const hasRichText = (value) => Array.isArray(value) && value.some((block) => block?._type === 'block' && block.children?.some((child) => hasText(child.text)));

export function chefCooperativeContentErrors(page) {
  if (!page || page._id !== 'chef-cooperative-page' || page._type !== 'chefCooperativePage') return ['Expected published chef-cooperative-page singleton.'];
  const errors = [];
  const fields = (object, text, rich, lists = [], prefix = '') => {
    for (const name of text) if (!hasText(object?.[name])) errors.push(`${prefix}${name} requires text.`);
    for (const name of rich) if (!hasRichText(object?.[name])) errors.push(`${prefix}${name} requires rich text.`);
    for (const name of lists) if (!Array.isArray(object?.[name]) || !object[name].length || object[name].some((item) => !hasText(item))) errors.push(`${prefix}${name} requires nonempty text items.`);
  };
  fields(page, REQUIRED_TEXT, REQUIRED_RICH);
  for (const [name, spec] of Object.entries(REQUIRED_SECTIONS)) fields(page[name], spec.text, spec.rich, spec.lists, `${name}.`);
  if (!Number.isInteger(page.dues?.recommendedMonthlyAmountCents) || page.dues.recommendedMonthlyAmountCents <= 0) errors.push('dues.recommendedMonthlyAmountCents requires a positive integer.');
  for (const [name, entries] of [['benefits', page.benefits], ['application.nextSteps', page.application?.nextSteps]]) {
    const minimum = name === 'benefits' ? 5 : 3;
    if (!Array.isArray(entries) || entries.length < minimum) errors.push(`${name} requires at least ${minimum} complete entries.`);
    const keys = new Set();
    for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
      fields(entry, ['_key', 'heading'], ['body'], [], `${name}[${index}].`);
      if (keys.has(entry?._key)) errors.push(`${name} requires unique keys.`);
      keys.add(entry?._key);
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(page.contact?.email || '')) errors.push('contact.email requires an email address.');
  if (page.heroImage && (page.heroImage.url || page.heroImage.asset)) {
    if (!hasText(page.heroImage.alt)) errors.push('heroImage.alt is required for an image.');
    if (page.heroImage.url && !/^https:\/\//.test(page.heroImage.url)) errors.push('heroImage.url must use HTTPS.');
  }
  return errors;
}

export function assertChefCooperativeContent(page) {
  const errors = chefCooperativeContentErrors(page);
  if (errors.length) throw new Error(`Invalid chef cooperative content: ${errors.join(' ')}`);
  return page;
}
