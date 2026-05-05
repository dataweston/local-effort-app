import type {
  HubCalendarResponse,
  HubCaptureRequest,
  HubCheckinRequest,
  HubCheckinResponse,
  HubFeedbackRequest,
  HubFeedbackResponse,
  HubInboxResponse,
  HubPlanRequest,
  HubPlanResponse,
  HubSpacesResponse,
  HubTodayResponse,
} from "@local-effort/shared";

type HubClientOptions = {
  baseUrl: string;
  accessToken: string;
};

type JsonBody = Record<string, unknown> | undefined;

async function request<T>(
  { baseUrl, accessToken }: HubClientOptions,
  path: string,
  options: { method?: string; body?: JsonBody } = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || `Hub request failed: ${response.status}`);
  }
  return json as T;
}

export function createHubClient(options: HubClientOptions) {
  return {
    today: () => request<HubTodayResponse>(options, "/api/hub/today"),
    calendar: (view: "day" | "week" | "month" = "week", date?: string) => {
      const params = new URLSearchParams({ view });
      if (date) params.set("date", date);
      return request<HubCalendarResponse>(options, `/api/hub/calendar?${params.toString()}`);
    },
    inbox: () => request<HubInboxResponse>(options, "/api/hub/inbox"),
    spaces: () => request<HubSpacesResponse>(options, "/api/hub/spaces"),
    capture: (body: HubCaptureRequest) =>
      request<{ ok: true; captureId?: string | null; ledgerEventId?: string | null }>(
        options,
        "/api/hub/capture",
        { method: "POST", body: body as unknown as JsonBody },
      ),
    feedback: (body: HubFeedbackRequest) =>
      request<HubFeedbackResponse>(options, "/api/hub/feedback", {
        method: "POST",
        body: body as unknown as JsonBody,
      }),
    planObject: (objectId: string, body: HubPlanRequest) =>
      request<HubPlanResponse>(options, `/api/hub/objects/${encodeURIComponent(objectId)}/plan`, {
        method: "POST",
        body: body as unknown as JsonBody,
      }),
    checkin: (body: HubCheckinRequest) =>
      request<HubCheckinResponse>(options, "/api/hub/checkins", {
        method: "POST",
        body: body as unknown as JsonBody,
      }),
  };
}
