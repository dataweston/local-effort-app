import type {
  HubCalendarResponse,
  HubInboxResponse,
  HubSpacesResponse,
  HubThreadMessagesResponse,
  HubTodayResponse,
} from "@local-effort/shared";

const generatedAt = "2026-05-05T18:00:00.000Z";

export const todayFixture: HubTodayResponse = {
  ok: true,
  generatedAt,
  viewer: {
    supabaseUid: "fixture-user",
    email: "weston@example.com",
    userId: "user_fixture",
    customerId: "customer_household",
    roles: ["admin", "subscriber", "staff"],
    isAdmin: true,
  },
  customer: {
    id: "customer_household",
    slug: "walker-household",
    name: "Walker Household",
  },
  summary: {
    criticalChangeCount: 1,
    dueActionCount: 4,
    unreadThreadCount: 2,
    inboxCount: 3,
  },
  actions: [
    {
      id: "menu-week:fixture:order",
      title: "Choose this week menu",
      objectType: "menu_week",
      objectId: "menu_week_fixture",
      dueAt: "2026-05-07T22:00:00.000Z",
      status: "open",
      visibility: "customer",
      source: "weekly_order",
      metadata: { itemCount: 9 },
    },
    {
      id: "planner_card:prep-1:plan",
      title: "Decide on extra prep block",
      objectType: "prep_task",
      objectId: "prep-1",
      dueAt: "2026-05-05T20:00:00.000Z",
      status: "open",
      visibility: "staff",
      source: "weekly_planner",
      metadata: { cardId: "prep-1" },
    },
    {
      id: "dish:greens:feedback:fixture",
      title: "Rate spring greens",
      objectType: "menu_week",
      objectId: "menu_week_fixture",
      status: "open",
      visibility: "customer",
      source: "weekly_order_feedback",
      metadata: { dishId: "greens" },
    },
  ],
  objects: [
    {
      id: "menu_week:menu_week_fixture",
      type: "menu_week",
      title: "Weekly menu: May 4 - May 10",
      subtitle: "9 visible dishes",
      horizon: "today",
      visibility: "customer",
      scheduleStatus: "time_blocked",
      source: "subscriber_portal",
      startsAt: "2026-05-04T05:00:00.000Z",
      endsAt: "2026-05-07T22:00:00.000Z",
      objectId: "menu_week_fixture",
      metadata: {
        dishes: ["Spring greens", "Herby chicken", "Rhubarb oat bars"],
      },
    },
    {
      id: "planner_card:prep-1",
      type: "prep_task",
      title: "NEON prep reset",
      subtitle: "Weston, Maria",
      horizon: "today",
      visibility: "staff",
      scheduleStatus: "time_blocked",
      source: "weekly_planner",
      startsAt: "2026-05-05T20:00:00.000Z",
      endsAt: "2026-05-05T22:00:00.000Z",
      objectId: "prep-1",
      metadata: { zone: "prep", people: ["Weston", "Maria"] },
    },
    {
      id: "planner_card:shift-1",
      type: "shift",
      title: "Delivery window",
      subtitle: "Catherine",
      horizon: "now",
      visibility: "staff",
      scheduleStatus: "checked_in",
      source: "weekly_planner",
      startsAt: "2026-05-05T23:00:00.000Z",
      endsAt: "2026-05-06T01:00:00.000Z",
      objectId: "shift-1",
      metadata: { people: ["Catherine"] },
    },
  ],
  spaces: [
    {
      id: "admin:operations",
      title: "Operations",
      role: "admin",
      visibility: "admin",
      unreadCount: 2,
      objectCount: 7,
    },
    {
      id: "customer:customer_household",
      title: "Walker Household",
      role: "subscriber",
      visibility: "household",
      unreadCount: 0,
      objectCount: 3,
    },
  ],
  threads: [
    {
      id: "thread-menu",
      objectType: "menu_week",
      objectId: "menu_week_fixture",
      title: "Weekly menu thread",
      visibility: "customer",
      unreadCount: 1,
      lastMessageAt: "2026-05-05T15:00:00.000Z",
      preview: "Maria adjusted the herb sauce and marked the allergen note.",
    },
    {
      id: "thread-ops",
      objectType: "prep_task",
      objectId: "prep-1",
      title: "Prep reset",
      visibility: "staff",
      unreadCount: 1,
      lastMessageAt: "2026-05-05T16:30:00.000Z",
      preview: "Need one more cambro before the evening pack.",
    },
  ],
};

export const calendarFixture: HubCalendarResponse = {
  ok: true,
  generatedAt,
  view: "week",
  range: {
    start: "2026-05-04",
    end: "2026-05-10",
  },
  objects: todayFixture.objects,
};

export const spacesFixture: HubSpacesResponse = {
  ok: true,
  generatedAt,
  spaces: todayFixture.spaces,
};

export const inboxFixture: HubInboxResponse = {
  ok: true,
  generatedAt,
  items: [
    {
      id: "hub_capture:vendor-note",
      type: "hub_capture",
      title: "Confirm NEON storage labels",
      preview: "Ask NEON whether the new shelf labels should include production dates.",
      status: "captured",
      source: "mobile",
      capturedAt: "2026-05-05T14:40:00.000Z",
      objectType: "resource",
      objectId: "neon-storage",
      metadata: { captureIntent: "task" },
    },
    {
      id: "brain_inbox:admin-1",
      type: "brain_inbox",
      title: "New customer referral",
      preview: "Hold until current subscribers are stable in the new kitchen.",
      status: "pending",
      source: "hub_capture",
      capturedAt: "2026-05-05T13:20:00.000Z",
      metadata: { reviewRequired: true },
    },
  ],
};

export const threadMessagesFixture: HubThreadMessagesResponse = {
  ok: true,
  generatedAt,
  thread: todayFixture.threads[0],
  messages: [
    {
      id: "message-1",
      threadId: "thread-menu",
      senderId: "user_fixture",
      senderRole: "staff",
      body: "Menu visibility looks good for the household.",
      createdAt: "2026-05-05T14:55:00.000Z",
    },
    {
      id: "message-2",
      threadId: "thread-menu",
      senderId: "maria",
      senderRole: "staff",
      body: "Herb sauce note is updated.",
      createdAt: "2026-05-05T15:00:00.000Z",
    },
  ],
};
