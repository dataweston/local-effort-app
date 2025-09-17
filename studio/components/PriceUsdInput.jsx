import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {set, unset} from 'sanity'

export function PriceUsdInput(props) {
  const {value, onChange, schemaType, readOnly} = props

  const toDisplay = (v) => (typeof v === 'number' ? (v / 100).toFixed(2) : '')
  const [display, setDisplay] = useState(toDisplay(value))

  useEffect(() => {
    setDisplay(toDisplay(value))
  }, [value])

  const handleChange = (e) => {
    const raw = e.target.value
    setDisplay(raw)
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (cleaned === '') {
      onChange(unset())
      return
    }
    const num = Number.parseFloat(cleaned)
    if (Number.isNaN(num)) {
      return
    }
    const cents = Math.round(num * 100)
    onChange(set(cents))
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
  <span style={{fontFamily: 'system-ui, sans-serif'}}>$</span>
      <input
        type="text"
        inputMode="decimal"
        step="0.01"
        value={display}
        onChange={handleChange}
  placeholder="0.00"
        disabled={readOnly}
        style={{
          flex: 1,
          padding: '8px 10px',
          border: '1px solid #ddd',
          borderRadius: 4,
        }}
        aria-label={schemaType?.title || 'Price'}
      />
  <span style={{fontSize: 12, color: '#666'}}>USD</span>
    </div>
  )
}

export default PriceUsdInput

PriceUsdInput.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  schemaType: PropTypes.object,
  readOnly: PropTypes.bool,
}
