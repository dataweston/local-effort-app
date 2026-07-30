import React, {useCallback, useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'

const STORE_PAGES = [
  {title: 'Main Store', path: '/sale', value: 'sale'},
  {title: 'Chez Garage', path: '/chez-garage', value: 'chez-garage'},
  {title: 'Happy Monday', path: '/happy-monday', value: 'happy-monday'},
  {title: 'Tiny Diner', path: '/tiny-diner', value: 'tiny-diner'},
]

const productQuery = `*[_type == "product"]{
  _id,
  _rev,
  title,
  active,
  stores,
  inventoryMode,
  manualQty,
  allowsDelivery,
  requiresDateSelection
} | order(lower(title) asc)`

const baseId = (id) => id.replace(/^drafts\./, '')

function normalizeProducts(documents) {
  const byId = new Map()
  for (const document of documents || []) {
    const id = baseId(document._id)
    const existing = byId.get(id) || {id, documentIds: []}
    existing.documentIds.push(document._id)
    if (!existing.document || document._id.startsWith('drafts.')) {
      existing.document = document
    }
    byId.set(id, existing)
  }
  return [...byId.values()].map(({id, documentIds, document}) => ({
    id,
    documentIds,
    title: document.title || 'Untitled product',
    active: document.active !== false,
    stores: Array.isArray(document.stores) ? document.stores : [],
    inventoryMode: document.inventoryMode || 'unmanaged',
    manualQty: typeof document.manualQty === 'number' ? document.manualQty : null,
    allowsDelivery: document.allowsDelivery !== false,
    requiresDateSelection: document.requiresDateSelection === true,
  }))
}

const styles = {
  page: {
    padding: 24,
    maxWidth: 1500,
    margin: '0 auto',
    color: 'var(--card-fg-color)',
  },
  toolbar: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    padding: '12px 0',
    background: 'var(--card-bg-color)',
  },
  button: {
    border: '1px solid var(--card-border-color)',
    borderRadius: 6,
    padding: '7px 10px',
    background: 'var(--card-bg-color)',
    color: 'inherit',
    cursor: 'pointer',
  },
  primaryButton: {
    border: 0,
    borderRadius: 6,
    padding: '7px 10px',
    background: '#2276fc',
    color: '#fff',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'var(--card-bg-color)',
  },
  cell: {
    borderTop: '1px solid var(--card-border-color)',
    padding: '10px 8px',
    verticalAlign: 'middle',
  },
  muted: {fontSize: 12, opacity: 0.7},
}

export default function ProductManager() {
  const client = useClient({apiVersion: '2025-02-19'})
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [quantityEdits, setQuantityEdits] = useState({})
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    setMessage('')
    try {
      setProducts(
        normalizeProducts(await client.fetch(productQuery, {}, {perspective: 'raw'})),
      )
    } catch (error) {
      setMessage(error?.message || 'Products could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [client])

  useEffect(() => {
    load()
  }, [load])

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? products.filter((product) => product.title.toLowerCase().includes(term)) : products
  }, [products, search])

  const patchProducts = useCallback(
    async (targets, makePatch, successMessage) => {
      if (!targets.length) return
      setBusy(true)
      setMessage('')
      try {
        const transaction = client.transaction()
        for (const product of targets) {
          const patch = makePatch(product)
          for (const documentId of product.documentIds) {
            transaction.patch(documentId, (builder) => builder.set(patch))
          }
        }
        await transaction.commit()
        setProducts((current) =>
          current.map((product) => {
            const target = targets.find((entry) => entry.id === product.id)
            return target ? {...product, ...makePatch(product)} : product
          }),
        )
        setMessage(successMessage)
      } catch (error) {
        setMessage(error?.message || 'The product update failed.')
      } finally {
        setBusy(false)
      }
    },
    [client],
  )

  const selectedProducts = products.filter((product) => selected.has(product.id))

  const setActive = (targets, active) =>
    patchProducts(targets, () => ({active}), `${targets.length} product${targets.length === 1 ? '' : 's'} marked ${active ? 'active' : 'inactive'}.`)

  const changeStore = (targets, store, assigned) =>
    patchProducts(
      targets,
      (product) => ({
        stores: assigned
          ? [...new Set([...product.stores, store])]
          : product.stores.filter((value) => value !== store),
      }),
      `${assigned ? 'Added' : 'Removed'} ${targets.length} product${targets.length === 1 ? '' : 's'} ${assigned ? 'to' : 'from'} ${STORE_PAGES.find((page) => page.value === store)?.title}.`,
    )

  const saveQuantity = (product) => {
    const raw = quantityEdits[product.id]
    const manualQty = Math.max(0, Math.floor(Number(raw)))
    if (!Number.isFinite(manualQty)) {
      setMessage('Quantity must be a whole number of zero or more.')
      return
    }
    patchProducts(
      [product],
      () => ({manualQty}),
      `Inventory for ${product.title} set to ${manualQty}.`,
    )
    setQuantityEdits((current) => {
      const next = {...current}
      delete next[product.id]
      return next
    })
  }

  const allVisibleSelected =
    visibleProducts.length > 0 && visibleProducts.every((product) => selected.has(product.id))

  return (
    <main style={styles.page}>
      <h1 style={{margin: 0}}>Product manager</h1>
      <p style={{marginTop: 6, opacity: 0.75}}>
        Change availability and storefront placement without opening each product. Changes are live
        immediately; products may be active while assigned to no pages.
      </p>

      <div style={styles.toolbar}>
        <input
          aria-label="Search products"
          placeholder="Search products"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{...styles.button, minWidth: 220, cursor: 'text'}}
        />
        <button type="button" style={styles.button} onClick={load} disabled={busy}>
          Refresh
        </button>
        <span style={styles.muted}>{selected.size} selected</span>
        <button type="button" style={styles.primaryButton} onClick={() => setActive(selectedProducts, true)} disabled={busy || !selected.size}>
          Make active
        </button>
        <button type="button" style={styles.button} onClick={() => setActive(selectedProducts, false)} disabled={busy || !selected.size}>
          Make inactive
        </button>
        {STORE_PAGES.map((page) => (
          <span key={page.value} style={{display: 'inline-flex', gap: 4}}>
            <button type="button" title={`Add selected to ${page.path}`} style={styles.button} onClick={() => changeStore(selectedProducts, page.value, true)} disabled={busy || !selected.size}>
              + {page.title}
            </button>
            <button type="button" title={`Remove selected from ${page.path}`} aria-label={`Remove selected from ${page.title}`} style={styles.button} onClick={() => changeStore(selectedProducts, page.value, false)} disabled={busy || !selected.size}>
              −
            </button>
          </span>
        ))}
      </div>

      {message ? <p role="status" style={{padding: 10, background: 'var(--card-muted-bg-color)', borderRadius: 6}}>{message}</p> : null}

      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.cell}>
                <input
                  type="checkbox"
                  aria-label="Select all visible products"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Set(current)
                      visibleProducts.forEach((product) =>
                        allVisibleSelected ? next.delete(product.id) : next.add(product.id),
                      )
                      return next
                    })
                  }
                />
              </th>
              <th style={{...styles.cell, textAlign: 'left'}}>Product</th>
              <th style={{...styles.cell, textAlign: 'left'}}>Status</th>
              {STORE_PAGES.map((page) => <th key={page.value} style={styles.cell} title={page.path}>{page.title}</th>)}
              <th style={styles.cell}>Pickup only</th>
              <th style={styles.cell}>Calendar</th>
              <th style={{...styles.cell, textAlign: 'left'}}>Manual inventory</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => (
              <tr key={product.id}>
                <td style={styles.cell}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${product.title}`}
                    checked={selected.has(product.id)}
                    onChange={() =>
                      setSelected((current) => {
                        const next = new Set(current)
                        next.has(product.id) ? next.delete(product.id) : next.add(product.id)
                        return next
                      })
                    }
                  />
                </td>
                <td style={styles.cell}>
                  <a href={`/intent/edit/id=${product.id};type=product`} style={{color: 'inherit', fontWeight: 600}}>
                    {product.title}
                  </a>
                  {!product.stores.length ? <div style={styles.muted}>Not on a store page</div> : null}
                </td>
                <td style={styles.cell}>
                  <button
                    type="button"
                    style={product.active ? styles.primaryButton : styles.button}
                    disabled={busy}
                    onClick={() => setActive([product], !product.active)}
                  >
                    {product.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                {STORE_PAGES.map((page) => (
                  <td key={page.value} style={{...styles.cell, textAlign: 'center'}}>
                    <input
                      type="checkbox"
                      aria-label={`${product.title} on ${page.title}`}
                      checked={product.stores.includes(page.value)}
                      disabled={busy}
                      onChange={(event) => changeStore([product], page.value, event.currentTarget.checked)}
                    />
                  </td>
                ))}
                <td style={{...styles.cell, textAlign: 'center'}}>
                  <input
                    type="checkbox"
                    aria-label={`${product.title} is pickup only`}
                    checked={!product.allowsDelivery}
                    disabled={busy}
                    onChange={(event) => {
                      const pickupOnly = event.currentTarget.checked
                      patchProducts(
                        [product],
                        () => ({allowsDelivery: !pickupOnly}),
                        `${product.title} is now ${pickupOnly ? 'pickup only' : 'eligible for delivery'}.`,
                      )
                    }}
                  />
                </td>
                <td style={{...styles.cell, textAlign: 'center'}}>
                  <input
                    type="checkbox"
                    aria-label={`${product.title} requires calendar selection`}
                    checked={product.requiresDateSelection}
                    disabled={busy}
                    onChange={(event) => {
                      const requiresDateSelection = event.currentTarget.checked
                      patchProducts(
                        [product],
                        () => ({requiresDateSelection}),
                        `${product.title} ${requiresDateSelection ? 'now requires' : 'no longer requires'} a customer date selection.`,
                      )
                    }}
                  />
                </td>
                <td style={styles.cell}>
                  {product.inventoryMode === 'manual' ? (
                    <span style={{display: 'inline-flex', gap: 5}}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label={`Inventory for ${product.title}`}
                        value={quantityEdits[product.id] ?? product.manualQty ?? 0}
                        onChange={(event) =>
                          setQuantityEdits((current) => ({...current, [product.id]: event.currentTarget.value}))
                        }
                        style={{...styles.button, width: 72, cursor: 'text'}}
                      />
                      {Object.hasOwn(quantityEdits, product.id) ? (
                        <button type="button" style={styles.button} disabled={busy} onClick={() => saveQuantity(product)}>
                          Save
                        </button>
                      ) : null}
                    </span>
                  ) : (
                    <span style={styles.muted}>{product.inventoryMode === 'square' ? 'Square managed' : 'Unlimited'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!busy && !visibleProducts.length ? <p>No products found.</p> : null}
      {busy ? <p style={styles.muted}>Updating…</p> : null}
    </main>
  )
}
