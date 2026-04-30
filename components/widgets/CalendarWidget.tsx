"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser as User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────
type EventType = "schedule" | "anniversary";
type Recurrence = "daily" | "weekly" | "monthly" | "yearly";

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: EventType;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  location: string;
  description: string;
  is_recurring: boolean;
  recurrence: Recurrence | null;
  author_name: string;
  is_mine: boolean;
  is_shared: boolean;
  reminder_minutes: number | null;
}

type NewEvent = {
  title: string;
  event_type: EventType;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  location: string;
  description: string;
  is_recurring: boolean;
  recurrence: Recurrence | "";
  is_shared: boolean;
  reminder_minutes: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const EVENT_TYPE_META: Record<EventType, { label: string; color: string; bg: string }> = {
  schedule:    { label: "일정",   color: "#5CABF2", bg: "rgba(92,171,242,0.15)" },
  anniversary: { label: "기념일", color: "#F43F5E", bg: "rgba(244,63,94,0.15)" },
};

const RECURRENCE_LABELS: Record<Recurrence | "", string> = {
  "":       "반복 없음",
  daily:    "매일",
  weekly:   "매주",
  monthly:  "매월",
  yearly:   "매년",
};

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "알람 없음" },
  { value: 15,   label: "15분 전" },
  { value: 30,   label: "30분 전" },
  { value: 60,   label: "1시간 전" },
  { value: 720,  label: "12시간 전" },
];

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const DEFAULT_NEW_EVENT: NewEvent = {
  title: "",
  event_type: "schedule",
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  location: "",
  description: "",
  is_recurring: false,
  recurrence: "",
  is_shared: false,
  reminder_minutes: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dDayLabel(startDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(startDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function toLunarDate(year: number, month: number, day: number): string {
  try {
    const date = new Date(year, month - 1, day);
    const fmt = new Intl.DateTimeFormat("ko-u-ca-chinese", { month: "numeric", day: "numeric" });
    const parts = fmt.formatToParts(date);
    const m = parts.find((p) => p.type === "month")?.value ?? "";
    const d = parts.find((p) => p.type === "day")?.value ?? "";
    return m && d ? `${m}/${d}` : "";
  } catch {
    return "";
  }
}

const AUTHOR_COLORS = ["#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

const SHARED_COLOR = "#F97316";
const sharedBg = (alpha: number) => `rgba(249,115,22,${alpha})`;

function getAuthorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}

// ─── EventFormFields (shared) ─────────────────────────────────────────────────
function EventFormFields({
  form,
  set,
}: {
  form: NewEvent;
  set: <K extends keyof NewEvent>(key: K, value: NewEvent[K]) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>제목 *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="일정 제목"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>유형</label>
        <div className="flex gap-2">
          {(Object.keys(EVENT_TYPE_META) as EventType[]).map((type) => {
            const meta = EVENT_TYPE_META[type];
            const selected = form.event_type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => set("event_type", type)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                style={{
                  background: selected ? meta.bg : "var(--bg-input)",
                  color: selected ? meta.color : "var(--text-muted)",
                  border: `1px solid ${selected ? meta.color : "var(--border)"}`,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "시작 날짜 *", type: "date", value: form.start_date, key: "start_date", min: undefined },
          { label: "시작 시간",   type: "time", value: form.start_time, key: "start_time", min: undefined },
          { label: "종료 날짜",   type: "date", value: form.end_date,   key: "end_date",   min: form.start_date },
          { label: "종료 시간",   type: "time", value: form.end_time,   key: "end_time",   min: undefined },
        ].map(({ label, type, value, key, min }) => (
          <div key={key} className="flex flex-col gap-1 min-w-0">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</label>
            <input
              type={type}
              value={value}
              min={min}
              onChange={(e) => set(key as keyof NewEvent, e.target.value)}
              className="w-full min-w-0 px-2 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)", boxSizing: "border-box" }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <MapPin size={11} /> 장소
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="장소 또는 링크"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>메모</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="추가 메모"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Bell size={11} /> 일정알람
        </label>
        <select
          value={form.reminder_minutes === null ? "" : String(form.reminder_minutes)}
          onChange={(e) => set("reminder_minutes", e.target.value === "" ? null : Number(e.target.value))}
          className="w-full px-3 py-2 pr-8 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        >
          {REMINDER_OPTIONS.map((opt) => (
            <option key={opt.value ?? "null"} value={opt.value === null ? "" : String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_recurring}
            onChange={(e) => set("is_recurring", e.target.checked)}
            className="w-4 h-4 accent-[#5CABF2]"
          />
          <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
            <Repeat size={13} /> 반복 일정
          </span>
        </label>
        {form.is_recurring && (
          <select
            value={form.recurrence}
            onChange={(e) => set("recurrence", e.target.value as Recurrence | "")}
            className="w-full px-3 py-2 pr-8 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {(Object.keys(RECURRENCE_LABELS) as (Recurrence | "")[]).filter((k) => k !== "").map((k) => (
              <option key={k} value={k}>{RECURRENCE_LABELS[k]}</option>
            ))}
          </select>
        )}
      </div>
    </>
  );
}

// ─── EventEditModal ───────────────────────────────────────────────────────────
function EventEditModal({
  event,
  onClose,
  onSaved,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewEvent>({
    title: event.title,
    event_type: event.event_type,
    start_date: event.start_date,
    start_time: event.start_time ?? "",
    end_date: event.end_date ?? "",
    end_time: event.end_time ?? "",
    location: event.location,
    description: event.description,
    is_recurring: event.is_recurring,
    recurrence: event.recurrence ?? "",
    is_shared: event.is_shared,
    reminder_minutes: event.reminder_minutes ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof NewEvent>(key: K, value: NewEvent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("제목을 입력해주세요."); return; }
    if (!form.start_date) { setError("시작 날짜를 선택해주세요."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          event_type: form.event_type,
          start_date: form.start_date,
          start_time: form.start_time || null,
          end_date: form.end_date || null,
          end_time: form.end_time || null,
          location: form.location.trim(),
          description: form.description.trim(),
          is_recurring: form.is_recurring,
          recurrence: form.is_recurring && form.recurrence ? form.recurrence : null,
          reminder_minutes: form.reminder_minutes,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "수정 실패");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bento-card w-full max-w-md overflow-y-auto"
        style={{ maxHeight: "90vh", background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <Pencil size={18} style={{ color: "#5CABF2" }} />
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>일정 편집</span>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <EventFormFields form={form} set={set} />
          {error && <p className="text-xs" style={{ color: "#F43F5E" }}>{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: "#5CABF2", color: "#fff", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "저장 중…" : "변경 사항 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── EventFormModal ───────────────────────────────────────────────────────────
function EventFormModal({
  defaultDate,
  onClose,
  onSaved,
}: {
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewEvent>({ ...DEFAULT_NEW_EVENT, start_date: defaultDate });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof NewEvent>(key: K, value: NewEvent[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("제목을 입력해주세요."); return; }
    if (!form.start_date) { setError("시작 날짜를 선택해주세요."); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          event_type: form.event_type,
          start_date: form.start_date,
          start_time: form.start_time || null,
          end_date: form.end_date || null,
          end_time: form.end_time || null,
          location: form.location.trim(),
          description: form.description.trim(),
          is_recurring: form.is_recurring,
          recurrence: form.is_recurring && form.recurrence ? form.recurrence : null,
          is_shared: form.is_shared,
          reminder_minutes: form.reminder_minutes,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "저장 실패");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bento-card w-full max-w-md overflow-y-auto"
        style={{ maxHeight: "90vh", background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} style={{ color: "#5CABF2" }} />
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>일정 추가</span>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <EventFormFields form={form} set={set} />

          {/* 공동 일정 */}
          <div
            className="flex flex-col gap-2 p-3 rounded-xl"
            style={{ background: form.is_shared ? sharedBg(0.1) : "var(--bg-input)", border: `1px solid ${form.is_shared ? SHARED_COLOR : "var(--border)"}`, transition: "all 0.2s" }}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_shared}
                onChange={(e) => set("is_shared", e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: SHARED_COLOR }}
              />
              <span className="text-sm font-medium" style={{ color: form.is_shared ? SHARED_COLOR : "var(--text-primary)" }}>
                공동 일정
              </span>
              {form.is_shared && (
                <span
                  className="tag text-xs ml-auto font-bold"
                  style={{ background: sharedBg(0.2), color: SHARED_COLOR, border: `1px solid ${sharedBg(0.6)}` }}
                >
                  공동
                </span>
              )}
            </label>
            {form.is_shared && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                공동 일정으로 등록되어 등록자 표시 없이 공유됩니다.
              </p>
            )}
          </div>

          {error && <p className="text-xs" style={{ color: "#F43F5E" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity"
            style={{ background: "#5CABF2", color: "#fff", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "저장 중…" : "일정 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── EventDetailModal ─────────────────────────────────────────────────────────
function EventDetailModal({
  events,
  date,
  onClose,
  onDeleted,
  onError,
  onEdit,
}: {
  events: CalendarEvent[];
  date: string;
  onClose: () => void;
  onDeleted: () => void;
  onError: (message: string) => void;
  onEdit: (ev: CalendarEvent) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    setConfirmingId(null);
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        onError(payload.error ?? "삭제에 실패했습니다.");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(null);
    }
  }

  const [y, m, d] = date.split("-").map(Number);
  const dateLabel = `${y}년 ${m}월 ${d}일`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bento-card w-full max-w-sm overflow-y-auto"
        style={{ maxHeight: "80vh", background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{dateLabel}</span>
          <button onClick={onClose} aria-label="닫기" className="p-1" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-3">
          {events.map((ev) => {
            const meta = EVENT_TYPE_META[ev.event_type];
            return (
              <div
                key={ev.id}
                className="rounded-xl p-3 flex flex-col gap-1.5"
                style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
                      >
                        {meta.label}
                      </span>
                      {ev.is_shared ? (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ background: sharedBg(0.18), color: SHARED_COLOR, border: `1px solid ${sharedBg(0.5)}` }}
                        >
                          공동
                        </span>
                      ) : (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                          style={{
                            background: `${getAuthorColor(ev.user_id)}18`,
                            color: getAuthorColor(ev.user_id),
                            border: `1px solid ${getAuthorColor(ev.user_id)}35`,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ background: getAuthorColor(ev.user_id) }}
                          />
                          {ev.author_name}
                        </span>
                      )}
                      {ev.is_recurring && ev.recurrence && (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          <Repeat size={10} className="inline mr-0.5" />{RECURRENCE_LABELS[ev.recurrence]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {ev.title}
                    </p>
                    {ev.start_time && (
                      <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Clock size={10} />
                        {ev.start_time.slice(0, 5)}
                        {ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}
                      </p>
                    )}
                    {ev.location && (
                      <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} /> {ev.location}
                      </p>
                    )}
                    {ev.description && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.description}</p>
                    )}
                  </div>
                  {ev.is_mine && (
                    confirmingId === ev.id ? (
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>삭제할까요?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-2 py-1 rounded-lg text-xs"
                            style={{ color: "var(--text-muted)", background: "var(--bg-input)", border: "1px solid var(--border)" }}
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            disabled={deleting === ev.id}
                            className="px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ color: "#fff", background: "#F43F5E", opacity: deleting === ev.id ? 0.6 : 1 }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { onEdit(ev); onClose(); }}
                          className="p-1.5 rounded-lg"
                          style={{ color: "#5CABF2", background: "rgba(92,171,242,0.1)" }}
                          aria-label="일정 편집"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmingId(ev.id)}
                          disabled={deleting === ev.id}
                          className="p-1.5 rounded-lg"
                          style={{ color: "#F43F5E", background: "rgba(244,63,94,0.1)" }}
                          aria-label="일정 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CalendarWidget ───────────────────────────────────────────────────────────
export default function CalendarWidget() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchEvents = useCallback(async (year: number, month: number, signal?: AbortSignal) => {
    if (!user?.id) {
      setEvents([]);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`, {
        signal,
        cache: "no-store",
      });
      if (res.status === 401) {
        setEvents([]);
        return;
      }
      const payload = await res.json().catch(() => ({})) as CalendarEvent[] & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "일정을 불러오지 못했습니다.");
      }
      if (signal?.aborted) return;
      setEvents(Array.isArray(payload) ? payload : []);
    } catch (err) {
      if (signal?.aborted) return;
      setFetchError(err instanceof Error ? err.message : "일정을 불러오지 못했습니다.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      setLoading(false);
      setFetchError("");
      return;
    }
    const controller = new AbortController();
    void fetchEvents(viewYear, viewMonth, controller.signal);
    return () => controller.abort();
  }, [fetchEvents, viewYear, viewMonth, user?.id]);

  // 날짜별 이벤트 맵
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.start_date]) map[ev.start_date] = [];
      map[ev.start_date].push(ev);
    }
    return map;
  }, [events]);

  // 캘린더 날짜 셀 계산
  const { days, firstWeekday } = useMemo(() => {
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const fd = new Date(viewYear, viewMonth - 1, 1).getDay();
    return { days: lastDay, firstWeekday: fd };
  }, [viewYear, viewMonth]);

  const today = useMemo(() => {
    const t = new Date();
    return toDateStr(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }, []);

  // 다가오는 일정 (오늘 이후 3개)
  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.start_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 3);
  }, [events, today]);

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayClick(dateStr: string) {
    if (eventsByDate[dateStr]?.length) {
      setDetailDate(dateStr);
    } else if (user) {
      setFormDate(dateStr);
      setShowForm(true);
    }
  }

  // ─── 로딩 상태 ───────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="bento-card h-full flex items-center justify-center">
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #5CABF2", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bento-card h-full flex flex-col items-center justify-center gap-3 p-6">
        <CalendarDays size={36} style={{ color: "#5CABF2" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>로그인하면 일정을 공유할 수 있어요</p>
        <a
          href="/login"
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "#5CABF2", color: "#fff" }}
        >
          로그인
        </a>
      </div>
    );
  }

  const totalCells = firstWeekday + days;
  const gridCells = Math.ceil(totalCells / 7) * 7;

  return (
    <>
      <div className="bento-card h-full flex flex-col p-5 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: "#5CABF2" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5CABF2" }}>
              캘린더
            </span>
            <span
              className="tag text-xs"
              style={{ background: "rgba(92,171,242,0.15)", color: "#5CABF2" }}
            >
              {events.length}개
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { void fetchEvents(viewYear, viewMonth); }}
              disabled={loading}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--text-muted)" }}
              aria-label="일정 새로고침"
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            </button>
            <button
              onClick={() => { setFormDate(today); setShowForm(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "rgba(92,171,242,0.15)", color: "#5CABF2" }}
            >
              <Plus size={13} /> 추가
            </button>
          </div>
        </div>

        {fetchError ? (
          <div
            className="shrink-0 rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgba(244,63,94,0.12)", color: "#F43F5E", border: "1px solid rgba(244,63,94,0.22)" }}
          >
            {fetchError}
          </div>
        ) : null}

        {/* Month navigator */}
        <div className="flex items-center justify-between shrink-0">
          <button onClick={prevMonth} aria-label="이전 달" className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {viewYear}년 {viewMonth}월
          </span>
          <button onClick={nextMonth} aria-label="다음 달" className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Week labels */}
        <div className="grid grid-cols-7 shrink-0">
          {WEEK_LABELS.map((label, i) => (
            <div
              key={label}
              className="text-center text-xs pb-1 font-medium"
              style={{ color: i === 0 ? "#F43F5E" : i === 6 ? "#5CABF2" : "var(--text-muted)" }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 shrink-0">
          {Array.from({ length: gridCells }).map((_, idx) => {
            const dayNum = idx - firstWeekday + 1;
            if (dayNum < 1 || dayNum > days) {
              return <div key={idx} />;
            }
            const dateStr = toDateStr(viewYear, viewMonth, dayNum);
            const dayEvents = eventsByDate[dateStr] ?? [];
            const isToday = dateStr === today;
            const isPast = dateStr < today;
            const weekday = (firstWeekday + dayNum - 1) % 7;
            const isSun = weekday === 0;
            const isSat = weekday === 6;

            const lunarLabel = toLunarDate(viewYear, viewMonth, dayNum);
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(dateStr)}
                className="flex flex-col items-center gap-0.5 py-1 rounded-lg transition-opacity"
                style={{
                  background: isToday ? "rgba(92,171,242,0.2)" : "transparent",
                  opacity: isPast ? 0.5 : 1,
                  minHeight: 44,
                }}
              >
                <span
                  className="text-xs leading-none"
                  style={{
                    color: isToday
                      ? "#5CABF2"
                      : isSun
                      ? "#F43F5E"
                      : isSat
                      ? "#5CABF2"
                      : "var(--text-primary)",
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {dayNum}
                </span>
                {lunarLabel && (
                  <span
                    className="leading-none"
                    style={{ fontSize: 7, color: "var(--text-muted)", letterSpacing: "-0.02em" }}
                  >
                    {lunarLabel}
                  </span>
                )}
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: ev.is_shared ? SHARED_COLOR : getAuthorColor(ev.user_id) }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Upcoming events */}
        <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
          <p className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>다가오는 일정</p>
          {upcoming.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>이번 달 예정된 일정이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide">
              {upcoming.map((ev) => {
                const meta = EVENT_TYPE_META[ev.event_type];
                const authorColor = ev.is_shared ? SHARED_COLOR : getAuthorColor(ev.user_id);
                const [, em, ed] = ev.start_date.split("-").map(Number);
                const dateLabel = `${em}/${ed}`;
                const dday = dDayLabel(ev.start_date);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                    style={{ background: meta.bg, border: `1px solid ${meta.color}25` }}
                    onClick={() => setDetailDate(ev.start_date)}
                    role="button"
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: authorColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {ev.title}
                        </p>
                        {ev.is_shared ? (
                          <span
                            className="text-xs px-1 py-0.5 rounded shrink-0 font-bold"
                            style={{ fontSize: 9, background: sharedBg(0.18), color: SHARED_COLOR, border: `1px solid ${sharedBg(0.45)}` }}
                          >
                            공동
                          </span>
                        ) : (
                          <span
                            className="text-xs px-1 py-0.5 rounded shrink-0 flex items-center gap-0.5"
                            style={{ fontSize: 9, background: `${authorColor}15`, color: authorColor }}
                          >
                            <span className="w-1 h-1 rounded-full inline-block shrink-0" style={{ background: authorColor }} />
                            {ev.author_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{dateLabel}</span>
                        {ev.start_time && (
                          <span className="text-xs flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                            <Clock size={9} />{ev.start_time.slice(0, 5)}
                          </span>
                        )}
                        {ev.location && (
                          <span className="text-xs flex items-center gap-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                            <MapPin size={9} />{ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs font-bold shrink-0"
                      style={{ color: dday === "D-Day" ? "#F43F5E" : meta.color }}
                    >
                      {dday}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 shrink-0 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([, meta]) => (
            <div key={meta.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{meta.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <EventFormModal
          defaultDate={formDate}
          onClose={() => setShowForm(false)}
          onSaved={() => void fetchEvents(viewYear, viewMonth)}
        />
      )}
      {detailDate && eventsByDate[detailDate] && (
        <EventDetailModal
          events={eventsByDate[detailDate]}
          date={detailDate}
          onClose={() => setDetailDate(null)}
          onError={setFetchError}
          onDeleted={() => { void fetchEvents(viewYear, viewMonth); setDetailDate(null); }}
          onEdit={(ev) => setEditingEvent(ev)}
        />
      )}
      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={() => { void fetchEvents(viewYear, viewMonth); setEditingEvent(null); }}
        />
      )}
    </>
  );
}
