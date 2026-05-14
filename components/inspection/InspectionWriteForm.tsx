"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import type { InspectionRecord, PriceEntry } from "@/lib/inspection";

const ACCENT = "#5CABF2";

const inputStyle = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: "0.75rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};
const labelStyle = { color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 };
const sectionStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--border)",
  borderRadius: "1rem",
  padding: "1.25rem",
};
const sectionTitle = {
  color: ACCENT,
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: "0.75rem",
};

type FormData = Omit<InspectionRecord, "id" | "user_id" | "created_at" | "updated_at">;

const emptyForm = (): FormData => ({
  complex_name: "",
  dong_ho: null,
  address: null,
  pyeong: null,
  year_built: null,
  total_units: null,
  parking_count: null,
  structure: null,
  subway_access: null,
  major_transport: null,
  terrain: null,
  harmful_facilities: null,
  school_zone: null,
  amenities: null,
  nature_env: null,
  building_gap: null,
  community: null,
  maintenance: null,
  interior_condition: null,
  price_info: [{ type: "매매호가", price: "", note: "" }],
  review: null,
  image_urls: [],
});

interface Props {
  initialData?: InspectionRecord;
  recordId?: string;
}

export default function InspectionWriteForm({ initialData, recordId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>(() => {
    if (!initialData) return emptyForm();
    return {
      complex_name: initialData.complex_name,
      dong_ho: initialData.dong_ho,
      address: initialData.address,
      pyeong: initialData.pyeong,
      year_built: initialData.year_built,
      total_units: initialData.total_units,
      parking_count: initialData.parking_count,
      structure: initialData.structure,
      subway_access: initialData.subway_access,
      major_transport: initialData.major_transport,
      terrain: initialData.terrain,
      harmful_facilities: initialData.harmful_facilities,
      school_zone: initialData.school_zone,
      amenities: initialData.amenities,
      nature_env: initialData.nature_env,
      building_gap: initialData.building_gap,
      community: initialData.community,
      maintenance: initialData.maintenance,
      interior_condition: initialData.interior_condition,
      price_info: initialData.price_info?.length ? initialData.price_info : [{ type: "매매호가", price: "", note: "" }],
      review: initialData.review,
      image_urls: initialData.image_urls ?? [],
    };
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const str = (v: string | null | undefined) => v ?? "";

  // ── 이미지 업로드 ──
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.append("image", file, file.name);
        const res = await fetch("/api/blog/images", { method: "POST", body: fd });
        const json = await res.json() as { url?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "업로드 실패");
        if (json.url) uploaded.push(json.url);
      }
      set("image_urls", [...form.image_urls, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) =>
    set("image_urls", form.image_urls.filter((_, i) => i !== idx));

  // ── 시세 rows ──
  const addPriceRow = () =>
    set("price_info", [...form.price_info, { type: "", price: "", note: "" }]);

  const updatePriceRow = (idx: number, key: keyof PriceEntry, value: string) =>
    set("price_info", form.price_info.map((r, i) => i === idx ? { ...r, [key]: value } : r));

  const removePriceRow = (idx: number) =>
    set("price_info", form.price_info.filter((_, i) => i !== idx));

  // ── 저장 ──
  const handleSave = async () => {
    if (!form.complex_name.trim()) { setError("단지명은 필수입니다."); return; }
    setSaving(true);
    setError(null);
    try {
      const url = recordId ? `/api/inspection/${recordId}` : "/api/inspection";
      const method = recordId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      const targetId = recordId ?? json.id;
      router.push(`/inspection/${targetId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-20">

      {/* ── 1. 실측 사진 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>실측 사진</p>
        <div className="flex flex-wrap gap-3">
          {form.image_urls.map((url, i) => (
            <div key={i} className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0"
              style={{ border: "1px solid var(--border)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`사진 ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full p-0.5"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <X size={12} style={{ color: "#fff" }} />
              </button>
            </div>
          ))}
          <button type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-28 h-28 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0 transition-opacity hover:opacity-70"
            style={{ border: `2px dashed ${ACCENT}50`, background: `${ACCENT}08` }}>
            {uploading ? <Loader2 size={18} className="animate-spin" style={{ color: ACCENT }} /> : <Upload size={18} style={{ color: ACCENT }} />}
            <span className="text-[10px] font-semibold" style={{ color: ACCENT }}>
              {uploading ? "업로드 중" : "사진 추가"}
            </span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => handleImageUpload(e.target.files)} />
      </section>

      {/* ── 2. 단지 및 매물 기본 정보 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>단지 및 매물 기본 정보</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p style={labelStyle} className="mb-1">단지명 <span style={{ color: "#F43F5E" }}>*</span></p>
            <input style={inputStyle} placeholder="예: OO아파트" value={form.complex_name}
              onChange={(e) => set("complex_name", e.target.value)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">동·호수</p>
            <input style={inputStyle} placeholder="예: 101동 502호" value={str(form.dong_ho)}
              onChange={(e) => set("dong_ho", e.target.value || null)} />
          </div>
          <div className="sm:col-span-2">
            <p style={labelStyle} className="mb-1">주소</p>
            <input style={inputStyle} placeholder="예: 서울시 강남구 대치동 OOO" value={str(form.address)}
              onChange={(e) => set("address", e.target.value || null)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">평형</p>
            <input style={inputStyle} placeholder="예: 59㎡ (24평)" value={str(form.pyeong)}
              onChange={(e) => set("pyeong", e.target.value || null)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">구조</p>
            <input style={inputStyle} placeholder="예: 3베이 판상형" value={str(form.structure)}
              onChange={(e) => set("structure", e.target.value || null)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">연식 (준공연도)</p>
            <input style={inputStyle} type="number" placeholder="예: 2015" value={form.year_built ?? ""}
              onChange={(e) => set("year_built", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">총 세대수</p>
            <input style={inputStyle} type="number" placeholder="예: 1200" value={form.total_units ?? ""}
              onChange={(e) => set("total_units", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div>
            <p style={labelStyle} className="mb-1">주차대수</p>
            <input style={inputStyle} placeholder="예: 세대당 1.5대" value={str(form.parking_count)}
              onChange={(e) => set("parking_count", e.target.value || null)} />
          </div>
        </div>
      </section>

      {/* ── 3. 입지 및 교통 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>입지 및 교통</p>
        <div className="flex flex-col gap-4">
          {[
            { key: "subway_access", label: "지하철역 접근성", placeholder: "예: 도보 10분 / 실제 체감 경사도: 완만" },
            { key: "major_transport", label: "주요 업무지구 교통", placeholder: "예: 강남역 직행 버스 O번, 지하철 2호선" },
            { key: "terrain", label: "주변 경사 및 지형", placeholder: "예: 평지 / 완경사 / 급경사" },
            { key: "harmful_facilities", label: "유해·기피 시설", placeholder: "예: 고압선 인접 없음 / 소음 없음" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={labelStyle} className="mb-1">{label}</p>
              <input style={inputStyle} placeholder={placeholder} value={str(form[key as keyof FormData] as string | null)}
                onChange={(e) => set(key as keyof FormData, e.target.value || null)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. 교육 및 인프라 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>교육 및 인프라</p>
        <div className="flex flex-col gap-4">
          {[
            { key: "school_zone", label: "학세권", placeholder: "예: OO초 배정, 인근 학원가 밀집" },
            { key: "amenities", label: "편의시설", placeholder: "예: 이마트 도보 5분, 스타벅스 인근" },
            { key: "nature_env", label: "자연환경", placeholder: "예: 한강공원 도보 15분, 단지 내 산책로" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={labelStyle} className="mb-1">{label}</p>
              <input style={inputStyle} placeholder={placeholder} value={str(form[key as keyof FormData] as string | null)}
                onChange={(e) => set(key as keyof FormData, e.target.value || null)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. 단지 내부 및 상태 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>단지 내부 및 상태</p>
        <div className="flex flex-col gap-4">
          {[
            { key: "building_gap", label: "동간 거리 및 조망", placeholder: "예: 동간 거리 충분, 앞동 가림 없음" },
            { key: "community", label: "커뮤니티", placeholder: "예: 헬스장, 독서실, 카페 운영" },
            { key: "maintenance", label: "단지 관리", placeholder: "예: 분리수거장 청결, 엘리베이터 빠름" },
            { key: "interior_condition", label: "집 내부 상태", placeholder: "예: 누수 없음, 샷시 교체 필요" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p style={labelStyle} className="mb-1">{label}</p>
              <input style={inputStyle} placeholder={placeholder} value={str(form[key as keyof FormData] as string | null)}
                onChange={(e) => set(key as keyof FormData, e.target.value || null)} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. 시세 및 매수 조건 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>시세 및 매수 조건</p>
        <div className="flex flex-col gap-2">
          {/* 헤더 */}
          <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
            {["구분", "가격 정보", "비고", ""].map((h) => (
              <p key={h} style={{ ...labelStyle, marginBottom: 0 }}>{h}</p>
            ))}
          </div>
          {form.price_info.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 items-center">
              <input style={{ ...inputStyle, padding: "0.4rem 0.6rem" }} placeholder="예: 매매호가"
                value={row.type} onChange={(e) => updatePriceRow(i, "type", e.target.value)} />
              <input style={{ ...inputStyle, padding: "0.4rem 0.6rem" }} placeholder="예: 10억"
                value={row.price} onChange={(e) => updatePriceRow(i, "price", e.target.value)} />
              <input style={{ ...inputStyle, padding: "0.4rem 0.6rem" }} placeholder="예: 최저가"
                value={row.note} onChange={(e) => updatePriceRow(i, "note", e.target.value)} />
              <button type="button" onClick={() => removePriceRow(i)} className="flex items-center justify-center"
                style={{ color: "#F43F5E" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addPriceRow}
            className="flex items-center gap-1.5 text-xs font-semibold mt-1 transition-opacity hover:opacity-70"
            style={{ color: ACCENT }}>
            <Plus size={13} /> 행 추가
          </button>
        </div>
      </section>

      {/* ── 7. 총평 ── */}
      <section style={sectionStyle}>
        <p style={sectionTitle}>총평</p>
        <textarea
          rows={5}
          placeholder="전반적인 임장 소감, 매수 의향, 보완 사항 등을 자유롭게 작성해주세요."
          value={str(form.review)}
          onChange={(e) => set("review", e.target.value || null)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </section>

      {/* ── 에러 & 저장 버튼 ── */}
      {error && (
        <p className="text-sm text-center" style={{ color: "#F43F5E" }}>{error}</p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-70"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          취소
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-70 flex items-center justify-center gap-2"
          style={{ background: ACCENT, color: "#fff" }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "저장 중…" : recordId ? "수정 완료" : "임장기록 저장"}
        </button>
      </div>
    </div>
  );
}
