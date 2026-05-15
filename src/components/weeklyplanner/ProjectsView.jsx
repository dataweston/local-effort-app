import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, ChevronRight, Circle } from 'lucide-react';

const STATUSES = [
  { key: 'todo',        label: 'To Do',      color: 'var(--color-text-muted)' },
  { key: 'in_progress', label: 'In Progress', color: '#4a7c9e' },
  { key: 'blocked',     label: 'Blocked',     color: 'var(--color-state-danger)' },
  { key: 'done',        label: 'Done',        color: 'var(--color-state-success)' },
];

const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Critical'];

function useProjects(accessToken) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/planner/projects', { headers: headers() });
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } finally {
      setLoading(false);
    }
  }, [accessToken, headers]);

  const seedDefaults = useCallback(async () => {
    const res = await fetch('/api/planner/projects', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'seed-defaults' }),
    });
    const data = await res.json();
    if (data.projects) {
      setProjects(data.projects);
      setSeeded(true);
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  return { projects, loading, seeded, seedDefaults, reload: load };
}

function StatusDot({ status, size = 10 }) {
  const s = STATUSES.find((x) => x.key === status) || STATUSES[0];
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: s.color,
        flexShrink: 0,
      }}
    />
  );
}

function CardChip({ card, onClick }) {
  return (
    <button
      onClick={() => onClick(card)}
      className="w-full text-left rounded-lg px-3 py-2 transition-colors border"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      <div className="flex items-start gap-2">
        <StatusDot status={card.status} size={8} />
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-medium truncate leading-snug"
            style={{
              color: 'var(--color-text-primary)',
              textDecoration: card.status === 'done' ? 'line-through' : 'none',
              opacity: card.status === 'done' ? 0.6 : 1,
            }}
          >
            {card.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {card.dueDate && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {card.dueDate}
              </span>
            )}
            {card.people?.length > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {card.people.join(', ')}
              </span>
            )}
            {card.priority > 0 && (
              <span
                className="text-[9px] font-semibold px-1 rounded"
                style={{
                  backgroundColor: card.priority >= 3 ? '#fce8e8' : card.priority === 2 ? '#fef3e2' : '#f0f4f0',
                  color: card.priority >= 3 ? '#c0392b' : card.priority === 2 ? '#b07d3a' : '#4a5568',
                }}
              >
                {PRIORITY_LABELS[card.priority]}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function ProjectColumn({ project, cards, onCardClick, onAddCard }) {
  const byStatus = {};
  STATUSES.forEach((s) => { byStatus[s.key] = []; });
  cards.forEach((c) => {
    const key = STATUSES.find((s) => s.key === c.status) ? c.status : 'todo';
    byStatus[key].push(c);
  });

  const total = cards.length;
  const done = byStatus['done'].length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      className="flex flex-col rounded-xl border min-w-[260px] max-w-[300px] flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      {/* Project header */}
      <div
        className="px-4 py-3 border-b rounded-t-xl"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color || 'var(--color-text-muted)' }}
          />
          <span
            className="text-sm font-semibold font-display truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {project.title}
          </span>
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: 'var(--color-bg-page)',
              color: 'var(--color-text-muted)',
            }}
          >
            {total}
          </span>
        </div>
        {total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="flex-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-border-default)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: project.color || 'var(--color-state-success)' }}
              />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {progress}%
            </span>
          </div>
        )}
      </div>

      {/* Status lanes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {STATUSES.filter((s) => s.key !== 'done' || byStatus['done'].length > 0).map((s) => (
          <div key={s.key}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <StatusDot status={s.key} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
                {s.label}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {byStatus[s.key].length}
              </span>
            </div>
            <div className="space-y-1.5">
              {byStatus[s.key].map((card) => (
                <CardChip key={card.id} card={card} onClick={onCardClick} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add card button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAddCard(project)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed transition-colors"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border-default)',
          }}
        >
          <Plus size={12} />
          Add card
        </button>
      </div>
    </div>
  );
}

export function ProjectsView({ cards, onCardClick, onAddCard, accessToken }) {
  const { projects, loading, seedDefaults } = useProjects(accessToken);
  const [filter, setFilter] = useState('all');

  const unassignedCards = cards.filter((c) => !c.projectId);
  const projectsWithCards = projects.map((p) => ({
    ...p,
    cards: cards.filter((c) => c.projectId === p.id),
  }));

  const visibleProjects = filter === 'all'
    ? projectsWithCards
    : projectsWithCards.filter((p) => p.id === filter);

  if (!loading && projects.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center rounded-xl border"
        style={{
          borderColor: 'var(--color-border-default)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <Layers size={32} className="mb-3" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          No projects yet
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Set up the six canonical business projects to start organizing your cards.
        </p>
        <button
          onClick={seedDefaults}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-action-primary-bg)',
            color: 'var(--color-action-primary-text)',
          }}
        >
          Set up projects
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className="flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full border transition-colors"
          style={
            filter === 'all'
              ? { backgroundColor: 'var(--color-action-primary-bg)', color: 'var(--color-action-primary-text)', borderColor: 'var(--color-action-primary-bg)' }
              : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-default)' }
          }
        >
          All projects
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter(filter === p.id ? 'all' : p.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors"
            style={
              filter === p.id
                ? { backgroundColor: p.color + '22', color: 'var(--color-text-primary)', borderColor: p.color }
                : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-default)' }
            }
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            {p.title}
          </button>
        ))}
      </div>

      {/* Project columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleProjects.map((p) => (
          <ProjectColumn
            key={p.id}
            project={p}
            cards={p.cards}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
          />
        ))}

        {/* Unassigned column — only show when viewing all */}
        {filter === 'all' && unassignedCards.length > 0 && (
          <ProjectColumn
            project={{ id: null, title: 'Unassigned', color: 'var(--color-text-muted)', slug: 'unassigned' }}
            cards={unassignedCards}
            onCardClick={onCardClick}
            onAddCard={() => {}}
          />
        )}
      </div>
    </div>
  );
}
