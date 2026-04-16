"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { uploadImagesToStorage } from "@/lib/image-upload";
import { sendNativeNotification } from "@/lib/notifications";
import { analyzeReceiptImage } from "@/lib/receipt-ocr";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  ImagePlus, LoaderCircle, Pencil, ReceiptText, Trash2,
  TrendingDown, TrendingUp, Users, Wallet, XCircle,
} from "lucide-react";
import OcrScanModal from "@/components/OcrScanModal";
import { preprocessReceiptImage } from "@/lib/image-preprocess";

const ACCENT = "#6366F1";

const CATEGORIES = ["식비", "교통", "쇼핑", "문화", "의료", "통신", "공과금", "구독비", "대출", "급여", "기타"];

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
  급여: "#10B981",
  기타: "#8B8BA7",
};

const inputStyle: CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  buyer: string;
  merchantName: string;
  location: string;
  receiptImageUrl: string | null;
  amount: number;
  note: string;
  date: string;
}

interface TransactionApiResponse {
  id: string;
  type: "income" | "expense";
  category: string;
  buyer?: string;
  merchant_name?: string;
  location?: string;
  receipt_image_url?: string | null;
  amount: number;
  note: string;
  date: string;
}

function normalizeTransaction(t: TransactionApiResponse): Transaction {
  return {
    id: t.id,
    type: t.type,
    category: t.category,
    buyer: t.buyer ?? "공동",
    merchantName: t.merchant_name ?? "",
    location: t.location ?? "",
    receiptImageUrl: t.receipt_image_url ?? null,
    amount: t.amount,
    note: t.note,
    date: t.date,
  };
}

const EMPTY_FORM = (defaultBuyer = "공동"): Omit<Transaction, "id"> => ({
  type: "expense",
  category: "식비",
  buyer: defaultBuyer,
  merchantName: "",
  location: "",
  receiptImageUrl: null,
  amount: 0,
  note: "",
  date: new Date().toISOString().slice(0, 10),
});

type SaveStatus = "idle" | "saving" | "success" | "error";

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Transaction, "id">>(EMPTY_FORM());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [chartsOpen, setChartsOpen] = useState(false);
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");

  // 월 선택
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const displayMonth = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return `${y}년 ${m}월`;
  }, [selectedMonth]);

  // 구성원 (사이트 설정에서 로드)
  const [members, setMembers] = useState<string[]>(["공동", "봉준", "달희"]);

  // 카테고리 예산 한도
  const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>({});

  // OCR 상태
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrSuggestedCategory, setOcrSuggestedCategory] = useState("");
  const [ocrModalImage, setOcrModalImage] = useState<string | null>(null);
  const [ocrDone, setOcrDone] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json() as TransactionApiResponse[];
        setTransactions(Array.isArray(data) ? data.map(normalizeTransaction) : []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return;
      const s = await res.json() as Record<string, string>;
      try {
        const m = JSON.parse(s.budget_members ?? "[]") as unknown;
        if (Array.isArray(m) && m.length > 0) setMembers(m as string[]);
      } catch {}
      try {
        const l = JSON.parse(s.budget_limits ?? "{}") as unknown;
        if (typeof l === "object" && l !== null) setBudgetLimits(l as Record<string, number>);
      } catch {}
    } catch {}
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const navigateMonth = (dir: -1 | 1) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  // URL 파라미터로 특정 거래 편집 진입
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("transaction");
    if (!tid) return;
    const matched = transactions.find((t) => t.id === tid);
    if (!matched) return;
    setEditingId(matched.id);
    setForm({
      type: matched.type,
      category: matched.category,
      buyer: matched.buyer,
      merchantName: matched.merchantName,
      location: matched.location,
      receiptImageUrl: matched.receiptImageUrl,
      amount: matched.amount,
      note: matched.note,
      date: matched.date,
    });
  }, [transactions]);

  const income = useMemo(() => transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [transactions]);
  const expense = useMemo(() => transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = income - expense;

  const resetForm = () => {
    setForm(EMPTY_FORM());
    setEditingId(null);
    setOcrSuggestedCategory("");
    setOcrError("");
  };

  const handleSave = async () => {
    if (form.amount <= 0 || ocrLoading) return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      if (editingId) {
        const res = await fetch(`/api/transactions/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? "수정에 실패했습니다.");
        }
        const updated = normalizeTransaction(await res.json() as TransactionApiResponse);
        setTransactions((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? "저장에 실패했습니다.");
        }
        const created = normalizeTransaction(await res.json() as TransactionApiResponse);
        setTransactions((prev) => [created, ...prev]);
        sendNativeNotification(
          "가계부 내역이 추가되었어요",
          `${created.note || created.category} · ${created.amount.toLocaleString()}원`,
        );
      }
      setSaveStatus("success");
      resetForm();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setSaveStatus("error");
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setForm({
      type: tx.type, category: tx.category, buyer: tx.buyer,
      merchantName: tx.merchantName, location: tx.location,
      receiptImageUrl: tx.receiptImageUrl, amount: tx.amount,
      note: tx.note, date: tx.date,
    });
    setOcrSuggestedCategory("");
    setOcrError("");
    setSaveStatus("idle");
    setSaveError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOcr = async (file: File) => {
    // 모달용 미리보기는 원본 파일로 표시 (전처리 전)
    const previewUrl = URL.createObjectURL(file);
    setOcrModalImage(previewUrl);
    setOcrDone(false);
    setOcrLoading(true);
    setOcrError("");
    try {
      // 이미지 전처리 (그레이스케일 + 대비 강화) → OCR 정확도 향상
      const processedFile = await preprocessReceiptImage(file);

      const [uploadResult, ocrResult] = await Promise.allSettled([
        uploadImagesToStorage([file], undefined, "/api/transactions/images"),  // receipt-images 버킷에 저장
        analyzeReceiptImage(processedFile),     // 전처리본으로 OCR
      ]);
      const receiptImageUrl = uploadResult.status === "fulfilled"
        ? (uploadResult.value[0]?.url ?? "")
        : "";
      const extracted = ocrResult.status === "fulfilled" ? ocrResult.value : null;

      if (!receiptImageUrl && !extracted) throw new Error("영수증 업로드와 OCR 분석에 모두 실패했습니다.");

      setOcrSuggestedCategory(extracted?.recommendedCategory ?? "");
      setForm((prev) => ({
        ...prev,
        category: extracted?.recommendedCategory || prev.category,
        merchantName: extracted?.merchantName || prev.merchantName,
        location: extracted?.location || prev.location,
        amount: extracted && extracted.amount > 0 ? extracted.amount : prev.amount,
        date: extracted?.date || prev.date,
        note: extracted?.note || prev.note,
        receiptImageUrl: receiptImageUrl || prev.receiptImageUrl,
      }));

      if (ocrResult.status === "rejected") {
        setOcrError(ocrResult.reason instanceof Error ? ocrResult.reason.message : "영수증 OCR 처리에 실패했습니다.");
      } else if (uploadResult.status === "rejected") {
        setOcrError("영수증 업로드에 실패했습니다.");
      }
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "영수증 OCR 처리에 실패했습니다.");
    } finally {
      setOcrLoading(false);
      setOcrDone(true); // 성공/실패 무관하게 스캔 완료 표시
    }
  };

  const closeOcrModal = () => {
    if (ocrModalImage) URL.revokeObjectURL(ocrModalImage);
    setOcrModalImage(null);
    setOcrDone(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* OCR 스캔 모달 */}
      {ocrModalImage && (
        <OcrScanModal
          imageUrl={ocrModalImage}
          isDone={ocrDone}
          onClose={closeOcrModal}
        />
      )}

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 pb-16">
        <PageHeader title="가계부" subtitle="내역 입력 및 소비 분석" accentColor={ACCENT} />

        {/* 월 선택 네비게이터 */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            onClick={() => navigateMonth(-1)}
            aria-label="이전 달"
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft size={14} style={{ color: "var(--text-muted)" }} />
          </button>
          <p className="text-base font-black" style={{ color: "var(--text-primary)", minWidth: 110, textAlign: "center" }}>
            {displayMonth}
          </p>
          <button
            onClick={() => navigateMonth(1)}
            aria-label="다음 달"
            disabled={selectedMonth >= currentMonthStr()}
            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity disabled:opacity-30"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          {/* ── 왼쪽: 입력 폼 + 내역 목록 ── */}
          <div className="flex flex-col gap-4">

            {/* 입력 폼 */}
            <div className="bento-card p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {editingId ? "내역 수정" : "거래 추가"}
                </p>
                {editingId && (
                  <button onClick={resetForm} className="text-xs font-semibold hover:opacity-70 transition-opacity"
                    style={{ color: "var(--text-muted)" }}>
                    취소
                  </button>
                )}
              </div>

              {/* 수입/지출 토글 */}
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((type) => (
                  <button key={type} onClick={() => setForm((f) => ({ ...f, type }))}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: form.type === type ? ACCENT : "transparent",
                      color: form.type === type ? "#fff" : "var(--text-muted)",
                      border: "1px solid",
                      borderColor: form.type === type ? ACCENT : "var(--border)",
                    }}>
                    {type === "expense" ? "지출" : "수입"}
                  </button>
                ))}
              </div>

              {/* 영수증 OCR */}
              <OcrUploader
                ocrLoading={ocrLoading}
                ocrError={ocrError}
                receiptImageUrl={form.receiptImageUrl}
                ocrSuggestedCategory={ocrSuggestedCategory}
                onFileSelect={handleOcr}
                onClearImage={() => setForm((f) => ({ ...f, receiptImageUrl: null }))}
              />

              {/* 카테고리 + 구매자 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>카테고리</label>
                  <select value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>구매자</label>
                  <select value={form.buyer}
                    onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
                    style={inputStyle}>
                    {members.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* 금액 + 날짜 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>금액 (원)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.amount || ""}
                    onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                    style={inputStyle}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>날짜</label>
                  <input type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {/* 매장명 + 위치 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>매장명</label>
                  <input placeholder="예: 스타벅스" value={form.merchantName}
                    onChange={(e) => setForm((f) => ({ ...f, merchantName: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>위치</label>
                  <input placeholder="예: 성수점" value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    style={inputStyle} />
                </div>
              </div>

              {/* 메모 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>메모</label>
                <input placeholder="메모 (선택)" value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  style={inputStyle} />
              </div>

              {/* 에러 메시지 */}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  <XCircle size={14} style={{ color: "#F43F5E", flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: "#F43F5E" }}>{saveError}</p>
                </div>
              )}

              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                disabled={form.amount <= 0 || ocrLoading || saveStatus === "saving"}
                className="w-full py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: saveStatus === "success" ? "#10B981" : ACCENT }}
              >
                {saveStatus === "saving" && <LoaderCircle size={14} className="animate-spin" />}
                {saveStatus === "success" && <CheckCircle2 size={14} />}
                {saveStatus === "saving" ? "저장 중..." : saveStatus === "success" ? "저장됨!" : (editingId ? "수정 저장" : "거래 추가")}
              </button>
            </div>

            {/* 거래 내역 목록 */}
            <div className="bento-card p-4 flex flex-col gap-2">
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {displayMonth} 내역 <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>({transactions.length}건)</span>
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <LoaderCircle size={20} className="animate-spin" style={{ color: ACCENT }} />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
                  아직 거래 내역이 없습니다.<br />위 폼에서 첫 거래를 추가해 보세요.
                </p>
              ) : (
                transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    isEditing={editingId === tx.id}
                    onEdit={() => startEdit(tx)}
                    onDelete={() => handleDelete(tx.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── 오른쪽: 요약 + 차트 ── */}
          <div className="flex flex-col gap-4">

            {/* 요약 카드 */}
            <div className="bento-card p-5 flex flex-col gap-4">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{displayMonth} 요약</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "잔액", value: balance, color: balance >= 0 ? "#10B981" : "#F43F5E", icon: <Wallet size={15} /> },
                  { label: "총 수입", value: income, color: "#10B981", icon: <TrendingUp size={15} /> },
                  { label: "총 지출", value: expense, color: "#F43F5E", icon: <TrendingDown size={15} /> },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2" style={{ color: item.color }}>
                      {item.icon}
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black" style={{ color: item.color }}>
                        {(Math.abs(item.value) / 10000).toFixed(1)}만원
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.value.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 저축률 */}
              {income > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>저축률</span>
                    <span className="text-sm font-black"
                      style={{ color: balance >= 0 ? "#10B981" : "#F43F5E" }}>
                      {income > 0 ? Math.round(((income - expense) / income) * 100) : 0}%
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(Math.max(income > 0 ? Math.round(((income - expense) / income) * 100) : 0, 0), 100)}%`,
                      height: "100%", borderRadius: 999,
                      background: balance >= 0 ? "#10B981" : "#F43F5E",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* 구매자 정산 */}
            <SettlementPanel transactions={transactions} members={members} displayMonth={displayMonth} />

            {/* 카테고리 예산 한도 */}
            <BudgetLimitsPanel
              transactions={transactions}
              budgetLimits={budgetLimits}
              onLimitsChange={setBudgetLimits}
            />

            {/* 카테고리 비율 */}
            <PieChart transactions={transactions} />

            {/* 차트 — 접기/펼치기 */}
            <div className="bento-card overflow-hidden">
              <button
                onClick={() => setChartsOpen((v) => !v)}
                className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                aria-label={chartsOpen ? "차트 접기" : "차트 펼치기"}
              >
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>기간별 그래프</p>
                {chartsOpen
                  ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} />
                  : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
              </button>

              {chartsOpen && (
                <div className="px-4 pb-4 flex flex-col gap-4">
                  <div className="flex gap-2">
                    {([["daily", "일별"], ["monthly", "월별"], ["yearly", "연간"]] as const).map(([key, label]) => (
                      <button key={key} onClick={() => setPeriod(key)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{
                          background: period === key ? ACCENT : "transparent",
                          color: period === key ? "#fff" : "var(--text-muted)",
                          border: "1px solid",
                          borderColor: period === key ? ACCENT : "var(--border)",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {period === "daily"   && <DailyBarChart transactions={transactions} />}
                  {period === "monthly" && <MonthlyLineChart transactions={transactions} />}
                  {period === "yearly"  && <YearlyBarChart transactions={transactions} />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── OCR 업로드 ──────────────────────────────────────────────────
function OcrUploader({
  ocrLoading, ocrError, receiptImageUrl, ocrSuggestedCategory,
  onFileSelect, onClearImage,
}: {
  ocrLoading: boolean;
  ocrError: string;
  receiptImageUrl: string | null;
  ocrSuggestedCategory: string;
  onFileSelect: (file: File) => void;
  onClearImage: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>영수증 자동 인식 (선택)</label>
      <label
        className="rounded-xl border border-dashed p-3 cursor-pointer transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--border)", background: "var(--bg-input)" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-2">
          {ocrLoading
            ? <LoaderCircle size={15} className="animate-spin" style={{ color: ACCENT }} />
            : <ImagePlus size={15} style={{ color: ACCENT }} />}
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", margin: 0 }}>
              {ocrLoading ? "영수증 분석 중..." : "영수증 이미지 선택"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)", margin: 0 }}>
              매장명·금액·날짜를 자동으로 추출합니다
            </p>
          </div>
        </div>
      </label>
      {receiptImageUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receiptImageUrl} alt="영수증 미리보기"
            className="w-full rounded-xl object-cover border"
            style={{ maxHeight: 140, borderColor: "var(--border)" }} />
          <button
            type="button"
            onClick={onClearImage}
            aria-label="영수증 이미지 제거"
            className="absolute top-2 right-2 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.55)", width: 24, height: 24 }}
          >
            <Pencil size={11} className="text-white" />
          </button>
        </div>
      )}
      {ocrSuggestedCategory && !ocrError && (
        <p className="text-xs" style={{ color: ACCENT }}>OCR 추천 카테고리: {ocrSuggestedCategory}</p>
      )}
      {ocrError && (
        <p className="text-xs" style={{ color: "#F43F5E" }}>{ocrError}</p>
      )}
    </div>
  );
}

// ── 거래 행 ────────────────────────────────────────────────────
function TransactionRow({
  tx, isEditing, onEdit, onDelete,
}: {
  tx: Transaction;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
      // 3초 후 확인 상태 자동 해제
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors"
      style={{
        background: isEditing ? `${ACCENT}11` : "rgba(255,255,255,0.025)",
        border: `1px solid ${isEditing ? `${ACCENT}44` : "transparent"}`,
      }}
    >
      <button onClick={onEdit} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            background: `${CATEGORY_COLORS[tx.category] ?? "#8B8BA7"}22`,
            color: CATEGORY_COLORS[tx.category] ?? "#8B8BA7",
          }}>
          {tx.category.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {tx.note || tx.category}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="text-[11px] px-1.5 py-0.5 rounded-md"
              style={{ color: "#6366F1", background: "#6366F122" }}>
              {tx.buyer}
            </span>
            {tx.merchantName && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{tx.merchantName}</span>
            )}
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {tx.category} · {tx.date}
            </span>
          </div>
        </div>
      </button>
      <span className={`text-sm font-bold shrink-0 ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
        {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
      </span>
      <button
        onClick={handleDeleteClick}
        aria-label={confirmDelete ? "삭제 확인" : "거래 삭제"}
        className="transition-all shrink-0 rounded-md"
        style={{
          padding: confirmDelete ? "2px 6px" : "2px",
          background: confirmDelete ? "rgba(244,63,94,0.15)" : "transparent",
          border: confirmDelete ? "1px solid rgba(244,63,94,0.3)" : "1px solid transparent",
        }}
      >
        {confirmDelete
          ? <span className="text-[10px] font-bold" style={{ color: "#F43F5E" }}>삭제?</span>
          : <Trash2 size={12} className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "var(--text-muted)" }} />}
      </button>
    </div>
  );
}

// ── 구매자 정산 패널 ────────────────────────────────────────────
function SettlementPanel({
  transactions, members, displayMonth,
}: {
  transactions: Transaction[];
  members: string[];
  displayMonth: string;
}) {
  const personalMembers = useMemo(() => members.filter((m) => m !== "공동"), [members]);

  const data = useMemo(() => {
    const direct: Record<string, number> = {};
    personalMembers.forEach((m) => { direct[m] = 0; });
    let sharedTotal = 0;

    transactions.filter((t) => t.type === "expense").forEach((t) => {
      if (t.buyer === "공동") {
        sharedTotal += t.amount;
      } else if (direct[t.buyer] !== undefined) {
        direct[t.buyer] += t.amount;
      }
    });

    const splitShared = personalMembers.length > 0
      ? Math.round(sharedTotal / personalMembers.length)
      : 0;

    const totals = personalMembers.map((m) => ({
      name: m,
      direct: direct[m] ?? 0,
      shared: splitShared,
      total: (direct[m] ?? 0) + splitShared,
    }));

    // 정산: 가장 많이 낸 사람 - 가장 적게 낸 사람, 차액의 절반
    if (totals.length < 2) return { totals, sharedTotal, settlement: null };
    const sorted = [...totals].sort((a, b) => b.total - a.total);
    const overpayer = sorted[0];
    const underpayer = sorted[sorted.length - 1];
    const diff = overpayer.total - underpayer.total;
    const settlement = diff > 100 ? {
      from: underpayer.name,
      to: overpayer.name,
      amount: Math.round(diff / 2),
    } : null;

    return { totals, sharedTotal, settlement };
  }, [transactions, personalMembers]);

  if (personalMembers.length === 0) return null;
  const hasActivity = data.totals.some((t) => t.total > 0) || data.sharedTotal > 0;
  if (!hasActivity) return null;

  return (
    <div className="bento-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Users size={13} style={{ color: ACCENT }} />
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {displayMonth} 정산
        </p>
      </div>

      {/* 구성원별 지출 */}
      <div className="flex flex-col gap-2">
        {data.totals.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black"
                style={{ background: `${ACCENT}22`, color: ACCENT }}>
                {item.name[0]}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                {item.shared > 0 && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    직접 {item.direct.toLocaleString()} + 공동 {item.shared.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm font-black" style={{ color: item.total > 0 ? "#F43F5E" : "var(--text-muted)" }}>
              {item.total.toLocaleString()}원
            </p>
          </div>
        ))}
        {data.sharedTotal > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>공동 지출 합계</p>
            <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {data.sharedTotal.toLocaleString()}원
            </p>
          </div>
        )}
      </div>

      {/* 정산 결과 */}
      {data.settlement && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
          <ReceiptText size={13} style={{ color: ACCENT, flexShrink: 0 }} />
          <p className="text-xs font-semibold" style={{ color: ACCENT }}>
            {data.settlement.from} → {data.settlement.to}:{" "}
            <span className="font-black">{data.settlement.amount.toLocaleString()}원</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── 카테고리 예산 한도 패널 ─────────────────────────────────────
function BudgetLimitsPanel({
  transactions, budgetLimits, onLimitsChange,
}: {
  transactions: Transaction[];
  budgetLimits: Record<string, number>;
  onLimitsChange: (limits: Record<string, number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return map;
  }, [transactions]);

  const displayCategories = CATEGORIES.filter(
    (c) => budgetLimits[c] || categoryExpenses[c],
  );

  const startEdit = () => {
    const vals: Record<string, string> = {};
    CATEGORIES.forEach((c) => { vals[c] = budgetLimits[c]?.toString() ?? ""; });
    setEditValues(vals);
    setEditing(true);
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const newLimits: Record<string, number> = {};
    Object.entries(editValues).forEach(([k, v]) => {
      const n = parseInt(v.replace(/,/g, ""), 10);
      if (!isNaN(n) && n > 0) newLimits[k] = n;
    });
    await fetch("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget_limits: JSON.stringify(newLimits) }),
    });
    onLimitsChange(newLimits);
    setEditing(false);
    setSaving(false);
  };

  return (
    <div className="bento-card overflow-hidden">
      {/* 버튼 중첩 방지: 헤더를 div로 구성하고 각 버튼을 독립 배치 */}
      <div className="w-full flex items-center justify-between p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-left hover:opacity-80 transition-opacity"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>카테고리 예산 한도</p>
        </button>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity"
              style={{ background: `${ACCENT}22`, color: ACCENT }}
            >
              한도 설정
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "예산 한도 접기" : "예산 한도 펼치기"}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            {open
              ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} />
              : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {editing ? (
            <>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                월 예산 한도를 원 단위로 입력하세요. 비우면 한도 없음으로 처리됩니다.
              </p>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0"
                      style={{ background: `${CATEGORY_COLORS[c] ?? "#8B8BA7"}22`, color: CATEGORY_COLORS[c] ?? "#8B8BA7" }}>
                      {c.slice(0, 1)}
                    </div>
                    <span className="text-xs flex-1" style={{ color: "var(--text-primary)" }}>{c}</span>
                    <input
                      type="number"
                      placeholder="한도 없음"
                      value={editValues[c] ?? ""}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, [c]: e.target.value }))}
                      style={{ ...inputStyle, width: 110 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: ACCENT }}>
                  {saving ? <LoaderCircle size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  취소
                </button>
              </div>
            </>
          ) : displayCategories.length === 0 ? (
            <p className="text-xs py-2 text-center" style={{ color: "var(--text-muted)" }}>
              이달 지출 내역이 없습니다.<br />
              <button onClick={startEdit} className="underline mt-1" style={{ color: ACCENT }}>예산 한도 설정하기</button>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {displayCategories.map((c) => {
                const spent = categoryExpenses[c] ?? 0;
                const limit = budgetLimits[c];
                const pct = limit ? Math.min(spent / limit, 1) : null;
                const over = limit ? spent > limit : false;
                return (
                  <div key={c}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm"
                          style={{ background: CATEGORY_COLORS[c] ?? "#8B8BA7" }} />
                        <span className="text-xs" style={{ color: "var(--text-primary)" }}>{c}</span>
                      </div>
                      <span className="text-xs font-semibold"
                        style={{ color: over ? "#F43F5E" : "var(--text-muted)" }}>
                        {spent.toLocaleString()}원
                        {limit ? ` / ${limit.toLocaleString()}원` : ""}
                      </span>
                    </div>
                    {pct !== null && (
                      <div style={{ height: 5, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{
                          width: `${pct * 100}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: over ? "#F43F5E" : pct > 0.8 ? "#F59E0B" : CATEGORY_COLORS[c] ?? ACCENT,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 차트들 ──────────────────────────────────────────────────────
function DailyBarChart({ transactions }: { transactions: Transaction[] }) {
  const days = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      if (!map[t.date]) map[t.date] = { income: 0, expense: 0 };
      map[t.date][t.type] += t.amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
  }, [transactions]);
  const maxValue = Math.max(...days.flatMap(([, v]) => [v.income, v.expense]), 1);

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>일별 수입/지출 (최근 10일)</p>
      <div className="flex items-end gap-2 h-32">
        {days.map(([date, v]) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: 100 }}>
              <div className="w-[45%] rounded-t"
                style={{ height: `${(v.income / maxValue) * 90}px`, background: "#10B98188", minHeight: v.income ? 3 : 0 }} />
              <div className="w-[45%] rounded-t"
                style={{ height: `${(v.expense / maxValue) * 90}px`, background: "#F43F5E88", minHeight: v.expense ? 3 : 0 }} />
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{date.slice(5)}</p>
          </div>
        ))}
      </div>
      {days.length === 0 && <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>데이터 없음</p>}
    </div>
  );
}

function MonthlyLineChart({ transactions }: { transactions: Transaction[] }) {
  const months = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      map[key][t.type] += t.amount;
    });
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return { label: `${d.getMonth() + 1}월`, ...(map[key] ?? { income: 0, expense: 0 }) };
    });
  }, [transactions]);
  const maxValue = Math.max(...months.flatMap((m) => [m.income, m.expense]), 1);
  const W = 300, H = 90, P = 16;
  const step = (W - P * 2) / Math.max(months.length - 1, 1);
  const toY = (v: number) => H - P - (v / maxValue) * (H - P * 2);
  const ipts = months.map((m, i) => `${P + i * step},${toY(m.income)}`).join(" ");
  const epts = months.map((m, i) => `${P + i * step},${toY(m.expense)}`).join(" ");

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>월별 수입/지출 추이</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <polyline points={ipts} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={epts} fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {months.map((m, i) => (
          <text key={m.label} x={P + i * step} y={H - 2} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{m.label}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-1.5 rounded-sm" style={{ background: "#10B981" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>수입</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-1.5 rounded-sm" style={{ background: "#F43F5E" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>지출</span>
        </div>
      </div>
    </div>
  );
}

function YearlyBarChart({ transactions }: { transactions: Transaction[] }) {
  const year = new Date().getFullYear();
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const expense = transactions
      .filter((t) => t.type === "expense" && t.date.startsWith(key))
      .reduce((s, t) => s + t.amount, 0);
    return { label: `${i + 1}`, expense };
  }), [transactions, year]);
  const maxValue = Math.max(...months.map((m) => m.expense), 1);

  return (
    <div>
      <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>{year}년 월별 지출</p>
      <div className="flex items-end gap-1 h-24">
        {months.map((m) => (
          <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t transition-all"
              style={{
                height: `${Math.max((m.expense / maxValue) * 80, m.expense ? 3 : 0)}px`,
                background: m.expense > 0 ? `linear-gradient(180deg, ${ACCENT}, ${ACCENT}66)` : "var(--border)",
                minHeight: m.expense ? 3 : 1,
              }} />
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ transactions }: { transactions: Transaction[] }) {
  const slices = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense")
      .forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount; });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount, pct: total ? amount / total : 0 }));
  }, [transactions]);

  if (slices.length === 0) return null;

  const R = 50, CX = 65, CY = 65, T = 18;
  let a = -Math.PI / 2;
  const arcs = slices.map(({ category, pct }) => {
    const angle = pct * 2 * Math.PI;
    const x1 = CX + R * Math.cos(a), y1 = CY + R * Math.sin(a);
    a += angle;
    const x2 = CX + R * Math.cos(a), y2 = CY + R * Math.sin(a);
    const large = angle > Math.PI ? 1 : 0;
    const ix1 = CX + (R - T) * Math.cos(a - angle), iy1 = CY + (R - T) * Math.sin(a - angle);
    const ix2 = CX + (R - T) * Math.cos(a), iy2 = CY + (R - T) * Math.sin(a);
    return {
      category, pct,
      amount: slices.find((s) => s.category === category)?.amount ?? 0,
      d: `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${ix2} ${iy2} A${R - T} ${R - T} 0 ${large} 0 ${ix1} ${iy1} Z`,
    };
  });

  return (
    <div className="bento-card p-4">
      <p className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>지출 카테고리</p>
      <div className="flex gap-4 items-center">
        <svg viewBox="0 0 130 130" style={{ width: 130, height: 130, flexShrink: 0 }}>
          {arcs.map((arc) => (
            <path key={arc.category} d={arc.d} fill={CATEGORY_COLORS[arc.category] ?? "#8B8BA7"} />
          ))}
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.slice(0, 5).map((s) => (
            <div key={s.category} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: CATEGORY_COLORS[s.category] ?? "#8B8BA7" }} />
              <span className="text-xs flex-1 truncate" style={{ color: "var(--text-primary)" }}>{s.category}</span>
              <span className="text-xs font-semibold shrink-0"
                style={{ color: CATEGORY_COLORS[s.category] ?? "#8B8BA7" }}>
                {(s.pct * 100).toFixed(0)}%
              </span>
            </div>
          ))}
          {slices.length > 5 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>외 {slices.length - 5}개</p>
          )}
        </div>
      </div>
    </div>
  );
}
