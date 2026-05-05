import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Home,
  ListChecks,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import '../styles/native-mobile-hub.css';

const references = [
  { name: 'Lark', note: 'chat becomes tasks, approvals, schedules, and docs' },
  { name: 'Amazing Marvin', note: 'task funnel from inbox/backlog to week, today, and now' },
  { name: 'Morgen', note: 'calendar-first planning with reusable frames for real work' },
  { name: 'Akiflow', note: 'inbox capture, daily rituals, time blocking, mobile calendar execution' },
  { name: 'Cinny', note: 'spaces and rooms for gated conversations' },
  { name: 'Heartbeat', note: 'events, memberships, docs, access groups, workflows' },
];

const portalMap = [
  ['This Week', 'Today: current menu, cutoff, shifts, and upcoming events'],
  ['Past Menus', 'History: menus, RSVPs, attendance, feedback, and notes'],
  ['Dish Feedback', 'Object feedback: dishes, events, resources, and shifts'],
  ['Note to Chef', 'Private thread routed to the right staff space'],
  ['Linked Accounts', 'Household, customer, staff, vendor, and guest roles'],
];

const plannerMap = [
  ['Daily / Weekly / Monthly', 'Native calendar horizons for menus, prep, pickup, service, and staff work'],
  ['Brain Inbox', 'Fast capture for notes, tasks, vendors, guests, and schedule changes'],
  ['Google Calendar Sync', 'Calendar interoperability, reminders, busy/free state, and event export'],
  ['Recurring Changes', 'Recurring menu, prep, event, and shift changes with explicit confirmation'],
  ['Financial Totals', 'Capacity signals: labor, COGS, revenue, and operational consequence'],
];

const graphCapture = [
  ['Ledger first', 'Every capture writes the observed source event before changing graph state'],
  ['Context envelope', 'Actor, role, space, object, visibility, time, source, and attachment metadata'],
  ['Search before create', 'Canonical names, aliases, and semantic search reduce duplicate entities'],
  ['Provisional facts', 'Uncertain extractions wait for review before becoming trusted assertions'],
];

const funnelSteps = [
  ['Inbox', 'capture'],
  ['Week', 'plan'],
  ['Today', 'commit'],
  ['Now', 'execute'],
];

const scheduleBlocks = [
  { time: '9:00', title: 'Menu cutoff review', meta: 'Admin frame', tone: 'gold' },
  { time: '1:30', title: 'Prep list batch', meta: 'Staff frame', tone: 'green' },
  { time: '4:00', title: 'Pickup crew check-in', meta: 'Shift object', tone: 'brick' },
  { time: '6:30', title: 'Supper club service', meta: 'Event object', tone: 'blue' },
];

const todayTasks = [
  {
    title: 'Choose two add-ons',
    meta: 'Weekly Meal Prep / May 11',
    status: 'due 8 PM',
    tone: 'gold',
  },
  {
    title: 'Process Brain Inbox note',
    meta: 'Vendor request needs triage',
    status: 'inbox',
    tone: 'blue',
  },
  {
    title: 'Rate last week salad',
    meta: 'Feedback helps menu planning',
    status: 'feedback',
    tone: 'green',
  },
];

const spaces = [
  {
    title: 'Subscriber household',
    meta: 'Orders, history, chef notes',
    status: 'private',
    tone: 'green',
  },
  {
    title: 'VIP supper club',
    meta: 'Events, RSVP, social thread',
    status: 'shared',
    tone: 'blue',
  },
  {
    title: 'Pickup crew',
    meta: 'Shift claim and check-in',
    status: 'staff',
    tone: 'brick',
  },
];

const threads = [
  {
    title: 'Chef note / May 11 menu',
    meta: 'Kara: Can we avoid cilantro this week?',
    status: '2',
    tone: 'gold',
  },
  {
    title: 'Event / Friday prep',
    meta: 'Maya moved dough prep to 3:30 PM',
    status: 'new',
    tone: 'brick',
  },
];

const eventTasks = [
  {
    title: 'Time-block prep crew',
    meta: 'Drag from Week into 1:30 PM frame',
    status: 'plan',
    tone: 'brick',
  },
  {
    title: 'Acknowledge allergy SOP',
    meta: 'Required before check-in',
    status: 'due',
    tone: 'gold',
  },
  {
    title: 'Bring dessert menu live',
    meta: 'Admin approval pending',
    status: 'approval',
    tone: 'blue',
  },
];

const eventRooms = [
  {
    title: 'Event / Friday Dinner',
    meta: 'Main thread tied to this event object',
    status: '8',
    tone: 'green',
  },
  {
    title: 'Guests / Patio lounge',
    meta: 'Shared social room for confirmed guests',
    status: '21',
    tone: 'blue',
  },
  {
    title: 'Staff / Run-of-show',
    meta: 'Private operations room',
    status: '5',
    tone: 'brick',
  },
];

const tabs = [
  { label: 'Today', icon: Home },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Spaces', icon: UsersRound },
  { label: 'Threads', icon: MessageSquareText },
  { label: 'Profile', icon: UserRound },
];

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`nmh-pill is-${tone}`}>{children}</span>;
}

function RowItem({ item, icon: Icon = CheckCircle2 }) {
  return (
    <div className="nmh-row-item">
      <span>
        <strong>{item.title}</strong>
        <small>{item.meta}</small>
      </span>
      <StatusPill tone={item.tone}>{item.status}</StatusPill>
      {Icon && <Icon className="nmh-row-icon" size={16} aria-hidden="true" />}
    </div>
  );
}

function FunnelCard() {
  return (
    <section className="nmh-card">
      <div className="nmh-card-head">
        <ListChecks size={17} aria-hidden="true" />
        <h3>Task funnel</h3>
      </div>
      <div className="nmh-funnel-list">
        {funnelSteps.map(([label, meta], index) => (
          <div key={label} className="nmh-funnel-step">
            <span>{label}</span>
            <small>{meta}</small>
            {index < funnelSteps.length - 1 && <i aria-hidden="true" />}
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarStack() {
  return (
    <div className="nmh-calendar-stack">
      {scheduleBlocks.map((block) => (
        <div key={`${block.time}-${block.title}`} className={`nmh-time-block is-${block.tone}`}>
          <span className="nmh-time-label">{block.time}</span>
          <div>
            <strong>{block.title}</strong>
            <small>{block.meta}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function IphonePreview() {
  return (
    <section className="nmh-device-card" aria-label="iPhone native app preview">
      <div className="nmh-device-title">
        <span>Role preview</span>
        <span>member mode shown on iPhone frame</span>
      </div>
      <div className="nmh-phone nmh-iphone">
        <div className="nmh-screen">
          <div className="nmh-ios-status">
            <span>9:41</span>
            <span>LTE 100%</span>
          </div>

          <header className="nmh-ios-header">
            <div className="nmh-ios-nav-row">
              <button type="button" className="nmh-link-button">
                <ChevronLeft size={16} aria-hidden="true" />
                Local Effort
              </button>
              <button type="button" className="nmh-avatar-button" aria-label="Profile">
                ML
              </button>
            </div>
            <h2>Today</h2>
            <div className="nmh-segment" aria-label="Today view mode">
              <button type="button" className="is-active">Now</button>
              <button type="button">Plan</button>
              <button type="button">History</button>
            </div>
          </header>

          <div className="nmh-phone-scroll">
            <article className="nmh-hero-card">
              <span className="nmh-kicker">Next up</span>
              <h3>Weekly menu closes tonight</h3>
              <p>Current subscriber portal behavior becomes a native daily action surface.</p>
              <div className="nmh-chip-row">
                <StatusPill tone="green">subscriber</StatusPill>
                <StatusPill tone="gold">due 8:00 PM</StatusPill>
                <StatusPill tone="blue">chef thread open</StatusPill>
              </div>
            </article>

            <FunnelCard />

            <section className="nmh-card">
              <div className="nmh-card-head">
                <ListChecks size={17} aria-hidden="true" />
                <h3>Action list</h3>
              </div>
              <div className="nmh-list">
                {todayTasks.map((item) => (
                  <RowItem key={item.title} item={item} />
                ))}
              </div>
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <CalendarDays size={17} aria-hidden="true" />
                <h3>Schedule spine</h3>
              </div>
              <CalendarStack />
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <ShieldCheck size={17} aria-hidden="true" />
                <h3>Spaces</h3>
              </div>
              <div className="nmh-list">
                {spaces.map((item) => (
                  <RowItem key={item.title} item={item} icon={null} />
                ))}
              </div>
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <MessageSquareText size={17} aria-hidden="true" />
                <h3>Threads</h3>
              </div>
              <div className="nmh-list">
                {threads.map((item) => (
                  <RowItem key={item.title} item={item} icon={null} />
                ))}
              </div>
            </section>
          </div>

          <nav className="nmh-ios-tabs" aria-label="iPhone tabs">
            {tabs.map(({ label, icon: Icon }, index) => (
              <button key={label} type="button" className={index === 0 ? 'is-active' : ''}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="nmh-ios-home-indicator" />
        </div>
      </div>
    </section>
  );
}

function AndroidPreview() {
  return (
    <section className="nmh-device-card" aria-label="Android native app preview">
      <div className="nmh-device-title">
        <span>Role preview</span>
        <span>operator mode shown on Android frame</span>
      </div>
      <div className="nmh-phone nmh-android">
        <div className="nmh-screen">
          <div className="nmh-android-status">
            <span>9:41</span>
            <span>5G 100%</span>
          </div>

          <header className="nmh-material-appbar">
            <button type="button" className="nmh-material-icon" aria-label="Open menu">
              <Menu size={19} aria-hidden="true" />
            </button>
            <div>
              <span>Weekly planner</span>
              <h2>Friday Ops</h2>
            </div>
            <button type="button" className="nmh-material-icon" aria-label="Search">
              <Search size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="nmh-material-filters" aria-label="Android object tabs">
            <StatusPill tone="green">Overview</StatusPill>
            <StatusPill>RSVP</StatusPill>
            <StatusPill>Threads</StatusPill>
            <StatusPill>Resources</StatusPill>
          </div>

          <div className="nmh-phone-scroll">
            <article className="nmh-hero-card">
              <span className="nmh-kicker">Calendar object</span>
              <h3>Prep, pickup, service, and check-in</h3>
              <p>WeeklyDemoPage becomes the operator calendar: daily/weekly/monthly views, recurring changes, capacity signals, and inbox triage.</p>
              <div className="nmh-chip-row">
                <StatusPill tone="blue">week view</StatusPill>
                <StatusPill tone="green">$1.8k net</StatusPill>
                <StatusPill tone="gold">4 inbox</StatusPill>
              </div>
            </article>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <CalendarDays size={17} aria-hidden="true" />
                <h3>Time blocks</h3>
              </div>
              <CalendarStack />
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <Clock3 size={17} aria-hidden="true" />
                <h3>Object tasks</h3>
              </div>
              <div className="nmh-list">
                {eventTasks.map((item) => (
                  <RowItem key={item.title} item={item} icon={null} />
                ))}
              </div>
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <FileText size={17} aria-hidden="true" />
                <h3>Planner translation</h3>
              </div>
              <div className="nmh-list">
                {plannerMap.slice(1, 4).map(([from, to]) => (
                  <RowItem
                    key={from}
                    item={{
                      title: from,
                      meta: to,
                      status: 'ops',
                      tone: 'blue',
                    }}
                    icon={null}
                  />
                ))}
              </div>
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <Search size={17} aria-hidden="true" />
                <h3>Context graph</h3>
              </div>
              <div className="nmh-list">
                {graphCapture.slice(0, 3).map(([title, text]) => (
                  <RowItem
                    key={title}
                    item={{
                      title,
                      meta: text,
                      status: 'graph',
                      tone: 'green',
                    }}
                    icon={null}
                  />
                ))}
              </div>
            </section>

            <section className="nmh-card">
              <div className="nmh-card-head">
                <UsersRound size={17} aria-hidden="true" />
                <h3>Rooms</h3>
              </div>
              <div className="nmh-list">
                {eventRooms.map((item) => (
                  <RowItem key={item.title} item={item} icon={null} />
                ))}
              </div>
            </section>
          </div>

          <button type="button" className="nmh-fab" aria-label="Quick capture">
            <Plus size={24} aria-hidden="true" />
          </button>

          <nav className="nmh-android-nav" aria-label="Android navigation">
            {tabs.slice(0, 4).map(({ label, icon: Icon }, index) => (
              <button key={label} type="button" className={index === 0 ? 'is-active' : ''}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

function ProductPanel() {
  return (
    <aside className="nmh-product-panel">
      <section>
        <div className="nmh-panel-title-row">
          <Sparkles size={18} aria-hidden="true" />
          <h2>The product overlap</h2>
        </div>
        <p>
          The current subscriber portal is already a gated relationship app. Native mobile generalizes it from weekly meals into recurring real-world groups.
        </p>
      </section>

      <section>
        <h3>Subscriber portal becomes</h3>
        <div className="nmh-map-list">
          {portalMap.map(([from, to]) => (
            <div key={from} className="nmh-map-row">
              <strong>{from}</strong>
              <span>{to}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Weekly planner becomes</h3>
        <div className="nmh-map-list">
          {plannerMap.map(([from, to]) => (
            <div key={from} className="nmh-map-row">
              <strong>{from}</strong>
              <span>{to}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Brain graph capture</h3>
        <div className="nmh-reference-list">
          {graphCapture.map(([title, text]) => (
            <div key={title} className="nmh-reference-row">
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Reference translation</h3>
        <div className="nmh-reference-list">
          {references.map((reference) => (
            <div key={reference.name} className="nmh-reference-row">
              <strong>{reference.name}</strong>
              <span>{reference.note}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function ProposalPanel() {
  const flows = [
    ['Capture', 'Brain Inbox and mobile quick-add collect notes, requests, tasks, vendors, and event changes.'],
    ['Plan', 'Month, Week, Today, and Now narrow work without showing every possible task at once.'],
    ['Calendar', 'Beautiful day/week/month schedule with operational frames for prep, pickup, service, and admin.'],
    ['Object detail', 'Menu week, event, shift, resource, thread, RSVP, check-in.'],
    ['Access', 'Household, VIP, staff, vendor, volunteer, guest, and admin visibility on every object.'],
  ];

  return (
    <aside className="nmh-proposal-panel">
      <div className="nmh-proposal-head">
        <h2>Build direction</h2>
        <p>One React Native app with feature parity across iPhone and Android. Access changes by role, not by platform.</p>
      </div>
      <div className="nmh-flow-list">
        {flows.map(([title, text], index) => (
          <div key={title} className="nmh-flow-step">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="nmh-next-card">
        <CalendarDays size={18} aria-hidden="true" />
        <div>
          <strong>First connected slice</strong>
          <p>Connect Today and Calendar to real portal/planner data: active menu week, Brain Inbox, feedback due, chef-note thread, schedule cards, and order cutoff.</p>
        </div>
      </div>
    </aside>
  );
}

export default function NativeMobileHubPage() {
  return (
    <>
      <Helmet>
        <title>Native Mobile Hub Preview | Local Effort</title>
        <meta
          name="description"
          content="Native iPhone and Android preview for a gated community and operations hub built from the subscriber portal model."
        />
      </Helmet>
      <div className="nmh-page">
        <header className="nmh-page-head">
          <div>
            <span className="nmh-eyebrow">Native MVP</span>
            <h1>iPhone and Android community hub</h1>
            <p>
              A native mobile version of the subscriber portal and weekly planner, expanded into capture, calendar, tasks, spaces, threads, and profile for customers, staff, vendors, guests, and community members.
            </p>
            <p>
              The two device frames show two roles in the same product. Both iPhone and Android get the same core workflows.
            </p>
          </div>
          <div className="nmh-head-actions">
            <button type="button">
              <Bell size={16} aria-hidden="true" />
              Critical updates
            </button>
            <button type="button">
              <Plus size={16} aria-hidden="true" />
              Quick capture
            </button>
          </div>
        </header>

        <main className="nmh-stage">
          <ProductPanel />
          <IphonePreview />
          <AndroidPreview />
          <ProposalPanel />
        </main>
      </div>
    </>
  );
}
