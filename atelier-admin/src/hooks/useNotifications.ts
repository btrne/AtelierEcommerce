"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { notifications as api } from "@/lib/api";
import type { NotificationDto } from "@/lib/types";

const READ_STORAGE_KEY = "admin_read_notifications";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

export function useNotifications() {
  const [list, setList] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const readIds = useRef<Set<string>>(getReadIds());
  const eventSource = useRef<EventSource | null>(null);

  const unreadCount = list.filter((n) => !readIds.current.has(n.id)).length;

  // Fetch recent on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .recent()
      .then((data) => setList(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // SSE connection
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const url = `${API_BASE}/admin/notifications/stream?access_token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const notification: NotificationDto = JSON.parse(event.data);
        setList((prev) => [notification, ...prev]);
      } catch {
        // ignore malformed data
      }
    };

    source.onerror = () => {
      // EventSource will auto-reconnect on its own
    };

    eventSource.current = source;

    return () => {
      source.close();
      eventSource.current = null;
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    readIds.current.add(id);
    saveReadIds(readIds.current);
    setList((prev) => [...prev]);
  }, []);

  const markAllAsRead = useCallback(() => {
    list.forEach((n) => readIds.current.add(n.id));
    saveReadIds(readIds.current);
    setList((prev) => [...prev]);
  }, [list]);

  return {
    notifications: list,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
