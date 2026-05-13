"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";

const ACCENT = "#6366F1";

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#F59E0B",
  교통: "#06B6D4",
  쇼핑: "#F43F5E",
  문화: "#7C3AED",
  의료: "#10B981",
  통신: "#6366F1",
  공과금: "#EC4899",
  구독비: "#14B8A6",
  대출: "#EF4444",
  기타: "#8B8BA7",
};

interface Transaction {
  id: string;
  type: "expense";
  category: string;
  amount: number;
  note: string;
  date: string;
  merchant_name?: string;
  buyer?: string;
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: () => void;
}

export default function TransactionDetailModal({
  transaction,
  onClose,
  onEdit,
}: TransactionDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const catColor = CATEGORY_COLORS[transaction.category] ?? "#8B8BA7";

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bento-card w-full flex flex-col"
        style={{
          maxWidth: 400,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ background: `${catColor}22`, color: catColor }}
            >
              {transaction.category.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {transaction.merchant_name || transaction.note || transaction.category}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {transaction.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity shrink-0 ml-3"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
            }}
          >
            <X size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* 금액 */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            지출 금액
          </span>
          <span className="text-xl font-black" style={{ color: "#F43F5E" }}>
            -{transaction.amount.toLocaleString()}원
          </span>
        </div>

        {/* 상세 정보 */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {transaction.buyer && (
            <DetailRow label="구매자" value={transaction.buyer} />
          )}
          {transaction.merchant_name && (
            <DetailRow label="매장명" value={transaction.merchant_name} />
          )}
          <DetailRow label="날짜" value={transaction.date} />
          {transaction.note && (
            <DetailRow label="메모" value={transaction.note} />
          )}
        </div>

        {/* 액션 버튼 */}
        <div
          className="px-4 py-3 flex gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: ACCENT, color: "#fff" }}
          >
            <Pencil size={13} />
            수정
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="text-xs font-semibold text-right truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
