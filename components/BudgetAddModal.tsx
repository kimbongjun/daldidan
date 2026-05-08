"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, ImagePlus, LoaderCircle, Pencil, X, XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import OcrScanModal from "@/components/OcrScanModal";
import { preprocessReceiptImage } from "@/lib/image-preprocess";
import { analyzeReceiptImage } from "@/lib/receipt-ocr";
import { sendNativeNotification } from "@/lib/notifications";

const ACCENT = "#6366F1";

const CATEGORIES = ["식비", "교통", "쇼핑", "문화", "의료", "통신", "공과금", "구독비", "대출", "기타"];

const inputStyle: CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

interface FormData {
  type: "expense";
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
  user_id: string;
  type: "expense";
  category: string;
  buyer?: string;
  merchant_name?: string;
  location?: string;
  receipt_image_url?: string | null;
  amount: number;
  note: string;
  date: string;
  author_display?: string;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyForm(defaultBuyer = "공동"): FormData {
  return {
    type: "expense",
    category: "식비",
    buyer: defaultBuyer,
    merchantName: "",
    location: "",
    receiptImageUrl: null,
    amount: 0,
    note: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

interface BudgetAddModalProps {
  onClose: () => void;
}

export default function BudgetAddModal({ onClose }: BudgetAddModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrSuggestedCategory, setOcrSuggestedCategory] = useState("");
  const [ocrModalImage, setOcrModalImage] = useState<string | null>(null);
  const [ocrDone, setOcrDone] = useState(false);

  const { data: settingsData } = useQuery({
    queryKey: queryKeys.siteSettings.all,
    queryFn: () =>
      fetch("/api/site-settings").then((r) => r.json() as Promise<Record<string, string>>),
    staleTime: 5 * 60 * 1000,
  });

  const members: string[] = (() => {
    if (!settingsData?.budget_members) return ["공동", "봉준", "달희"];
    try {
      const m = JSON.parse(settingsData.budget_members) as unknown;
      return Array.isArray(m) && m.length > 0 ? (m as string[]) : ["공동", "봉준", "달희"];
    } catch { return ["공동", "봉준", "달희"]; }
  })();

  // ESC 키 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, type: "expense" }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "저장에 실패했습니다.");
      }
      return res.json() as Promise<TransactionApiResponse>;
    },
    onSuccess: (data) => {
      sendNativeNotification(
        "가계부 내역이 추가되었어요",
        `${data.note || data.category} · ${data.amount.toLocaleString()}원`,
      );
      setSaveStatus("success");
      void queryClient.invalidateQueries({ queryKey: queryKeys.budget.byMonth(currentMonthStr()) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.budget.allTransactions });
      setTimeout(() => onClose(), 800);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setSaveStatus("error");
    },
  });

  const handleSave = () => {
    if (form.amount <= 0 || ocrLoading) return;
    setSaveStatus("saving");
    setSaveError("");
    saveMutation.mutate(form);
  };

  const uploadReceiptImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("image", file, file.name || "receipt.jpg");
    const res = await fetch("/api/transactions/images", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? `업로드 실패 (HTTP ${res.status})`);
    if (!json.url) throw new Error("서버가 URL을 반환하지 않았습니다.");
    return json.url;
  };

  const handleOcr = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setOcrModalImage(previewUrl);
    setOcrDone(false);
    setOcrLoading(true);
    setOcrError("");
    try {
      const processedFile = await preprocessReceiptImage(file);
      const [uploadResult, ocrResult] = await Promise.allSettled([
        uploadReceiptImage(file),
        analyzeReceiptImage(processedFile),
      ]);

      const receiptImageUrl = uploadResult.status === "fulfilled" ? uploadResult.value : "";
      const extracted = ocrResult.status === "fulfilled" ? ocrResult.value : null;

      if (!receiptImageUrl && !extracted) {
        const uploadMsg = uploadResult.status === "rejected"
          ? (uploadResult.reason instanceof Error ? uploadResult.reason.message : "업로드 실패")
          : "";
        throw new Error(uploadMsg || "영수증 처리에 실패했습니다.");
      }

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
        setOcrError(ocrResult.reason instanceof Error ? ocrResult.reason.message : "OCR 처리에 실패했습니다.");
      } else if (uploadResult.status === "rejected") {
        const msg = uploadResult.reason instanceof Error ? uploadResult.reason.message : "이미지 저장에 실패했습니다.";
        setOcrError(`이미지 저장 실패 (OCR 데이터는 적용됨): ${msg}`);
      }
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "영수증 처리에 실패했습니다.");
    } finally {
      setOcrLoading(false);
      setOcrDone(true);
    }
  };

  const closeOcrModal = () => {
    if (ocrModalImage) URL.revokeObjectURL(ocrModalImage);
    setOcrModalImage(null);
    setOcrDone(false);
  };

  return (
    <>
      {ocrModalImage && (
        <OcrScanModal
          imageUrl={ocrModalImage}
          isDone={ocrDone}
          onClose={closeOcrModal}
        />
      )}

      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        {/* 모달 패널 */}
        <div
          className="bento-card w-full flex flex-col gap-4 p-5 overflow-y-auto"
          style={{ maxWidth: 480, maxHeight: "90vh", zIndex: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>지출 추가</p>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
              style={{ width: 28, height: 28, background: "rgba(255,255,255,0.06)" }}
              aria-label="닫기"
            >
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
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
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>카테고리</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="pr-8"
                style={inputStyle}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>구매자</label>
              <select
                value={form.buyer}
                onChange={(e) => setForm((f) => ({ ...f, buyer: e.target.value }))}
                className="pr-8"
                style={inputStyle}
              >
                {members.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* 금액 + 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>금액 (원)</label>
              <input
                type="number"
                placeholder="0"
                value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 overflow-hidden">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={{ ...inputStyle, minWidth: 0 }}
              />
            </div>
          </div>

          {/* 매장명 + 위치 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>매장명</label>
              <input
                placeholder="예: 스타벅스"
                value={form.merchantName}
                onChange={(e) => setForm((f) => ({ ...f, merchantName: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>위치</label>
              <input
                placeholder="예: 성수점"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* 메모 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>메모</label>
            <input
              placeholder="메모 (선택)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* 에러 */}
          {saveStatus === "error" && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}
            >
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
            {saveStatus === "saving" ? "저장 중..." : saveStatus === "success" ? "저장됨!" : "지출 추가"}
          </button>
        </div>
      </div>
    </>
  );
}

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
          <img
            src={receiptImageUrl}
            alt="영수증 미리보기"
            className="w-full rounded-xl border"
            style={{ maxHeight: 200, objectFit: "contain", background: "#0a0a0f", borderColor: "var(--border)" }}
          />
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
