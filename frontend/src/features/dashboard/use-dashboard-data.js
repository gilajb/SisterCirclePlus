"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { decodePayload } from "@/lib/auth";

/**
 * Loads everything the dashboard shows.
 *
 * /api/symptoms/history/ requires Standard tier or higher, so a free-tier
 * request gets a 403. In that case we fall back to /api/symptoms/latest/, an
 * ungated endpoint returning the single most recent submission plus the true
 * total, so the dashboard shows something real instead of a false empty state.
 */
export function useDashboardData() {
  const [state, setState] = useState({
    loading: true,
    submissions: [],
    totalCount: 0,
    historyLimited: false,
  });
  const [me, setMe] = useState(null);
  const [portals, setPortals] = useState({ chw: false, doctor: false });

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const { data } = await api.get("/api/symptoms/history/");
        return { submissions: data.results, totalCount: data.count, historyLimited: false };
      } catch (err) {
        if (err.response?.status !== 403) throw err; // 401 is handled by the axios interceptor
        const { data } = await api.get("/api/symptoms/latest/");
        return {
          submissions: data.latest ? [data.latest] : [],
          totalCount: data.total_count,
          historyLimited: true,
        };
      }
    }

    loadHistory()
      .catch(() => ({ submissions: [], totalCount: 0, historyLimited: false }))
      .then((history) => {
        if (!cancelled) setState({ loading: false, ...history });
      });

    // email_verified and guardian status can change without a new login, so
    // they are fetched fresh rather than read from the token.
    api
      .get("/api/auth/me/")
      .then((res) => !cancelled && setMe(res.data))
      .catch(() => {});

    const isChw = Boolean(decodePayload()?.is_chw);
    api
      .get("/api/billing/doctor-subscription/")
      .then((res) => res.data?.has_subscription && res.data?.status === "active")
      .catch(() => false)
      .then((doctor) => !cancelled && setPortals({ chw: isChw, doctor: Boolean(doctor) }));

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, me, portals };
}
