"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, ChevronDown, ChevronUp, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const ACCENT = "#7C3AED";

type OsSummary = Record<string, { sent: number; failed: number }>;

type PushLog = {
  id: string;
  created_at: string;
  notification_type: string;
  title: string;
  body: string;
  target_url: string | null;
  sent_count: number;
  failed_count: number;
  os_summary: OsSummary;
};

const TYPE_LABELS: Record<string, string> = {
  new_post: "새 글",
  comment: "댓글",
  remind: "일정 알림",
  debug: "디버그",
  unknown: "기타",
};

const TYPE_COLORS: Record<string, string> = {
  new_post: "#7C3AED",
  comment: "#06B6D4",
  remind: "#F59E0B",
  debug: "#8B8BA7",
  unknown: "#8B8BA7",
};

const OS_LABELS: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  unknown: "기타",
};

const FILTER_TYPES = ["", "new_post", "comment", "remind", "debug"] as const;

function OsBreakdown({ summary }: { summary: OsSummary }) {
  const entries = Object.entries(summary);
  if (entries.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>기기 정보 없음</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([os, { sent, failed }]) => (
        <div
          key={os}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs"
          style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>{OS_LABELS[os] ?? os}</span>
          {sent > 0 && (
            <span className="font-semibold" style={{ color: "#10B981" }}>✓{sent}</span>
          )}
          {failed > 0 && (
            <span className="font-semibold" style={{ color: "#F43F5E" }}>✗{failed}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LogRow({ log, onDelete }: { log: PushLog; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const typeColor = TYPE_COLORS[log.notification_type] ?? "#8B8BA7";
  const total = log.sent_count + log.failed_count;

  const handleDelete = async () => {
    if (!confirm("이 로그를 삭제할까요?")) return;
    setDeleting(true);
    await fetch("/api/push/logs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: log.id }),
    });
    onDelete(log.id);
  };

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: `${typeColor}20`, color: typeColor }}
            >
              {TYPE_LABELS[log.notification_type] ?? log.notification_type}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {log.title}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {log.body}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span style={{ color: "#10B981" }}>✓{log.sent_count}</span>
            {log.failed_count > 0 && (
              <span style={{ color: "#F43F5E" }}>✗{log.failed_count}</span>
            )}
            {total > 0 && (
              <span style={{ color: "var(--text-muted)" }}>/ {total}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
            style={{ color: "#F43F5E" }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <OsBreakdown summary={log.os_summary} />
          {log.target_url && (
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              URL: {log.target_url}
            </p>
          )}
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {new Date(log.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PushLogsPage() {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (p: number, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/push/logs?${params}`);
      if (!res.ok) return;
      const json = await res.json() as { logs: PushLog[]; total: number };
      setLogs(json.logs);
      setTotal(json.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(page, filterType);
  }, [fetchLogs, page, filterType]);

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    setPage(1);
  };

  const handleDelete = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setTotal((prev) => prev - 1);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="pressable p-2 rounded-xl"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Bell size={18} style={{ color: ACCENT }} />
            푸시 알림 로그
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            전송 이력 · OS별 sent / failed 현황
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(page, filterType)}
          disabled={loading}
          className="p-2 rounded-xl pressable disabled:opacity-50"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTER_TYPES.map((t) => {
          const label = t ? (TYPE_LABELS[t] ?? t) : "전체";
          const active = filterType === t;
          const color = t ? (TYPE_COLORS[t] ?? "#8B8BA7") : ACCENT;
          return (
            <button
              key={t}
              type="button"
              onClick={() => handleFilterChange(t)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: active ? `${color}22` : "var(--bg-card)",
                color: active ? color : "var(--text-muted)",
                border: `1px solid ${active ? color + "55" : "var(--border)"}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 요약 */}
      {!loading && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          총 {total.toLocaleString()}건
        </p>
      )}

      {/* 로그 목록 */}
      <div className="bento-card p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderCircle size={20} className="animate-spin" style={{ color: ACCENT }} />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            로그가 없습니다.
          </p>
        ) : (
          logs.map((log) => (
            <LogRow key={log.id} log={log} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 pressable"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            이전
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 pressable"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
