import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useOperations } from "@/contexts/OperationsContext";
import { Role, WorkStatus, getBreakSeconds } from "@/lib/domain";

export interface LocalPresence { tabId: string; employeeId: string; displayName: string; role: Role; status: WorkStatus; shiftStartedAt?: number; activeSeconds: number; idleSeconds: number; breakSeconds: number; lastActivityAt?: number; updatedAt: number; }
interface PresenceContextValue { team: LocalPresence[]; isChannelAvailable: boolean; refreshPresence: () => void; }
const PresenceContext = createContext<PresenceContextValue | null>(null);
const CHANNEL_NAME = "mad3oom-employee-operations-presence";
const PRESENCE_TTL_MS = 10_000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, currentSession } = useOperations();
  const [teamByTab, setTeamByTab] = useState<Record<string, LocalPresence>>({});
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabId = useRef(crypto.randomUUID());
  const isChannelAvailable = typeof BroadcastChannel !== "undefined";
  const createSnapshot = useCallback((): LocalPresence | null => { if (!user) return null; const timestamp = Date.now(); return { tabId: tabId.current, employeeId: user.id, displayName: user.displayName, role: user.role, status: currentSession?.status ?? "OFFLINE", shiftStartedAt: currentSession?.startedAt, activeSeconds: currentSession?.activity.activeSeconds ?? 0, idleSeconds: currentSession?.activity.idleSeconds ?? 0, breakSeconds: currentSession ? getBreakSeconds(currentSession, timestamp) : 0, lastActivityAt: currentSession?.activity.lastActivityAt, updatedAt: timestamp }; }, [user, currentSession]);
  const upsert = useCallback((presence: LocalPresence) => setTeamByTab((current) => ({ ...current, [presence.tabId]: presence })), []);
  const refreshPresence = useCallback(() => { const snapshot = createSnapshot(); if (!snapshot) return; upsert(snapshot); channelRef.current?.postMessage({ type: "presence", presence: snapshot }); }, [createSnapshot, upsert]);
  useEffect(() => { if (!isChannelAvailable) return; const channel = new BroadcastChannel(CHANNEL_NAME); channelRef.current = channel; channel.onmessage = (event: MessageEvent) => { if (event.data?.type === "presence" && event.data.presence?.tabId !== tabId.current) upsert(event.data.presence as LocalPresence); if (event.data?.type === "request-presence") refreshPresence(); if (event.data?.type === "leave" && event.data.tabId) setTeamByTab((current) => { const next = { ...current }; delete next[event.data.tabId]; return next; }); }; channel.postMessage({ type: "request-presence" }); return () => { channel.postMessage({ type: "leave", tabId: tabId.current }); channel.close(); channelRef.current = null; }; }, [isChannelAvailable, refreshPresence, upsert]);
  useEffect(() => { refreshPresence(); const heartbeat = window.setInterval(() => { refreshPresence(); const cutoff = Date.now() - PRESENCE_TTL_MS; setTeamByTab((current) => Object.fromEntries(Object.entries(current).filter(([, presence]) => presence.updatedAt >= cutoff))); }, 3000); return () => window.clearInterval(heartbeat); }, [refreshPresence]);
  const team = useMemo(() => Object.values(teamByTab).sort((a, b) => b.updatedAt - a.updatedAt), [teamByTab]);
  return <PresenceContext.Provider value={{ team, isChannelAvailable, refreshPresence }}>{children}</PresenceContext.Provider>;
}
export function usePresence() { const value = useContext(PresenceContext); if (!value) throw new Error("يجب استخدام الحضور المحلي داخل PresenceProvider"); return value; }
