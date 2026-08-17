/** أسلوب غرفة قيادة إنسانية: لوحة المدير تضع حالة الفريق قبل الأرقام، وتعرض فقط الحضور المرصود محليًا بلا سجلات موظفين افتراضية. */
import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownUp, Coffee, Download, Radio, SlidersHorizontal, UsersRound, WifiOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, MetricCard, StatusPill } from "@/components/Ui";
import { LocalPresence, usePresence } from "@/contexts/PresenceContext";
import { WorkStatus, formatDuration, formatTime } from "@/lib/domain";
import "@/manager-dashboard.css";

const statusOptions: Array<{ value: "ALL" | WorkStatus; label: string }> = [{ value: "ALL", label: "كل الحالات" }, { value: "ACTIVE", label: "نشط الآن" }, { value: "IDLE", label: "خامل" }, { value: "BREAK", label: "في استراحة" }, { value: "OFFLINE", label: "خارج الوردية" }];
const statusRank: Record<WorkStatus, number> = { ACTIVE: 0, WORKING: 0, IDLE: 1, BREAK: 2, OFFLINE: 3, END_SHIFT: 4 };

function roleLabel(role: LocalPresence["role"]) { return role === "employee" ? "موظف" : role === "manager" ? "مدير" : "مسؤول أعلى"; }
function csvCell(value: string | number) { const text = String(value).replaceAll('"', '""'); return `"${text}"`; }

export default function ManagerDashboard() {
  const { team, isChannelAvailable, refreshPresence } = usePresence();
  const [statusFilter, setStatusFilter] = useState<"ALL" | WorkStatus>("ALL");
  const [sortBy, setSortBy] = useState<"recent" | "status">("recent");
  const active = team.filter((item) => item.status === "ACTIVE");
  const idle = team.filter((item) => item.status === "IDLE");
  const onBreak = team.filter((item) => item.status === "BREAK");
  const working = team.filter((item) => item.status !== "OFFLINE");
  const alerts = [...idle, ...onBreak].sort((a, b) => b.updatedAt - a.updatedAt);
  const visibleTeam = useMemo(() => team.filter((person) => statusFilter === "ALL" || person.status === statusFilter).sort((a, b) => sortBy === "status" ? statusRank[a.status] - statusRank[b.status] || b.updatedAt - a.updatedAt : (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0)), [team, statusFilter, sortBy]);

  const exportCsv = () => {
    const headers = ["الموظف", "الدور", "الحالة", "بداية الوردية", "النشاط", "الخمول", "الاستراحة", "آخر تفاعل"];
    const rows = visibleTeam.map((person) => [person.displayName, roleLabel(person.role), statusOptions.find((item) => item.value === person.status)?.label ?? person.status, person.shiftStartedAt ? formatTime(person.shiftStartedAt) : "", formatDuration(person.activeSeconds), formatDuration(person.idleSeconds), formatDuration(person.breakSeconds), person.lastActivityAt ? formatTime(person.lastActivityAt) : ""]);
    const content = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `مدعوم-حضور-محلي-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  };

  return <AppShell title="لوحة المدير" subtitle="تحديث مباشر للحضور المرصود داخل علامات التبويب المتصلة محليًا.">
    <section className="manager-hero"><div><p className="eyebrow">متابعة الفريق</p><div className="manager-title-row"><h2>نبض الفريق الآن</h2><span className={`channel-pill ${isChannelAvailable ? "available" : "unavailable"}`}>{isChannelAvailable ? <Radio size={14} /> : <WifiOff size={14} />}{isChannelAvailable ? "تحديث محلي مباشر" : "قناة التحديث غير متاحة"}</span></div><p>تتجدد الحالة كل ثلاث ثوانٍ من الجلسات المفتوحة في علامات التبويب المتصلة على المتصفح نفسه.</p></div><button className="secondary-button manager-refresh" type="button" onClick={refreshPresence}>تحديث الحالة</button></section>
    <section className="metrics-grid manager-metrics"><MetricCard label="ضمن وردية" value={String(working.length)} hint="جلسات مفتوحة مرصودة" /><MetricCard label="نشطون" value={String(active.length)} hint="تفاعل حديث داخل الواجهة" tone="sage" /><MetricCard label="خاملون" value={String(idle.length)} hint="تجاوزوا عتبة الخمول" tone="sand" /><MetricCard label="في استراحة" value={String(onBreak.length)} hint="استراحات مفتوحة" tone="rose" /></section>
    <section className="manager-grid"><article className="panel roster-panel"><div className="panel-head"><div><p className="eyebrow">الحضور المرصود</p><h2>موظفو الجلسات المتصلة</h2></div><UsersRound size={22} /></div><div className="manager-toolbar"><label><SlidersHorizontal size={15} /><span>الحالة</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | WorkStatus)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label><ArrowDownUp size={15} /><span>الترتيب</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "recent" | "status")}><option value="recent">آخر تفاعل</option><option value="status">الحالة</option></select></label><button className="export-button" type="button" onClick={exportCsv} disabled={visibleTeam.length === 0}><Download size={15} />تصدير CSV</button></div>{team.length === 0 ? <EmptyState title="لا توجد جلسات مرصودة" description="افتح جلسة موظف في علامة تبويب أخرى على المتصفح نفسه لتظهر حالتها هنا. لا تنشئ اللوحة موظفين افتراضيين." /> : visibleTeam.length === 0 ? <EmptyState title="لا توجد نتائج لهذه الحالة" description="عدّل فلتر الحالة لعرض جلسات محلية أخرى." compact /> : <div className="table-wrap"><table><thead><tr><th>الموظف</th><th>الحالة</th><th>الوردية</th><th>النشاط</th><th>الاستراحة</th><th>آخر تفاعل</th></tr></thead><tbody>{visibleTeam.map((person) => <tr key={person.tabId}><td><strong>{person.displayName}</strong><small>{roleLabel(person.role)}</small></td><td><StatusPill status={person.status} /></td><td>{person.shiftStartedAt ? formatDuration((Date.now() - person.shiftStartedAt) / 1000) : "—"}</td><td>{formatDuration(person.activeSeconds)}</td><td>{formatDuration(person.breakSeconds)}</td><td>{formatTime(person.lastActivityAt)}</td></tr>)}</tbody></table></div>}</article><article className="panel alerts-panel"><div className="panel-head"><div><p className="eyebrow">إشارات تحتاج متابعة</p><h2>تنبيهات الحالة</h2></div><AlertTriangle size={22} /></div>{alerts.length === 0 ? <div className="calm-state"><Activity size={19} /><strong>لا توجد إشارات متابعة</strong><p>ستظهر هنا فقط حالات الخمول أو الاستراحة المرصودة محليًا.</p></div> : <ol className="manager-alerts">{alerts.map((person) => <li key={person.tabId}><span className={person.status === "BREAK" ? "alert-icon break" : "alert-icon idle"}>{person.status === "BREAK" ? <Coffee size={16} /> : <AlertTriangle size={16} />}</span><div><strong>{person.displayName}</strong><p>{person.status === "BREAK" ? `في استراحة منذ ${formatDuration(person.breakSeconds)}` : `خامل؛ آخر تفاعل ${formatTime(person.lastActivityAt)}`}</p></div></li>)}</ol>}</article></section>
    <section className="manager-limits"><WifiOff size={18} /><p><strong>نطاق التحديث والتصدير:</strong> لا ترى هذه اللوحة إلا الجلسات المحلية في علامات تبويب المتصفح نفسها، ويصدر الملف المرشح حاليًا من المتصفح فقط.</p></section>
  </AppShell>;
}
