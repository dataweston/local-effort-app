import React, {useMemo, useState} from 'react'
import PropTypes from 'prop-types'
import {useDocumentOperation} from 'sanity'
import {Box, Button, Flex, Stack, Text, TextArea, useToast} from '@sanity/ui'

const CLIPBOARD_TYPE = 'local-effort.releasePressKit'
const CLIPBOARD_VERSION = 1
const STORAGE_KEY = `${CLIPBOARD_TYPE}.v${CLIPBOARD_VERSION}`

const PRESS_KIT_FIELDS = [
  'mediaContact',
  'campaignHighlights',
  'pressFacts',
  'leadership',
  'pressAssets',
  'pressKitUrl',
  'storyAngles',
]

const TEXT_FIELD_MAP = {
  mediaContact: ['name', 'organization', 'email', 'website', 'location', 'instagram', 'tiktok'],
  pressFacts: ['label', 'value'],
  leadership: ['name', 'title', 'bio'],
  pressAssets: ['label', 'value', 'href'],
}

function makeKey() {
  return Math.random().toString(36).slice(2, 12)
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function compactObject(source, keys) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined

  const next = {}
  for (const key of keys) {
    const value = cleanText(source[key])
    if (value) next[key] = value
  }

  return Object.keys(next).length ? next : undefined
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return undefined

  const items = value.map(cleanText).filter(Boolean)
  return items.length ? items : undefined
}

function normalizeObjectArray(value, keys) {
  if (!Array.isArray(value)) return undefined

  const items = value
    .map((item) => compactObject(item, keys))
    .filter(Boolean)
    .map((item) => ({...item, _key: makeKey()}))

  return items.length ? items : undefined
}

function stripArrayKeys(value) {
  if (!Array.isArray(value)) return value
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item
    const {_key, ...rest} = item
    return rest
  })
}

function buildCopyPayload(documentValue) {
  const fields = {}

  for (const fieldName of PRESS_KIT_FIELDS) {
    const value = documentValue?.[fieldName]
    fields[fieldName] = typeof value === 'undefined' || value === null ? null : stripArrayKeys(value)
  }

  return {
    type: CLIPBOARD_TYPE,
    version: CLIPBOARD_VERSION,
    copiedAt: new Date().toISOString(),
    fields,
  }
}

function getPayloadFields(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Paste data must be a JSON object.')
  }

  if (parsed.type === CLIPBOARD_TYPE && parsed.fields) {
    return parsed.fields
  }

  return parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : parsed
}

function parsePayload(text) {
  const parsed = JSON.parse(text)
  const fields = getPayloadFields(parsed)

  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('Paste data does not include press kit fields.')
  }

  const knownFieldCount = PRESS_KIT_FIELDS.filter((fieldName) =>
    Object.prototype.hasOwnProperty.call(fields, fieldName),
  ).length

  if (!knownFieldCount) {
    throw new Error('Paste data does not include any recognized press kit fields.')
  }

  return fields
}

function normalizeFieldValue(fieldName, value) {
  switch (fieldName) {
    case 'mediaContact':
      return compactObject(value, TEXT_FIELD_MAP.mediaContact)
    case 'campaignHighlights':
    case 'storyAngles':
      return normalizeStringArray(value)
    case 'pressFacts':
      return normalizeObjectArray(value, TEXT_FIELD_MAP.pressFacts)
    case 'leadership':
      return normalizeObjectArray(value, TEXT_FIELD_MAP.leadership)
    case 'pressAssets':
      return normalizeObjectArray(value, TEXT_FIELD_MAP.pressAssets)
    case 'pressKitUrl': {
      const url = cleanText(value)
      return url || undefined
    }
    default:
      return undefined
  }
}

function buildPatches(fields) {
  const setPatch = {}
  const unsetPatch = []

  for (const fieldName of PRESS_KIT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(fields, fieldName)) continue

    const value = normalizeFieldValue(fieldName, fields[fieldName])
    if (typeof value === 'undefined') {
      unsetPatch.push(fieldName)
    } else {
      setPatch[fieldName] = value
    }
  }

  const patches = []
  if (Object.keys(setPatch).length) patches.push({set: setPatch})
  if (unsetPatch.length) patches.push({unset: unsetPatch})
  return patches
}

async function writeClipboardText(text) {
  storePayloadText(text)

  if (!globalThis.navigator?.clipboard?.writeText) {
    throw new Error('Browser clipboard writing is not available.')
  }

  await globalThis.navigator.clipboard.writeText(text)
}

async function readClipboardText() {
  if (!globalThis.navigator?.clipboard?.readText) {
    throw new Error('Browser clipboard reading is not available.')
  }

  return globalThis.navigator.clipboard.readText()
}

function readStoredPayloadText() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function storePayloadText(text) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, text)
  } catch {
    // Browser privacy settings can block localStorage; clipboard still works without it.
  }
}

function ManualCopyDialog({text, onClose}) {
  return (
    <Stack space={4}>
      <Text size={1}>
        Browser clipboard access was blocked. Select this JSON and copy it manually.
      </Text>
      <TextArea readOnly rows={14} value={text} onFocus={(event) => event.currentTarget.select()} />
      <Flex justify="flex-end">
        <Button text="Close" tone="primary" onClick={onClose} />
      </Flex>
    </Stack>
  )
}

ManualCopyDialog.propTypes = {
  text: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}

function ManualPasteDialog({initialText, initialError, onApply, onClose}) {
  const [text, setText] = useState(initialText)
  const [error, setError] = useState(initialError)

  const handleApply = () => {
    try {
      onApply(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not paste press kit details.')
    }
  }

  return (
    <Stack space={4}>
      <Text size={1}>Paste a press kit JSON payload, then apply it to this release.</Text>
      {error ? (
        <Box padding={3} style={{border: '1px solid #f4b4b4', borderRadius: 4}}>
          <Text size={1} tone="critical">
            {error}
          </Text>
        </Box>
      ) : null}
      <TextArea
        rows={14}
        value={text}
        onChange={(event) => {
          setText(event.currentTarget.value)
          setError('')
        }}
      />
      <Flex gap={2} justify="flex-end">
        <Button text="Cancel" mode="ghost" onClick={onClose} />
        <Button text="Apply press kit" tone="primary" onClick={handleApply} />
      </Flex>
    </Stack>
  )
}

ManualPasteDialog.propTypes = {
  initialText: PropTypes.string.isRequired,
  initialError: PropTypes.string,
  onApply: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

function getCurrentReleaseDocument(props) {
  return props.version || props.draft || props.published
}

export function ReleasePressKitCopyAction(props) {
  const toast = useToast()
  const documentValue = getCurrentReleaseDocument(props)
  const payloadText = useMemo(
    () => JSON.stringify(buildCopyPayload(documentValue), null, 2),
    [documentValue],
  )
  const [showManualCopy, setShowManualCopy] = useState(false)

  return {
    label: 'Copy press kit details',
    title: 'Copy the press kit fields for this release',
    disabled: !props.ready || !documentValue,
    onHandle: async () => {
      try {
        await writeClipboardText(payloadText)
        toast.push({status: 'success', title: 'Press kit details copied'})
      } catch {
        setShowManualCopy(true)
        toast.push({
          status: 'warning',
          title: 'Clipboard access was blocked',
          description: 'A manual copy dialog is open.',
        })
      }
    },
    dialog: showManualCopy
      ? {
          type: 'dialog',
          header: 'Copy press kit details',
          content: <ManualCopyDialog text={payloadText} onClose={() => setShowManualCopy(false)} />,
          onClose: () => setShowManualCopy(false),
          width: 'medium',
        }
      : null,
  }
}

ReleasePressKitCopyAction.action = 'copyPressKitDetails'
ReleasePressKitCopyAction.displayName = 'ReleasePressKitCopyAction'

export function ReleasePressKitPasteAction(props) {
  const toast = useToast()
  const {patch} = useDocumentOperation(props.id, props.type)
  const [manualPaste, setManualPaste] = useState(null)

  const applyText = (text) => {
    const fields = parsePayload(text)
    const patches = buildPatches(fields)

    if (!patches.length) {
      throw new Error('Paste data did not produce any field changes.')
    }

    patch.execute(patches, {_type: 'release'})
    storePayloadText(text)
    setManualPaste(null)
    toast.push({status: 'success', title: 'Press kit details pasted'})
  }

  return {
    label: 'Paste press kit details',
    title: 'Paste press kit fields onto this release',
    disabled: !props.ready || Boolean(patch.disabled),
    onHandle: async () => {
      let clipboardText = ''

      try {
        clipboardText = await readClipboardText()
      } catch {
        const storedText = readStoredPayloadText()
        if (storedText) {
          try {
            applyText(storedText)
            return
          } catch (storedErr) {
            setManualPaste({
              text: storedText,
              error:
                storedErr instanceof Error
                  ? storedErr.message
                  : 'The saved press kit copy could not be pasted.',
            })
            return
          }
        }

        setManualPaste({
          text: '',
          error: 'Browser clipboard access was blocked. Paste the press kit JSON below.',
        })
        return
      }

      try {
        applyText(clipboardText)
      } catch (err) {
        setManualPaste({
          text: clipboardText,
          error: err instanceof Error ? err.message : 'Could not paste press kit details.',
        })
      }
    },
    dialog: manualPaste
      ? {
          type: 'dialog',
          header: 'Paste press kit details',
          content: (
            <ManualPasteDialog
              initialText={manualPaste.text}
              initialError={manualPaste.error}
              onApply={applyText}
              onClose={() => setManualPaste(null)}
            />
          ),
          onClose: () => setManualPaste(null),
          width: 'medium',
        }
      : null,
  }
}

ReleasePressKitPasteAction.action = 'pastePressKitDetails'
ReleasePressKitPasteAction.displayName = 'ReleasePressKitPasteAction'

export const releasePressKitClipboardActions = [
  ReleasePressKitCopyAction,
  ReleasePressKitPasteAction,
]
