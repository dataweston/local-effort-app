import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, FileText, Plus, RefreshCw, Table, Upload, Utensils, X } from 'lucide-react';
import { api, Panel, MarkdownPreview } from './hubShared';

export const FOOD_INPUTS_MARKDOWN_PLACEHOLDER = '#dishes#\n- \n\n#ingredients#\n- \n\n#questions#\n- \n\n#quality notes#\n- \n';


export const FOOD_INPUTS_DATE_TZ = 'America/Chicago';


export function foodInputsTodayIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: FOOD_INPUTS_DATE_TZ });
}


// Parse a Food Inputs note into spreadsheet rows. `#section#` headers (and
// markdown `#`/`##`/`###` headings) become the value of a "Section" column;
// each `- ` bullet (or any other non-empty, non-heading line) becomes one row
// tagged with the section it falls under. Returns { columns, rows }.
export function noteToSheet(markdown) {
  const columns = ['Section', 'Item'];
  const rows = [];
  let section = '';
  String(markdown || '').split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const wrapped = line.match(/^#(.+)#$/);          // #dishes#
    const heading = line.match(/^#{1,3}\s+(.+)$/);   // ## Dishes
    if (wrapped) { section = wrapped[1].trim(); return; }
    if (heading) { section = heading[1].trim(); return; }
    const item = line.replace(/^[-*]\s+/, '').trim(); // strip bullet marker
    if (!item) return;
    rows.push([section, item]);
  });
  return { columns, rows: rows.length ? rows : [['', '']] };
}


// Server caps — keep in sync with sanitizeSheet in api-handlers/hub/food-inputs.js.
export const SHEET_MAX_COLS = 12;

export const SHEET_MAX_ROWS = 200;

// Minimum visible grid, so the sheet reads as a ready spreadsheet (à la Google
// Sheets) instead of a build-your-own table.
export const SHEET_MIN_COLS = 8;

export const SHEET_MIN_ROWS = 20;


export function sheetColumnLetter(index) {
  return String.fromCharCode(65 + (index % 26));
}


// Pad a saved sheet out to the minimum visible grid. Display-only padding —
// trimSheet strips it back off before anything is saved.
export function padSheet(value) {
  const columns = (Array.isArray(value?.columns) ? value.columns : []).map((cell) => String(cell ?? ''));
  while (columns.length < SHEET_MIN_COLS) columns.push('');
  const width = columns.length;
  const rows = (Array.isArray(value?.rows) ? value.rows : []).map((row) => {
    const cells = (Array.isArray(row) ? row : []).map((cell) => String(cell ?? '')).slice(0, width);
    while (cells.length < width) cells.push('');
    return cells;
  });
  while (rows.length < SHEET_MIN_ROWS) rows.push(new Array(width).fill(''));
  return { columns, rows };
}


// Inverse of padSheet: drop trailing all-empty rows and trailing unnamed,
// all-empty columns so autosave never persists the display padding.
export function trimSheet(value) {
  const columns = (Array.isArray(value?.columns) ? value.columns : []).map((cell) => String(cell ?? ''));
  const rows = (Array.isArray(value?.rows) ? value.rows : [])
    .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []));
  let width = columns.length;
  while (
    width > 1 &&
    !columns[width - 1].trim() &&
    rows.every((row) => !String(row[width - 1] ?? '').trim())
  ) width -= 1;
  let height = rows.length;
  while (height > 1 && rows[height - 1].slice(0, width).every((cell) => !cell.trim())) height -= 1;
  return {
    columns: columns.slice(0, Math.max(width, 1)),
    rows: rows.slice(0, Math.max(height, 1)).map((row) => {
      const cells = row.slice(0, Math.max(width, 1));
      while (cells.length < Math.max(width, 1)) cells.push('');
      return cells;
    }),
  };
}


// Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). Returns
// an array of string rows; drops rows that are entirely empty.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text || '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ''));
}


// Shared two-way log between the kitchen and the customer (David & Allison).
// Week tabs across the top; toggle between a markdown notepad (default) and a
// spreadsheet grid. Both views autosave. Mirrors the meal-prep notepad style.
export function FoodInputsView({ accessToken }) {
  const [weeks, setWeeks] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [view, setView] = useState('markdown'); // 'markdown' | 'sheet'
  const [markdown, setMarkdown] = useState('');
  const [sheet, setSheet] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(false);

  const [pinnedDates, setPinnedDates] = useState([]); // extra week-dates reached via calendar
  const [datePick, setDatePick] = useState(foodInputsTodayIso());
  const pendingSelectDateRef = useRef(null); // date whose week tab to select after next load

  const activeTabRef = useRef(activeTab);
  const lastSavedMdRef = useRef('');
  const lastSavedSheetRef = useRef('');
  const fileInputRef = useRef(null);

  const applyWeek = useCallback((week) => {
    const md = week?.markdown || '';
    const sheetValue = padSheet(week?.sheet);
    setMarkdown(md);
    setSheet(sheetValue);
    lastSavedMdRef.current = md;
    lastSavedSheetRef.current = JSON.stringify(trimSheet(sheetValue));
  }, []);

  // `selectId` lets a caller (e.g. the calendar) force a specific week tab to
  // become active once the data for it has loaded.
  const load = useCallback(async ({ pins = [], selectId = null } = {}) => {
    setLoading(true);
    try {
      const query = pins.length ? `?pin=${encodeURIComponent(pins.join(','))}` : '';
      const next = await api(`/api/hub/food-inputs${query}`, accessToken);
      const list = next.weeks || [];
      setWeeks(list);
      // If a calendar pick is pending, prefer the week that contains that date.
      const pendingDate = pendingSelectDateRef.current;
      const weekForDate = pendingDate
        ? list.find((week) => {
            const start = new Date(`${week.weekStart}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const picked = new Date(`${pendingDate}T00:00:00`);
            return picked >= start && picked <= end;
          })
        : null;
      pendingSelectDateRef.current = null;
      const wantId = weekForDate?.id || selectId || activeTabRef.current;
      const selected = list.find((week) => week.id === wantId) || list[0];
      if (selected) {
        activeTabRef.current = selected.id;
        setActiveTab(selected.id);
        applyWeek(selected);
      }
      setStatus('');
    } catch (err) {
      setStatus(err.message || 'Unable to load food inputs.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyWeek]);

  useEffect(() => { load({ pins: pinnedDates }).catch(() => {}); }, [load, pinnedDates]);

  // Autosave markdown.
  useEffect(() => {
    if (!activeTab || markdown === lastSavedMdRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/food-inputs', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, view: 'markdown', markdown }),
        });
        lastSavedMdRef.current = saved.week?.markdown ?? markdown;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, markdown]);

  // Autosave spreadsheet. Saves the trimmed sheet (no display padding) and
  // compares trimmed forms so padding alone never triggers a save.
  useEffect(() => {
    if (!activeTab) return undefined;
    const serialized = JSON.stringify(trimSheet(sheet));
    if (serialized === lastSavedSheetRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/food-inputs', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, view: 'sheet', sheet: trimSheet(sheet) }),
        });
        lastSavedSheetRef.current = saved.week?.sheet ? JSON.stringify(trimSheet(saved.week.sheet)) : serialized;
        if (saved.week?.sheet) setSheet(padSheet(saved.week.sheet));
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, sheet]);

  const chooseTab = (tabId) => {
    const next = weeks.find((week) => week.id === tabId);
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    if (next) applyWeek(next);
  };

  const setCell = (rowIndex, colIndex, value) => {
    setSheet((prev) => {
      const rows = prev.rows.map((row) => [...row]);
      if (!rows[rowIndex]) return prev;
      rows[rowIndex][colIndex] = value;
      return { ...prev, rows };
    });
  };

  const setColumn = (colIndex, value) => {
    setSheet((prev) => {
      const columns = [...prev.columns];
      columns[colIndex] = value;
      return { ...prev, columns };
    });
  };

  const addRow = () => {
    setSheet((prev) => (prev.rows.length >= SHEET_MAX_ROWS
      ? prev
      : { ...prev, rows: [...prev.rows, prev.columns.map(() => '')] }));
  };

  const addColumn = () => {
    setSheet((prev) => (prev.columns.length >= SHEET_MAX_COLS
      ? prev
      : {
          columns: [...prev.columns, ''],
          rows: prev.rows.map((row) => [...row, '']),
        }));
  };

  const removeRow = (rowIndex) => {
    // Re-pad so deleting a row never shrinks the visible grid.
    setSheet((prev) => padSheet({ ...prev, rows: prev.rows.filter((_, index) => index !== rowIndex) }));
  };

  const focusSheetCell = (fromInput, rowIndex, colIndex) => {
    const next = fromInput.closest('table')?.querySelector(`input[data-cell="${rowIndex}-${colIndex}"]`);
    if (next) next.focus();
  };

  // Enter moves down a cell (adding a row at the bottom edge), like Sheets.
  const handleCellKeyDown = (event, rowIndex, colIndex) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const input = event.currentTarget;
    if (rowIndex + 1 >= sheet.rows.length) addRow();
    window.requestAnimationFrame(() => focusSheetCell(input, rowIndex + 1, colIndex));
  };

  const handleHeaderKeyDown = (event, colIndex) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    focusSheetCell(event.currentTarget, 0, colIndex);
  };

  // Import a .csv or .xlsx/.xls file into the sheet. On replace, the file's
  // first row becomes the header row; on append, every file row is kept as
  // data so nothing is silently dropped.
  const importSheetFile = async (file) => {
    if (!file) return;
    setStatus(`Reading ${file.name}...`);
    let grid;
    try {
      if (/\.xlsx?$|\.xls$/i.test(file.name)) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        grid = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' }) : [];
      } else {
        grid = parseCsv(await file.text());
      }
    } catch (err) {
      setStatus(`Could not read ${file.name}: ${err.message || 'unknown error'}`);
      return;
    }
    grid = (grid || [])
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []))
      .filter((row) => row.some((cell) => cell.trim()));
    if (!grid.length) {
      setStatus(`${file.name} has no rows.`);
      return;
    }
    let clipped = grid.some((row) => row.length > SHEET_MAX_COLS);
    grid = grid.map((row) => row.slice(0, SHEET_MAX_COLS));

    const hasSheetData = sheet.rows.some((row) => row.some((cell) => String(cell || '').trim()));
    let mode = 'replace';
    if (hasSheetData) {
      // eslint-disable-next-line no-alert
      const append = window.confirm(
        `Add the rows from ${file.name} below your existing spreadsheet rows?\n\nOK = append below current rows (the file's first row is kept as a data row)\nCancel = replace the sheet with the file`,
      );
      mode = append ? 'append' : 'replace';
    }

    let next;
    if (mode === 'append') {
      const base = trimSheet(sheet);
      const width = base.columns.length;
      const fileRows = grid.map((row) => {
        const cells = row.slice(0, width);
        while (cells.length < width) cells.push('');
        return cells;
      });
      next = { columns: base.columns, rows: [...base.rows, ...fileRows] };
    } else {
      const [headerRow, ...bodyRows] = grid;
      next = { columns: headerRow, rows: bodyRows.length ? bodyRows : [headerRow.map(() => '')] };
    }
    if (next.rows.length > SHEET_MAX_ROWS) {
      next = { ...next, rows: next.rows.slice(0, SHEET_MAX_ROWS) };
      clipped = true;
    }
    setSheet(padSheet(next));
    setView('sheet');
    setStatus(`Imported ${file.name}${clipped ? ` (trimmed to ${SHEET_MAX_COLS} columns × ${SHEET_MAX_ROWS} rows)` : ''}`);
  };

  const weekContaining = (dateIso) => weeks.find((week) => {
    const start = new Date(`${week.weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const picked = new Date(`${dateIso}T00:00:00`);
    return picked >= start && picked <= end;
  });

  // Calendar pick: if the date's week is already a tab, just select it.
  // Otherwise pin the date — the load effect refetches with the pin and the
  // pending-select ref makes that week's tab active once it arrives.
  const goToDate = (dateIso) => {
    if (!dateIso) return;
    const existing = weekContaining(dateIso);
    if (existing) {
      chooseTab(existing.id);
      return;
    }
    pendingSelectDateRef.current = dateIso;
    setPinnedDates((prev) => (prev.includes(dateIso) ? prev : [...prev, dateIso]));
  };

  // Convert the current note into spreadsheet rows. Asks append vs replace so
  // existing sheet cells are never silently discarded.
  const convertNoteToSheet = () => {
    const parsed = noteToSheet(markdown);
    if (!parsed.rows.length) return;
    const hasSheetData = sheet.rows.some((row) => row.some((cell) => String(cell || '').trim()));
    let mode = 'replace';
    if (hasSheetData) {
      // eslint-disable-next-line no-alert
      const append = window.confirm(
        'Add the note rows below your existing spreadsheet rows?\n\nOK = append to current sheet\nCancel = replace the sheet with the note',
      );
      mode = append ? 'append' : 'replace';
    }
    setSheet((prev) => {
      if (mode === 'append') {
        // Keep current columns; map parsed rows onto current width. Trim first
        // so note rows land right below the data, not below display padding.
        const base = trimSheet(prev);
        const width = base.columns.length || parsed.columns.length;
        const columns = base.columns.length ? base.columns : parsed.columns;
        const newRows = parsed.rows.map((row) => {
          const cells = row.slice(0, width);
          while (cells.length < width) cells.push('');
          return cells;
        });
        return padSheet({ columns, rows: [...base.rows, ...newRows].slice(0, SHEET_MAX_ROWS) });
      }
      return padSheet(parsed);
    });
    setView('sheet');
    setStatus('Converted note to spreadsheet.');
  };

  return (
    <div className="hub-meal-prep">
      <Panel
        title="Food Inputs"
        icon={Utensils}
        action={(
          <div className="hub-button-row">
            <button className={view === 'markdown' ? 'is-active' : ''} onClick={() => setView('markdown')}>
              <FileText size={13} /> Notes
            </button>
            <button className={view === 'sheet' ? 'is-active' : ''} onClick={() => setView('sheet')}>
              <Table size={13} /> Spreadsheet
            </button>
            <button onClick={() => load({ pins: pinnedDates })}><RefreshCw size={13} /></button>
          </div>
        )}
      >
        <p className="hub-empty" style={{ marginTop: 0 }}>
          Trade notes and track dishes, questions, ingredients, and quality inputs with the kitchen. Saves automatically.
        </p>
        <div className="hub-foodinputs-datebar">
          <div className="hub-foodinputs-tabs">
            {weeks.map((week) => (
              <button key={week.id} className={activeTab === week.id ? 'is-active' : ''} onClick={() => chooseTab(week.id)}>
                {week.title}
              </button>
            ))}
          </div>
          <label className="hub-foodinputs-datepick">
            <CalendarDays size={13} aria-hidden="true" />
            <span>Go to date</span>
            <input
              type="date"
              value={datePick}
              onChange={(event) => {
                setDatePick(event.target.value);
                goToDate(event.target.value);
              }}
            />
          </label>
        </div>
        <div className="hub-foodinputs-status">
          <span>{loading ? 'Loading...' : status || 'Shared with the kitchen. Pick any date to open its week.'}</span>
        </div>

        {view === 'markdown' ? (
          <>
            <div className="hub-button-row" style={{ padding: '8px 0' }}>
              <button className={preview ? '' : 'is-active'} onClick={() => setPreview(false)}>Edit</button>
              <button className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>Preview</button>
              <button onClick={convertNoteToSheet} title="Turn these notes into spreadsheet rows">
                <Table size={13} /> Convert to spreadsheet
              </button>
            </div>
            {preview ? (
              <MarkdownPreview body={markdown || FOOD_INPUTS_MARKDOWN_PLACEHOLDER} />
            ) : (
              <textarea
                className="hub-wordpad"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                spellCheck="true"
                placeholder={FOOD_INPUTS_MARKDOWN_PLACEHOLDER}
              />
            )}
          </>
        ) : (
          <div className="hub-sheet">
            <div className="hub-button-row" style={{ padding: '0 0 8px' }}>
              <button onClick={addRow} disabled={sheet.rows.length >= SHEET_MAX_ROWS}>
                <Plus size={13} /> Add row
              </button>
              <button onClick={addColumn} disabled={sheet.columns.length >= SHEET_MAX_COLS}>
                <Plus size={13} /> Add column
              </button>
              <button onClick={() => fileInputRef.current?.click()} title="Import a .csv or .xlsx file into this sheet">
                <Upload size={13} /> Import CSV/XLSX
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                aria-label="Import a CSV or Excel file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) importSheetFile(file);
                }}
              />
            </div>
            <div className="hub-sheet-scroll">
              <table className="hub-sheet-table">
                <thead>
                  <tr className="hub-sheet-letters" aria-hidden="true">
                    <th className="hub-sheet-corner" />
                    {sheet.columns.map((_, colIndex) => (
                      <th key={colIndex}>{sheetColumnLetter(colIndex)}</th>
                    ))}
                  </tr>
                  <tr>
                    <th className="hub-sheet-rownum" aria-hidden="true" />
                    {sheet.columns.map((column, colIndex) => (
                      <th key={colIndex}>
                        <input
                          value={column}
                          placeholder="Header"
                          onChange={(event) => setColumn(colIndex, event.target.value)}
                          onKeyDown={(event) => handleHeaderKeyDown(event, colIndex)}
                          aria-label={`Column ${sheetColumnLetter(colIndex)} header`}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="hub-sheet-rownum">
                        <span>{rowIndex + 1}</span>
                        <button type="button" onClick={() => removeRow(rowIndex)} aria-label={`Remove row ${rowIndex + 1}`}>
                          <X size={12} />
                        </button>
                      </td>
                      {sheet.columns.map((_, colIndex) => (
                        <td key={colIndex}>
                          <input
                            value={row[colIndex] ?? ''}
                            data-cell={`${rowIndex}-${colIndex}`}
                            onChange={(event) => setCell(rowIndex, colIndex, event.target.value)}
                            onKeyDown={(event) => handleCellKeyDown(event, rowIndex, colIndex)}
                            aria-label={`Row ${rowIndex + 1} ${sheet.columns[colIndex] || `column ${sheetColumnLetter(colIndex)}`}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

