import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Box, Button, Card, Dialog, Flex, Grid, Spinner, Stack, Text, TextInput} from '@sanity/ui'
import {set, setIfMissing, unset} from 'sanity'
import cloudinary from '../../shared/cloudinary.json'

// Lists Cloudinary photos through the site's own search endpoint, so no
// Cloudinary credentials reach the browser. Searching matches Cloudinary tags;
// "pizza" is the default because that is how new pizza photos are tagged.
const SEARCH_URL = 'https://www.localeffortfood.com/api/search-images'
const PAGE_SIZE = 48

const deliveryUrl = (publicId, transform) =>
  `https://res.cloudinary.com/${cloudinary.cloudName}/image/upload/${transform}/${publicId}`
const thumbUrl = (publicId, size) => deliveryUrl(publicId, `c_fill,g_auto,w_${size},h_${size},f_auto,q_auto`)

// Cloudinary stores a description under context.custom or directly on context.
function suggestedAlt(image) {
  const context = image.context || {}
  const custom = context.custom || {}
  return String(custom.alt || context.alt || custom.caption || context.caption || '').trim()
}

function PhotoPicker({onClose, onPick}) {
  const [query, setQuery] = useState('pizza')
  const [images, setImages] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  const load = useCallback(async (text, nextCursor) => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({query: text.trim(), sort: 'recent', per_page: String(PAGE_SIZE)})
      if (nextCursor) params.set('next_cursor', nextCursor)
      const response = await fetch(`${SEARCH_URL}?${params}`)
      if (!response.ok) throw new Error(`Search failed (${response.status})`)
      const data = await response.json()
      if (id !== requestId.current) return
      if (data.unavailable) throw new Error('Cloudinary is not reachable right now. Try again in a minute.')
      setImages((current) => (nextCursor ? [...current, ...data.images] : data.images))
      setCursor(data.next_cursor || null)
    } catch (err) {
      if (id === requestId.current) setError(err.message || 'Could not load photos.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load('pizza', null)
  }, [load])

  return (
    <Dialog id="pizza-photo-picker" header="Choose a photo from Cloudinary" width={3} onClose={onClose} zOffset={1000}>
      <Box padding={4}>
        <Stack space={4}>
          <Flex gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                placeholder="Search Cloudinary tags, e.g. pizza"
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') load(query, null)
                }}
              />
            </Box>
            <Button text="Search" tone="primary" onClick={() => load(query, null)} disabled={loading} />
          </Flex>
          <Text size={1} muted>
            Newest first. Photos you add to Cloudinary with the “pizza” tag appear here; clear the box to see every photo.
          </Text>
          {error ? (
            <Card tone="critical" padding={3} radius={2}>
              <Text size={1}>{error}</Text>
            </Card>
          ) : null}
          <Grid columns={[2, 3, 4]} gap={3}>
            {images.map((image) => (
              <Card
                key={image.asset_id || image.public_id}
                as="button"
                type="button"
                padding={1}
                radius={2}
                border
                style={{cursor: 'pointer'}}
                onClick={() => onPick(image)}
                aria-label={`Use photo ${image.public_id}`}
              >
                <img
                  src={thumbUrl(image.public_id, 240)}
                  alt=""
                  loading="lazy"
                  style={{display: 'block', width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3}}
                />
              </Card>
            ))}
          </Grid>
          {loading ? (
            <Flex justify="center" padding={3}>
              <Spinner muted />
            </Flex>
          ) : null}
          {!loading && !error && images.length === 0 ? (
            <Text size={1} muted>No photos matched. Check the tag in Cloudinary or search for something else.</Text>
          ) : null}
          {cursor && !loading ? (
            <Flex justify="center">
              <Button text="Show more" mode="ghost" onClick={() => load(query, cursor)} />
            </Flex>
          ) : null}
        </Stack>
      </Box>
    </Dialog>
  )
}

export default function PizzaPhotoInput(props) {
  const {value, onChange, readOnly, renderDefault} = props
  const [open, setOpen] = useState(false)

  const pick = useCallback(
    (image) => {
      const alt = suggestedAlt(image)
      // A new photo must not keep the old photo's description.
      onChange([
        setIfMissing({_type: 'pizzaPhoto'}),
        set(image.public_id, ['publicId']),
        alt ? set(alt, ['alt']) : unset(['alt']),
      ])
      setOpen(false)
    },
    [onChange],
  )

  return (
    <Stack space={3}>
      {value?.publicId ? (
        <img
          src={deliveryUrl(value.publicId, 'c_limit,w_480,h_480,f_auto,q_auto')}
          alt={value.alt || ''}
          style={{display: 'block', maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 3}}
        />
      ) : null}
      <Flex>
        <Button
          text={value?.publicId ? 'Change photo' : 'Choose photo from Cloudinary'}
          tone="primary"
          mode={value?.publicId ? 'ghost' : 'default'}
          disabled={readOnly}
          onClick={() => setOpen(true)}
        />
      </Flex>
      {renderDefault(props)}
      {open ? <PhotoPicker onClose={() => setOpen(false)} onPick={pick} /> : null}
    </Stack>
  )
}
