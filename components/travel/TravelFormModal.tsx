"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Loader2, Search } from "lucide-react";
import type { TravelPlace, TravelContinent } from "@/lib/travel-shared";
import { CONTINENTS, CONTINENT_LABELS } from "@/lib/travel-shared";
import { searchCountries, findCountryByName, type CountryData } from "@/lib/travel-countries";

interface TravelFormModalProps {
  editingPlace?: TravelPlace | null;
  onClose: () => void;
  onSave: (place: TravelPlace) => void;
}

interface FormState {
  country: string;
  city: string;
  travel_date: string;
  note: string;
  continent: TravelContinent | "";
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
}

export default function TravelFormModal({ editingPlace, onClose, onSave }: TravelFormModalProps) {
  const [form, setForm] = useState<FormState>({
    country: editingPlace?.country ?? "",
    city: editingPlace?.city ?? "",
    travel_date: editingPlace?.travel_date ?? new Date().toISOString().slice(0, 10),
    note: editingPlace?.note ?? "",
    continent: (editingPlace?.continent as TravelContinent) ?? "",
    lat: editingPlace?.lat ?? null,
    lng: editingPlace?.lng ?? null,
    photo_url: editingPlace?.photo_url ?? null,
  });

  const [countrySuggestions, setCountrySuggestions] = useState<CountryData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const suggRef = useRef<HTMLDivElement>(null);

  function patch(updates: Partial<FormState>) {
    setForm((f) => ({ ...f, ...updates }));
  }

  function handleCountryInput(val: string) {
    patch({ country: val, lat: null, lng: null, continent: "" });
    if (val.trim().length > 0) {
      setCountrySuggestions(searchCountries(val).slice(0, 6));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectCountry(c: CountryData) {
    patch({ country: c.ko, lat: c.lat, lng: c.lng, continent: c.continent });
    setShowSuggestions(false);
  }

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (suggRef.current && !suggRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/travel/images", { method: "POST", body: formData });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "업로드 실패");
      patch({ photo_url: json.url ?? null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let lat = form.lat;
    let lng = form.lng;
    let continent = form.continent;

    if ((lat === null || lng === null) && form.country.trim()) {
      const found = findCountryByName(form.country.trim());
      if (found) { lat = found.lat; lng = found.lng; continent = found.continent; }
    }

    if (!form.country.trim()) { setError("국가를 입력하세요."); return; }
    if (!form.city.trim()) { setError("도시를 입력하세요."); return; }
    if (!form.travel_date) { setError("날짜를 선택하세요."); return; }
    if (lat === null || lng === null) { setError("유효한 국가를 선택하거나 좌표를 확인하세요."); return; }

    setSaving(true);
    try {
      const payload = {
        country: form.country.trim(),
        city: form.city.trim(),
        lat,
        lng,
        travel_date: form.travel_date,
        photo_url: form.photo_url,
        note: form.note.trim() || null,
        continent: continent || null,
      };

      const url = editingPlace ? `/api/travel/${editingPlace.id}` : "/api/travel";
      const method = editingPlace ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as TravelPlace & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      onSave(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-base)",
    color: "var(--text-primary)",
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.3rem",
    display: "block",
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 460,
          maxHeight: "92vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
            {editingPlace ? "여행 수정" : "새 여행 추가"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 */}
        <form id="travel-form" onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1, padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>

          {/* 국가 */}
          <div style={{ position: "relative" }} ref={suggRef}>
            <label style={labelStyle}>국가 *</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={form.country}
                onChange={(e) => handleCountryInput(e.target.value)}
                onFocus={() => form.country.trim() && setShowSuggestions(true)}
                placeholder="예: 일본, Japan"
                style={{ ...inputStyle, paddingRight: "2rem" }}
                autoComplete="off"
              />
              <Search size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            </div>
            {showSuggestions && countrySuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  marginTop: 4,
                }}
              >
                {countrySuggestions.map((c) => (
                  <button
                    key={c.en}
                    type="button"
                    onClick={() => selectCountry(c)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "0.55rem 0.85rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{c.ko}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      {CONTINENT_LABELS[c.continent]}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {form.lat !== null && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--accent-emerald, #10b981)" }}>
                ✓ 좌표 적용됨 ({form.lat.toFixed(2)}, {form.lng?.toFixed(2)})
              </p>
            )}
          </div>

          {/* 대륙 */}
          <div>
            <label style={labelStyle}>대륙</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {CONTINENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch({ continent: form.continent === c ? "" : c })}
                  style={{
                    padding: "3px 12px",
                    borderRadius: 999,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: form.continent === c ? "var(--accent-emerald, #10b981)" : "var(--border)",
                    background: form.continent === c ? "var(--accent-emerald, #10b981)" : "transparent",
                    color: form.continent === c ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  {CONTINENT_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* 도시 */}
          <div>
            <label style={labelStyle}>도시 *</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => patch({ city: e.target.value })}
              placeholder="예: 도쿄, 오사카"
              style={inputStyle}
            />
          </div>

          {/* 날짜 */}
          <div>
            <label style={labelStyle}>여행 날짜 *</label>
            <input
              type="date"
              value={form.travel_date}
              onChange={(e) => patch({ travel_date: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* 사진 */}
          <div>
            <label style={labelStyle}>대표 사진</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            {form.photo_url ? (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", height: 120 }}>
                <img src={form.photo_url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => patch({ photo_url: null })}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "rgba(0,0,0,0.6)",
                    border: "none",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    cursor: "pointer",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  width: "100%",
                  height: 90,
                  borderRadius: 10,
                  border: "2px dashed var(--border)",
                  background: "var(--bg-base)",
                  color: "var(--text-secondary)",
                  cursor: uploading ? "not-allowed" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                  fontSize: "0.82rem",
                }}
              >
                {uploading ? (
                  <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} /> 업로드 중...</>
                ) : (
                  <><Upload size={20} /> 사진 선택</>
                )}
              </button>
            )}
          </div>

          {/* 노트 */}
          <div>
            <label style={labelStyle}>여행 노트</label>
            <textarea
              value={form.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="여행에 대한 기억, 감상을 남겨보세요..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, padding: "0.6rem 0.85rem", background: "rgba(239,68,68,0.1)", borderRadius: 8, color: "#ef4444", fontSize: "0.82rem" }}>
              {error}
            </p>
          )}
        </form>

        {/* 저장 버튼 */}
        <div style={{ padding: "0.875rem 1.25rem", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button
            type="submit"
            form="travel-form"
            disabled={saving || uploading}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: 12,
              border: "none",
              background: saving ? "var(--border)" : "var(--accent-emerald, #10b981)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: saving || uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {saving ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> 저장 중...</> : editingPlace ? "수정 완료" : "여행 추가"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
