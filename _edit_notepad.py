from pathlib import Path

path = Path('src/partners/placemaker/NotepadTile.jsx')
text = path.read_text()

if "LOCAL_NOTES_KEY" not in text:
    text = text.replace("const COLLECTION_KEY = 'placemakerNotes';\n\n", "const COLLECTION_KEY = 'placemakerNotes';\nconst LOCAL_NOTES_KEY = 'placemaker-notes-local';\n\n")

state_old = "  const [notes, setNotes] = useState([]);\n  const activeIdRef = useRef(null);\n  const bootstrappedRef = useRef(false);\n  const [activeId, setActiveId] = useState(null);\n  const [draft, setDraft] = useState('');\n  const [loadingList, setLoadingList] = useState(true);\n  const [saving, setSaving] = useState(false);\n  const [error, setError] = useState('');\n\n  const saveTimer = useRef(null);\n  const localEditRef = useRef(false);\n\n"
state_new = "  const [notes, setNotes] = useState([]);\n  const activeIdRef = useRef(null);\n  const bootstrappedRef = useRef(false);\n  const [activeId, setActiveId] = useState(null);\n  const [draft, setDraft] = useState('');\n  const [loadingList, setLoadingList] = useState(true);\n  const [saving, setSaving] = useState(false);\n  const [error, setError] = useState('');\n  const [syncMode, setSyncMode] = useState(db ? 'firestore' : 'local');\n\n  const saveTimer = useRef(null);\n  const localEditRef = useRef(false);\n\n"
text = text.replace(state_old, state_new)

helpers = """function readLocalNotes() {\n  try {\n    if (typeof window === 'undefined') return [];\n    const raw = window.localStorage.getItem(LOCAL_NOTES_KEY);\n    if (!raw) return [];\n    const parsed = JSON.parse(raw);\n    if (!Array.isArray(parsed)) return [];\n    return parsed.map((note) => ({\n      id: String(note.id || Date.now().toString()),\n      title: String(note.title || 'Untitled'),\n      content: String(note.content || ''),\n      updatedAt: note.updatedAt || null,\n    }));\n  } catch (error) {\n    console.warn('Placemaker notes local read failed', error);\n    return [];\n  }\n}\n\nfunction writeLocalNotes(data) {\n  try {\n    if (typeof window === 'undefined') return;\n    window.localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(data));\n  } catch (error) {\n    console.warn('Placemaker notes local write failed', error);\n  }\n}\n\n"""
if "readLocalNotes" not in text:
    text = text.replace("function formatTitleFromContent(content) {\n  const now = new Date();\n  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;\n  const snippet = (content || '').trim().split(/\\s+/).slice(0, 6).join(' ');\n  return snippet ? `${stamp} · ${snippet}` : `${stamp} · Note`;\n}\n\nconst NotepadTile = forwardRef(function NotepadTile(_, ref) {\n", "function formatTitleFromContent(content) {\n  const now = new Date();\n  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;\n  const snippet = (content || '').trim().split(/\\s+/).slice(0, 6).join(' ');\n  return snippet ? `${stamp} · ${snippet}` : `${stamp} · Note`;\n}\n\n" + helpers + "const NotepadTile = forwardRef(function NotepadTile(_, ref) {\n")

# rest of script shortened for time; we'll write minimal adjustments later
path.write_text(text)
