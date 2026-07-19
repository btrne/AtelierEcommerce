const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

function getProfile(): { id: number } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("customer_profile");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("session_id");
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("customer_token");
}

export function track(
  eventType: string,
  entityType?: string | null,
  entityId?: number | null,
  data?: Record<string, unknown> | null,
) {
  const body: Record<string, unknown> = {
    eventType,
    sessionId: getSessionId(),
    entityType: entityType || null,
    entityId: entityId ?? null,
    data: data ? JSON.stringify(data) : null,
  };

  const profile = getProfile();
  if (profile) {
    body.userId = profile.id;
  }

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  fetch(`${API_BASE}/tracking/event`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).catch(() => {});
}
