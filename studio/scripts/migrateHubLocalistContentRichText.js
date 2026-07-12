import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

function toPortableText(value, fieldName) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return undefined

  return value
    .split(/\n\s*\n/)
    .map((text, index) => ({
      _key: `${fieldName}-${index}`,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_key: `${fieldName}-${index}-span`, _type: 'span', marks: [], text: text.trim()}],
    }))
}

async function main() {
  const documents = await client.fetch(`*[_type == "hubLocalistContent"]{
    _id, eyebrow, headline, body, note, eyebrowRich, headlineRich, bodyRich, noteRich
  }`)

  for (const document of documents) {
    const fields = {
      eyebrowRich: document.eyebrowRich || toPortableText(document.eyebrow, 'eyebrow'),
      headlineRich: document.headlineRich || toPortableText(document.headline, 'headline'),
      bodyRich: document.bodyRich || toPortableText(document.body, 'body'),
      noteRich: document.noteRich || toPortableText(document.note, 'note'),
    }
    const values = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
    if (Object.keys(values).length) await client.patch(document._id).set(values).commit()
    console.log(`Migrated ${document._id}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
