import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DollarSign,
  ExternalLink,
  Heart,
  Link2,
  MapPin,
  Plus,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { formatDateFull, getToday } from './dateUtils';
import { money } from './financials';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import {
  CONFIRMED_EVENT_STATUSES,
  capacityAssessment,
  displayWorkBlocks,
  evidenceHref,
  evidenceReferences,
  workBlockSyncLabel,
} from './plannerOperations';

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All events' },
];
const COMPLETED_STATUSES = new Set(['completed', 'done']);
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'void']);

function eventStatus(card) {
  return String(card.status || 'inquiry').toLowerCase();
}

function laneState(block) {
  if (block.syncStatus === 'error') return 'error';
  if (block.status === 'needs_schedule') return 'attention';
  if (block.status === 'cancelled') return 'inactive';
  if (block.status === 'completed') return 'complete';
  if (block.syncStatus === 'synced') return 'synced';
  return 'pending';
}

function WorkLane({ block }) {
  const prep = block.blockType === 'prep';
  const Icon = prep ? UtensilsCrossed : CalendarCheck2;
  const time = block.date
    ? `${formatDateFull(block.date)}${block.startTime && block.endTime ? ` · ${block.startTime}–${block.endTime}` : ' · time not recorded'}`
    : 'Date and time needed';

  return (
    <div className="planner-work-lane" data-state={laneState(block)}>
      <div className="planner-work-lane__head">
        <span className="planner-work-lane__kind">
          <Icon size={13} />
          {prep ? 'Prep' : 'Service'}
        </span>
        <span className="planner-work-lane__sync">{workBlockSyncLabel(block)}</span>
      </div>
      <strong>{time}</strong>
      {block.location && (
        <span className="planner-work-lane__location">
          <MapPin size={11} />
          {block.location}
        </span>
      )}
      {block.syncError && <span className="planner-work-lane__error">{block.syncError}</span>}
    </div>
  );
}

function CapacityTile({ assessment }) {
  return (
    <div className="planner-operation-tile" data-state={assessment.state}>
      <span className="planner-operation-tile__label">
        {assessment.state === 'review' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
        Capacity provenance
      </span>
      <strong>{assessment.label}</strong>
      <span>{assessment.detail}</span>
      {assessment.overlaps.length > 0 && (
        <span className="planner-operation-tile__foot">
          With{' '}
          {assessment.overlaps.map((block) => `${block.title} (${block.blockType})`).join(', ')}
        </span>
      )}
    </div>
  );
}

function EvidenceTile({ card }) {
  const metadata = card.financialMetadata || {};
  const references = evidenceReferences(card);
  const source = card.financialSource || metadata.captureSource || null;
  return (
    <div
      className="planner-operation-tile"
      data-state={references.length ? 'evidenced' : 'unknown'}
    >
      <span className="planner-operation-tile__label">
        <Link2 size={13} />
        Source provenance
      </span>
      <strong>
        {references.length
          ? `${references.length} source reference${references.length === 1 ? '' : 's'}`
          : 'No source reference'}
      </strong>
      <span>
        {source
          ? `Recorded via ${String(source).replaceAll('_', ' ')}`
          : 'Add a source before treating details as verified'}
      </span>
      {metadata.clientName && (
        <span className="planner-operation-tile__foot">Client: {metadata.clientName}</span>
      )}
    </div>
  );
}

function EvidenceDetails({ card }) {
  const metadata = card.financialMetadata || {};
  const references = evidenceReferences(card);
  const questions = Array.isArray(metadata.openQuestions)
    ? metadata.openQuestions.filter(Boolean)
    : [];
  return (
    <details className="planner-event-details">
      <summary>
        <span>Notes, evidence and provenance</span>
        <ChevronDown size={14} />
      </summary>
      <div className="planner-event-details__body">
        <div>
          <span className="planner-event-details__label">Operational notes</span>
          <p>{card.notes || 'No operational notes recorded.'}</p>
        </div>
        <div>
          <span className="planner-event-details__label">Financial basis</span>
          <p>
            {card.financialSource
              ? String(card.financialSource).replaceAll('_', ' ')
              : 'No financial source recorded.'}
          </p>
        </div>
        <div>
          <span className="planner-event-details__label">Evidence</span>
          {references.length ? (
            <ul>
              {references.map((reference) => {
                const href = evidenceHref(reference);
                return (
                  <li key={reference}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        {reference}
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      reference
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No evidence references recorded.</p>
          )}
        </div>
        {questions.length > 0 && (
          <div>
            <span className="planner-event-details__label">Open questions</span>
            <ul>
              {questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function EmptyEvents({ filter, hasEvents }) {
  const copy = !hasEvents
    ? ['No events yet', 'Add the next service date, then give prep its own work window.']
    : filter === 'attention'
      ? [
          'Nothing needs attention',
          'Every visible event has enough recorded detail to move forward.',
        ]
      : filter === 'completed'
        ? ['Nothing completed yet', 'Completed and cancelled events will collect here.']
        : ['No events in this view', 'Try another filter or add the next event.'];
  return (
    <div className="planner-events-empty">
      <Heart size={28} aria-hidden="true" />
      <strong>{copy[0]}</strong>
      <span>{copy[1]}</span>
    </div>
  );
}

export function EventsView({ planner, selectedDate, accessToken = null }) {
  const [filter, setFilter] = useState('upcoming');
  const today = getToday();
  const allEvents = useMemo(
    () =>
      planner.cards
        .filter((card) => card.objectType === 'event')
        .sort(
          (a, b) =>
            String(a.date || '').localeCompare(String(b.date || '')) ||
            String(a.startTime || '').localeCompare(String(b.startTime || ''))
        ),
    [planner.cards]
  );
  const workBlocks = useMemo(
    () => displayWorkBlocks(allEvents, planner.workBlocks),
    [allEvents, planner.workBlocks]
  );
  const operations = useMemo(
    () =>
      allEvents.map((card) => {
        const cardBlocks = workBlocks.filter((block) => block.plannerCardId === String(card.id));
        const capacity = capacityAssessment(card.id, workBlocks);
        const status = eventStatus(card);
        const needsAttention =
          !COMPLETED_STATUSES.has(status) &&
          !CANCELLED_STATUSES.has(status) &&
          (!CONFIRMED_EVENT_STATUSES.has(status) ||
            cardBlocks.some(
              (block) => block.status === 'needs_schedule' || block.syncStatus === 'error'
            ) ||
            capacity.state === 'review' ||
            capacity.state === 'unknown');
        return { card, cardBlocks, capacity, status, needsAttention };
      }),
    [allEvents, workBlocks]
  );

  const visible = operations.filter(({ card, status, needsAttention }) => {
    if (filter === 'all') return true;
    if (filter === 'attention') return card.date >= today && needsAttention;
    if (filter === 'completed')
      return COMPLETED_STATUSES.has(status) || CANCELLED_STATUSES.has(status);
    return card.date >= today && !COMPLETED_STATUSES.has(status) && !CANCELLED_STATUSES.has(status);
  });
  const futureOperations = operations.filter(
    ({ card, status }) => card.date >= today && !CANCELLED_STATUSES.has(status)
  );
  const confirmedCount = futureOperations.filter(({ status }) =>
    CONFIRMED_EVENT_STATUSES.has(status)
  ).length;
  const expectedRevenue = futureOperations.reduce(
    (sum, { card }) => sum + Number(card.revenue || 0),
    0
  );
  const attentionCount = futureOperations.filter(({ needsAttention }) => needsAttention).length;
  const syncedCount = workBlocks.filter(
    (block) => block.syncStatus === 'synced' && block.date >= today
  ).length;
  const syncTo = futureOperations.at(-1)?.card.date || today;

  return (
    <div className="planner-events-view">
      <header className="planner-events-header">
        <div>
          <span className="planner-eyebrow">Event operations</span>
          <h2>Prep and service, one honest timeline</h2>
          <p>
            Capacity is based only on recorded work windows. Missing times stay unknown instead of
            appearing available.
          </p>
        </div>
        <div className="planner-events-actions">
          {accessToken && (
            <GoogleCalendarSync
              accessToken={accessToken}
              from={today}
              to={syncTo}
              label="Repair calendar"
              onSynced={planner.handlers.handleCalendarSyncResult}
            />
          )}
          <button
            type="button"
            className="planner-button is-active inline-flex items-center gap-1.5"
            onClick={() => planner.handlers.handleAddCard(selectedDate || today, 'event')}
          >
            <Plus size={14} />
            Add event
          </button>
        </div>
      </header>

      <section className="planner-events-metrics" aria-label="Upcoming event summary">
        <div>
          <span>Confirmed services</span>
          <strong>{confirmedCount}</strong>
        </div>
        <div>
          <span>Expected revenue</span>
          <strong>${money(expectedRevenue)}</strong>
        </div>
        <div data-state={attentionCount ? 'attention' : 'clear'}>
          <span>Needs attention</span>
          <strong>{attentionCount}</strong>
        </div>
        <div>
          <span>Calendar blocks synced</span>
          <strong>{syncedCount}</strong>
        </div>
      </section>

      <nav className="planner-event-filters" aria-label="Event filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? 'is-active' : ''}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            {item.id === 'attention' && attentionCount > 0 ? ` ${attentionCount}` : ''}
          </button>
        ))}
      </nav>

      <div className="planner-event-stack">
        {visible.map(({ card, cardBlocks, capacity, status, needsAttention }) => {
          const prep = cardBlocks.find((block) => block.blockType === 'prep');
          const service = cardBlocks.find((block) => block.blockType === 'service');
          const metadata = card.financialMetadata || {};
          return (
            <article
              key={card.id}
              className="planner-event-operation"
              data-status={needsAttention ? 'attention' : status}
            >
              <div className="planner-event-operation__summary">
                <div className="planner-event-date">
                  <CalendarCheck2 size={15} />
                  <span>{formatDateFull(card.date)}</span>
                  {card.startTime && (
                    <small>
                      <Clock3 size={11} />
                      {card.startTime}
                      {card.endTime ? `–${card.endTime}` : ''}
                    </small>
                  )}
                </div>
                <div className="planner-event-title">
                  <div>
                    <h3>{card.title}</h3>
                    <span className="planner-event-status">{status.replaceAll('_', ' ')}</span>
                  </div>
                  <div className="planner-event-facts">
                    {metadata.location && (
                      <span>
                        <MapPin size={11} />
                        {metadata.location}
                      </span>
                    )}
                    {metadata.guestEstimate != null && (
                      <span>
                        <Users size={11} />
                        {metadata.guestEstimate} guests
                      </span>
                    )}
                    {card.people?.length > 0 && (
                      <span>
                        <Users size={11} />
                        {card.people.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="planner-event-price">
                  <DollarSign size={14} />
                  <strong>{card.revenue > 0 ? money(card.revenue) : 'TBD'}</strong>
                </div>
              </div>

              <div className="planner-work-map" aria-label={`Work blocks for ${card.title}`}>
                {prep && <WorkLane block={prep} />}
                {service && <WorkLane block={service} />}
              </div>

              <div className="planner-operation-tiles">
                <CapacityTile assessment={capacity} />
                <EvidenceTile card={card} />
              </div>

              <div className="planner-event-operation__footer">
                <EvidenceDetails card={card} />
                <button
                  type="button"
                  className="planner-event-edit"
                  onClick={() => planner.handlers.handleCardClick(card)}
                >
                  Edit event
                </button>
              </div>
            </article>
          );
        })}
        {visible.length === 0 && <EmptyEvents filter={filter} hasEvents={allEvents.length > 0} />}
        {visible.length > 0 &&
          visible.every(
            ({ status }) => COMPLETED_STATUSES.has(status) || CANCELLED_STATUSES.has(status)
          ) && (
            <div className="planner-events-complete">
              <Heart size={17} aria-hidden="true" />
              Everything in this view is served or closed.
            </div>
          )}
      </div>
    </div>
  );
}
