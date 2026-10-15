import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import NodeBody from './NodeBody';
import {
  NODE_W,
  PORT_Y,
  cableGeometry,
  canReceive,
  canSend,
  defaultPositions,
  describeRoute,
  inferKind,
  kindOf,
  refusal,
  routeKey,
} from './routingRules';

const DRAG_THRESHOLD = 4; // px before a press on a port becomes a drag
const PAD = 28;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export default function Board({
  nodes,
  routes,
  google,
  problems,
  selectedKey,
  onSelect,
  onMove,
  onConnect,
  onToggle,
  onDelete,
  onConfig,
  notice,
  onNotice,
}) {
  const boardRef = useRef(null);
  const controlRef = useRef(null);
  const nodeEls = useRef(new Map());
  const [heights, setHeights] = useState({});
  const [view, setView] = useState({ x: PAD, y: PAD, s: 1 });
  const [pending, setPending] = useState(null); // output port chosen by click or key
  const [connecting, setConnecting] = useState(null); // { fromId, x, y, overId } while dragging
  const [panning, setPanning] = useState(false);
  const viewRef = useRef(view);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const focusControl = useRef(false);
  const fitted = useRef(false);
  viewRef.current = view;

  const labelOf = useCallback((id) => nodes.find((node) => node.id === id)?.label || id, [nodes]);
  const defaults = useMemo(() => defaultPositions(nodes, heights), [nodes, heights]);
  const posOf = useCallback(
    (node) => ({
      x: Number.isFinite(node.posX) ? node.posX : defaults[node.id]?.x ?? 0,
      y: Number.isFinite(node.posY) ? node.posY : defaults[node.id]?.y ?? 0,
    }),
    [defaults],
  );
  const positions = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, posOf(node)])), [nodes, posOf]);

  // Default positions depend on how tall each node is, so measure them.
  useLayoutEffect(() => {
    const measure = () => {
      setHeights((prev) => {
        let changed = false;
        const next = { ...prev };
        nodeEls.current.forEach((el, id) => {
          if (el && next[id] !== el.offsetHeight) {
            next[id] = el.offsetHeight;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    nodeEls.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [nodes.length]);

  const fit = useCallback(() => {
    const board = boardRef.current;
    if (!board || !nodes.length) return;
    let right = 0;
    let bottom = 0;
    nodes.forEach((node) => {
      const p = posOf(node);
      right = Math.max(right, p.x + NODE_W);
      bottom = Math.max(bottom, p.y + (heights[node.id] || 0));
    });
    const width = board.clientWidth;
    const height = board.clientHeight;
    const s = width > 640 ? clamp(Math.min((width - PAD * 2) / right, (height - PAD * 2) / Math.max(bottom, 1)), 0.6, 1) : 1;
    setView({ x: PAD, y: PAD, s });
  }, [nodes, posOf, heights]);

  useLayoutEffect(() => {
    if (fitted.current || !nodes.length || !Object.keys(heights).length) return;
    fitted.current = true;
    fit();
  }, [heights, nodes.length, fit]);

  const toWorld = (clientX, clientY) => {
    const rect = boardRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.x) / v.s, y: (clientY - rect.top - v.y) / v.s };
  };

  const portAt = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY)?.closest?.('[data-port="in"]');
    return el ? el.getAttribute('data-node') : null;
  };

  const source = connecting?.fromId || pending;
  const selected = routes.find((route) => routeKey(route) === selectedKey) || null;

  useEffect(() => {
    if (selected && focusControl.current) {
      focusControl.current = false;
      controlRef.current?.querySelector('button')?.focus();
    }
  }, [selected]);

  // ── Connecting ──────────────────────────────────────────────────────────

  const tryConnect = (fromId, toId) => {
    const reason = refusal(fromId, toId, routes);
    if (reason) {
      onNotice(reason);
      return;
    }
    onConnect(fromId, toId, inferKind(fromId, toId));
    onNotice(`Cabled ${labelOf(fromId)} to ${labelOf(toId)}. Click the cable to turn it off or delete it.`);
  };

  const portDown = (event, fromId) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { type: 'cable', fromId, sx: event.clientX, sy: event.clientY, moved: false };
  };

  const portMove = (event) => {
    const d = drag.current;
    if (!d || d.type !== 'cable') return;
    if (!d.moved && Math.hypot(event.clientX - d.sx, event.clientY - d.sy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) {
      setPending(null);
      setConnecting({ fromId: d.fromId, ...toWorld(event.clientX, event.clientY), overId: portAt(event.clientX, event.clientY) });
    }
  };

  const portUp = (event) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.type !== 'cable') return;
    if (d.moved) {
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      const overId = portAt(event.clientX, event.clientY);
      setConnecting(null);
      if (overId) tryConnect(d.fromId, overId);
      else onNotice('Dropped on empty board. Drag to the left edge of a calendar to cable it.');
    }
  };

  const portCancel = () => {
    drag.current = null;
    setConnecting(null);
  };

  const outClick = (id) => {
    if (suppressClick.current) return;
    if (pending === id) {
      setPending(null);
      onNotice('Connection cancelled.');
      return;
    }
    setPending(id);
    onSelect(null);
    onNotice(`Connecting from ${labelOf(id)}. Choose an input port on the left edge of another calendar, or press Escape to cancel.`);
  };

  const inClick = (id) => {
    if (suppressClick.current) return;
    if (!pending) {
      onNotice('Choose an output port first. Output ports are on the right edge of a calendar.');
      return;
    }
    const from = pending;
    const reason = refusal(from, id, routes);
    if (reason) {
      onNotice(reason);
      return;
    }
    setPending(null);
    tryConnect(from, id);
  };

  // ── Moving nodes and panning ───────────────────────────────────────────

  const headDown = (event, node) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = posOf(node);
    drag.current = { type: 'node', id: node.id, sx: event.clientX, sy: event.clientY, ox: p.x, oy: p.y };
    event.currentTarget.dataset.dragging = 'true';
  };

  const headMove = (event) => {
    const d = drag.current;
    if (!d || d.type !== 'node') return;
    const s = viewRef.current.s;
    onMove(d.id, Math.round(d.ox + (event.clientX - d.sx) / s), Math.round(d.oy + (event.clientY - d.sy) / s));
  };

  const headUp = (event) => {
    if (drag.current?.type === 'node') drag.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  const boardDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('.cr-node, .cr-control, .cr-cable, .cr-tools')) return;
    boardRef.current.setPointerCapture(event.pointerId);
    drag.current = { type: 'pan', sx: event.clientX, sy: event.clientY, ox: viewRef.current.x, oy: viewRef.current.y };
    setPanning(true);
    setPending(null);
    onSelect(null);
  };

  const boardMove = (event) => {
    const d = drag.current;
    if (!d || d.type !== 'pan') return;
    setView((v) => ({ ...v, x: d.ox + event.clientX - d.sx, y: d.oy + event.clientY - d.sy }));
  };

  const boardUp = () => {
    if (drag.current?.type === 'pan') drag.current = null;
    setPanning(false);
  };

  const boardKey = (event) => {
    if (event.key === 'Escape') {
      if (pending || connecting) onNotice('Connection cancelled.');
      setPending(null);
      setConnecting(null);
      onSelect(null);
      return;
    }
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName);
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !typing) {
      event.preventDefault();
      onNotice(`Deleted the cable from ${labelOf(selected.fromId)} to ${labelOf(selected.toId)}.`);
      onDelete(routeKey(selected));
    }
  };

  const selectCable = (route, byKey) => {
    focusControl.current = byKey;
    setPending(null);
    onSelect(routeKey(route));
  };

  // ── Drawing ─────────────────────────────────────────────────────────────

  const jack = (id, side) => {
    const p = positions[id];
    return p ? { x: p.x + (side === 'out' ? NODE_W : 0), y: p.y + PORT_Y } : null;
  };

  const cables = routes
    .map((route) => {
      const a = jack(route.fromId, 'out');
      const b = jack(route.toId, 'in');
      return a && b ? { route, key: routeKey(route), ...cableGeometry(a.x, a.y, b.x, b.y), a, b } : null;
    })
    .filter(Boolean);

  const live = (() => {
    if (!connecting) return null;
    const a = jack(connecting.fromId, 'out');
    if (!a) return null;
    return cableGeometry(a.x, a.y, connecting.x, connecting.y);
  })();

  const selectedCable = cables.find((cable) => cable.key === selectedKey) || null;

  const linksOf = (id) => ({
    closing: routes.filter((r) => r.kind === 'blocks' && r.toId === id && r.enabled).length,
    copied: routes.filter((r) => r.kind === 'mirrors' && r.fromId === id && r.enabled).length,
  });

  const portState = (id) => {
    if (!source) return '';
    const reason = refusal(source, id, routes);
    if (reason) return ' is-refused';
    return connecting?.overId === id ? ' is-target' : ' is-ready';
  };

  return (
    <div className="cr-board-wrap">
    <div className="cr-boardbar">
      <p className="cr-hint" role="status" aria-live="polite">{notice}</p>
      <button type="button" onClick={() => { fit(); }}>Reset view</button>
    </div>
    {/* Escape cancels an in-progress cable from anywhere on the board; the focusable controls are the ports and cables inside. */}
    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
    <div
      ref={boardRef}
      className={`cr-board${panning ? ' is-panning' : ''}${source ? ' is-connecting' : ''}`}
      onPointerDown={boardDown}
      onPointerMove={boardMove}
      onPointerUp={boardUp}
      onPointerCancel={boardUp}
      onKeyDown={boardKey}
      role="group"
      aria-label="Routing board. Drag the background to pan."
    >

      <div className="cr-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
        {nodes.map((node) => {
          const p = positions[node.id];
          return (
            <article
              key={node.id}
              ref={(el) => { if (el) nodeEls.current.set(node.id, el); else nodeEls.current.delete(node.id); }}
              className={`cr-node cr-node--${node.kind}`}
              style={{ left: p.x, top: p.y, width: NODE_W }}
              aria-label={node.label}
            >
              <header
                className="cr-node__head"
                onPointerDown={(event) => headDown(event, node)}
                onPointerMove={headMove}
                onPointerUp={headUp}
                onPointerCancel={headUp}
              >
                {canReceive(node.id) ? (
                  <button
                    type="button"
                    className={`cr-port cr-port--in${portState(node.id)}`}
                    data-port="in"
                    data-node={node.id}
                    aria-label={`Input to ${node.label}`}
                    aria-disabled={source && refusal(source, node.id, routes) ? 'true' : undefined}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => inClick(node.id)}
                  />
                ) : null}
                <h3 title={node.label}>{node.label}</h3>
                {canSend(node.id) ? (
                  <button
                    type="button"
                    className={`cr-port cr-port--out${pending === node.id || connecting?.fromId === node.id ? ' is-source' : ''}`}
                    data-port="out"
                    data-node={node.id}
                    aria-label={`Output from ${node.label}`}
                    aria-pressed={pending === node.id}
                    onPointerDown={(event) => portDown(event, node.id)}
                    onPointerMove={portMove}
                    onPointerUp={portUp}
                    onPointerCancel={portCancel}
                    onClick={() => outClick(node.id)}
                  />
                ) : null}
              </header>
              <div className="cr-node__body">
                <NodeBody
                  node={node}
                  google={google}
                  links={linksOf(node.id)}
                  problem={problems[node.id]}
                  onConfig={onConfig}
                />
              </div>
            </article>
          );
        })}

        <svg className="cr-cables" width="1" height="1">
          {cables.map(({ route, key, d, a, b }) => (
            <g
              key={key}
              className={`cr-cable cr-cable--${route.kind}${route.enabled ? '' : ' is-off'}${key === selectedKey ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={key === selectedKey}
              aria-label={`${describeRoute(route, labelOf)}${route.enabled ? '' : ' Turned off.'}`}
              onClick={() => selectCable(route, false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectCable(route, true);
                }
              }}
            >
              <path className="cr-cable__hit" d={d} />
              <path className="cr-cable__line" d={d} />
              {route.enabled ? <path className="cr-cable__flow" d={d} /> : null}
              <circle className="cr-cable__plug" cx={a.x} cy={a.y} r="5" />
              <circle className="cr-cable__plug" cx={b.x} cy={b.y} r="5" />
            </g>
          ))}
          {live ? <path className="cr-cable__line cr-cable__line--drag" d={live.d} /> : null}
        </svg>

        {selected && selectedCable ? (
          <div
            ref={controlRef}
            className="cr-control"
            style={{ left: selectedCable.mid.x, top: selectedCable.mid.y }}
            role="group"
            aria-label="Selected cable"
          >
            <p>{describeRoute(selected, labelOf)}</p>
            <p className="cr-note">
              {selected.kind === 'blocks' ? 'Closes dates' : kindOf(selected.fromId) === 'feed' ? 'Passes through' : 'Copies bookings'}
              {selected.enabled ? '.' : ', but it is turned off.'}
            </p>
            <div className="cr-control__actions">
              <button type="button" onClick={() => onToggle(selectedKey)}>
                {selected.enabled ? 'Turn off' : 'Turn on'}
              </button>
              <button type="button" className="cr-danger" onClick={() => onDelete(selectedKey)}>Delete cable</button>
              <button type="button" onClick={() => onSelect(null)}>Done</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </div>
  );
}
