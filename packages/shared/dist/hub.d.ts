export type HubRole = "member" | "subscriber" | "staff" | "vendor" | "volunteer" | "guest" | "admin";
export type HubVisibility = "customer" | "household" | "staff" | "vendor" | "volunteer" | "guest" | "admin";
export type HubObjectType = "menu_week" | "event" | "shift" | "prep_task" | "resource" | "note" | "vendor" | "guest_request";
export type HubScheduleStatus = "unscheduled" | "planned" | "time_blocked" | "checked_in" | "completed" | "deferred";
export type HubHorizon = "inbox" | "someday" | "month" | "week" | "today" | "now";
export type HubPlannedObject = {
    id: string;
    type: HubObjectType;
    title: string;
    subtitle?: string | null;
    horizon: HubHorizon;
    visibility: HubVisibility;
    scheduleStatus: HubScheduleStatus;
    source: string;
    startsAt?: string | null;
    endsAt?: string | null;
    spaceId?: string | null;
    objectId?: string | null;
    metadata?: Record<string, unknown> | null;
};
export type HubAction = {
    id: string;
    title: string;
    objectType: HubObjectType;
    objectId: string;
    dueAt?: string | null;
    status: "open" | "blocked" | "done" | "pending_review";
    visibility: HubVisibility;
    source: string;
    metadata?: Record<string, unknown> | null;
};
export type HubThreadSummary = {
    id: string;
    objectType: HubObjectType | string;
    objectId: string;
    title: string;
    visibility: HubVisibility | string;
    unreadCount: number;
    lastMessageAt?: string | null;
    preview?: string | null;
};
export type HubSpace = {
    id: string;
    title: string;
    role: HubRole;
    visibility: HubVisibility;
    unreadCount: number;
    objectCount: number;
};
export type HubCalendarView = "day" | "week" | "month";
export type HubCalendarResponse = {
    ok: true;
    generatedAt: string;
    view: HubCalendarView;
    range: {
        start: string;
        end: string;
    };
    objects: HubPlannedObject[];
};
export type HubSpacesResponse = {
    ok: true;
    generatedAt: string;
    spaces: HubSpace[];
};
export type HubObjectDetailResponse = {
    ok: true;
    generatedAt: string;
    object: HubPlannedObject & {
        detail?: Record<string, unknown> | null;
    };
    actions: HubAction[];
    threads: HubThreadSummary[];
};
export type HubThreadsResponse = {
    ok: true;
    generatedAt: string;
    threads: HubThreadSummary[];
};
export type HubThreadMessage = {
    id: string;
    threadId: string;
    senderId?: string | null;
    senderRole?: string | null;
    body: string;
    attachments?: unknown;
    createdAt: string;
    editedAt?: string | null;
    deletedAt?: string | null;
};
export type HubThreadMessagesResponse = {
    ok: true;
    generatedAt: string;
    thread: HubThreadSummary;
    messages: HubThreadMessage[];
};
export type HubCaptureSuggestion = {
    id: string;
    type: string;
    title: string;
    subtitle?: string | null;
    confidence: number;
    source: string;
};
export type HubCaptureSuggestionsResponse = {
    ok: true;
    generatedAt: string;
    suggestions: HubCaptureSuggestion[];
};
export type HubInboxItem = {
    id: string;
    type: "brain_inbox" | "hub_capture" | string;
    title: string;
    preview?: string | null;
    status: string;
    source: string;
    capturedAt?: string | null;
    objectType?: HubObjectType | string | null;
    objectId?: string | null;
    metadata?: Record<string, unknown> | null;
};
export type HubInboxResponse = {
    ok: true;
    generatedAt: string;
    items: HubInboxItem[];
};
export type HubTodayResponse = {
    ok: true;
    generatedAt: string;
    viewer: {
        supabaseUid: string;
        email: string;
        userId?: string | null;
        customerId?: string | null;
        roles: HubRole[];
        isAdmin: boolean;
    };
    customer?: {
        id: string;
        slug: string;
        name?: string | null;
    } | null;
    summary: {
        criticalChangeCount: number;
        dueActionCount: number;
        unreadThreadCount: number;
        inboxCount?: number;
    };
    actions: HubAction[];
    objects: HubPlannedObject[];
    spaces: HubSpace[];
    threads: HubThreadSummary[];
};
export type HubCaptureIntent = "note" | "task" | "event_change" | "vendor" | "feedback" | "checkin" | "payment" | "resource";
export type HubCaptureRequest = {
    source: string;
    sourceId?: string | null;
    actorId?: string | null;
    actorRole: HubRole | string;
    organizationId?: string | null;
    spaceId?: string | null;
    objectId?: string | null;
    objectType?: HubObjectType | string | null;
    visibility?: HubVisibility | string | null;
    occurredAt?: string | null;
    rawContent: string;
    attachments?: unknown;
    clientCreatedAt?: string | null;
    offlineQueueId?: string | null;
    captureIntent: HubCaptureIntent;
};
export type HubWriteResponse = {
    ok: true;
    generatedAt?: string;
    ledgerEventId?: string | null;
    existing?: boolean;
};
export type HubFeedbackRequest = {
    dishId: string;
    menuWeekId: string;
    thumbsUp: boolean;
    notes?: string | null;
    source?: string;
    sourceId?: string | null;
    occurredAt?: string | null;
};
export type HubFeedbackResponse = HubWriteResponse & {
    feedbackId: string;
};
export type HubPlanRequest = {
    objectType?: HubObjectType | string;
    scheduleStatus?: HubScheduleStatus;
    date?: string;
    startTime?: string | null;
    endTime?: string | null;
    people?: string[];
    enabled?: boolean;
    optional?: boolean;
    note?: string | null;
    source?: string;
    sourceId?: string | null;
    occurredAt?: string | null;
};
export type HubPlanResponse = HubWriteResponse & {
    generatedAt: string;
    object: HubPlannedObject;
};
export type HubCheckinRequest = {
    objectType: HubObjectType | string;
    objectId: string;
    status?: "checked_in" | "completed" | "acknowledged" | string;
    note?: string | null;
    source?: string;
    sourceId?: string | null;
    occurredAt?: string | null;
    offlineQueueId?: string | null;
};
export type HubCheckinResponse = HubWriteResponse & {
    checkinId?: string | null;
};
