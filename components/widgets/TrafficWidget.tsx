"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Camera, Navigation, Radio } from "lucide-react";
import { useAppStore, RoadSegment, TrafficCCTV } from "@/store/useAppStore";

const STATUS_COLOR: Record<RoadSegment["status"], string> = {
  원활: "#10B981",
  서행: "#F59E0B",
  정체: "#F43F5E",
  사고: "#7C3AED",
};

const STATUS_BG: Record<RoadSegment["status"], string> = {
  원활: "rgba(16,185,129,0.15)",
  서행: "rgba(245,158,11,0.15)",
  정체: "rgba(244,63,94,0.15)",
  사고: "rgba(124,58,237,0.15)",
};

const TYPE_LABEL: Record<RoadSegment["type"], string> = {
  고속도로: "고속",
  국도: "국도",
  도시고속: "도시",
};

const CCTV_SCENE: Record<TrafficCCTV["status"], { emoji: string; desc: string }> = {
  원활: { emoji: "🟢", desc: "차량이 원활하게 소통 중입니다." },
  서행: { emoji: "🟡", desc: "일부 구간 서행 운행 중입니다." },
  정체: { emoji: "🔴", desc: "정체 구간 발생. 우회를 권장합니다." },
  사고: { emoji: "🔴", desc: "사고 발생. 안전 운전 및 우회를 권장합니다." },
};

function RoadBar({ status }: { status: RoadSegment["status"] }) {
  const fill = status === "원활" ? 85 : status === "서행" ? 50 : status === "정체" ? 20 : 10;
  return (
    <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", flex: 1 }}>
      <div
        style={{
          width: `${fill}%`,
          height: "100%",
          borderRadius: 999,
          background: STATUS_COLOR[status],
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}

function CCTVCard({ cam, active, onClick }: { cam: TrafficCCTV; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(234,88,12,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? "#EA580C55" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "0.75rem",
        padding: "0.6rem 0.75rem",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s ease",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
        <Camera size={11} style={{ color: active ? "#EA580C" : "var(--text-muted)", flexShrink: 0 }} />
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: active ? "#EA580C" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cam.road}
        </span>
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--text-primary)", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {cam.location}
      </p>
    </button>
  );
}

function CCTVViewer({ cam }: { cam: TrafficCCTV }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, [cam.id]);

  const scene = CCTV_SCENE[cam.status];
  const cars = cam.status === "원활" ? 3 : cam.status === "서행" ? 6 : 10;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "0.875rem",
        overflow: "hidden",
        background: "#0a0a10",
        border: "1px solid rgba(255,255,255,0.07)",
        aspectRatio: "16/7",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "0.75rem",
        minHeight: 100,
      }}
    >
      {/* Simulated road visual */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Road surface */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to top, #1a1a22, #12121a)" }} />
        {/* Lane markings */}
        {[25, 50, 75].map((x) => (
          <div key={x} style={{ position: "absolute", bottom: "10%", left: `${x}%`, width: 2, height: "40%", background: "rgba(255,255,255,0.08)" }} />
        ))}
        {/* Cars */}
        {Array.from({ length: cars }).map((_, i) => {
          const lane = i % 3;
          const xPct = ((i * 37 + tick * 18) % 120) - 10;
          return (
            <div
              key={`${cam.id}-${i}`}
              style={{
                position: "absolute",
                bottom: `${20 + lane * 12}%`,
                left: 0,
                width: 28,
                height: 14,
                borderRadius: 3,
                background: i % 4 === 0 ? "#EA580C55" : "rgba(255,255,255,0.15)",
                transform: `translateX(${xPct}vw)`,
                transition: "transform 3s linear",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                willChange: "transform",
              }}
            >
              🚗
            </div>
          );
        })}
        {/* Scanline effect */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)" }} />
      </div>

      {/* Top HUD */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "pulse-glow 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.6rem", color: "#10B981", fontWeight: 700, letterSpacing: "0.08em" }}>LIVE</span>
        </div>
        <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>CAM {cam.id.replace("c", "").padStart(2, "0")}</span>
      </div>

      {/* Bottom HUD */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>{cam.location}</p>
          <p style={{ margin: 0, fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>{cam.direction} · {cam.updatedAt} 기준</p>
        </div>
        <span
          className="tag"
          style={{
            background: STATUS_BG[cam.status],
            color: STATUS_COLOR[cam.status],
            fontSize: "0.6rem",
          }}
        >
          {scene.emoji} {cam.status}
        </span>
      </div>
    </div>
  );
}

export default function TrafficWidget() {
  const roadSegments = useAppStore((s) => s.roadSegments);
  const trafficCCTVs = useAppStore((s) => s.trafficCCTVs);
  const [tab, setTab] = useState<"road" | "cctv">("road");
  const [selectedCam, setSelectedCam] = useState<string>(trafficCCTVs[0]?.id ?? "");
  const [filter, setFilter] = useState<RoadSegment["type"] | "전체">("전체");

  const activeCam = trafficCCTVs.find((c) => c.id === selectedCam) ?? trafficCCTVs[0];
  const filtered = filter === "전체" ? roadSegments : roadSegments.filter((r) => r.type === filter);

  const counts = {
    원활: roadSegments.filter((r) => r.status === "원활").length,
    서행: roadSegments.filter((r) => r.status === "서행").length,
    정체: roadSegments.filter((r) => r.status === "정체").length,
    사고: roadSegments.filter((r) => r.status === "사고").length,
  };

  return (
    <div className="bento-card gradient-orange h-full flex flex-col p-5 gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#EA580C" }}>교통</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>실시간 교통 정보</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block" }} className="animate-pulse-glow" />
          <span className="tag" style={{ background: "rgba(234,88,12,0.15)", color: "#EA580C" }}>
            <Radio size={9} style={{ marginRight: 3 }} />LIVE
          </span>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
        {(["원활", "서행", "정체", "사고"] as const).map((s) => (
          <div key={s} style={{ background: STATUS_BG[s], borderRadius: "0.6rem", padding: "0.5rem 0.4rem", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: STATUS_COLOR[s] }}>{counts[s]}</p>
            <p style={{ margin: 0, fontSize: "0.6rem", color: STATUS_COLOR[s], fontWeight: 600 }}>{s}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {(["road", "cctv"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background: tab === t ? "#EA580C" : "transparent",
              color: tab === t ? "#fff" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            {t === "road" ? <><Navigation size={12} />도로 현황</> : <><Camera size={12} />CCTV</>}
          </button>
        ))}
      </div>

      {/* Road Tab */}
      {tab === "road" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}>
          {/* Filter */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            {(["전체", "고속도로", "국도", "도시고속"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: 999,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${filter === f ? "#EA580C" : "var(--border)"}`,
                  background: filter === f ? "rgba(234,88,12,0.15)" : "transparent",
                  color: filter === f ? "#EA580C" : "var(--text-muted)",
                  transition: "all 0.2s ease",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Road List */}
          <div className="scrollbar-hide" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {filtered.map((road) => (
              <div
                key={road.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "0.75rem",
                  padding: "0.6rem 0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    <span
                      className="tag"
                      style={{ background: "rgba(234,88,12,0.12)", color: "#EA580C", flexShrink: 0 }}
                    >
                      {TYPE_LABEL[road.type]}
                    </span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {road.name}
                    </span>
                  </div>
                  <span
                    className="tag"
                    style={{
                      background: STATUS_BG[road.status],
                      color: STATUS_COLOR[road.status],
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {road.status === "사고" && <AlertTriangle size={9} />}
                    {road.status}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    {road.from} → {road.to}
                  </span>
                  <RoadBar status={road.status} />
                  <span style={{ fontSize: "0.65rem", color: STATUS_COLOR[road.status], fontWeight: 700, flexShrink: 0 }}>
                    {road.speed}km/h
                  </span>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                    <Activity size={9} style={{ display: "inline", marginRight: 3 }} />
                    소요 {road.travelTime}분
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                    거리 {road.distance}km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CCTV Tab */}
      {tab === "cctv" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.6rem", minHeight: 0 }}>
          {activeCam && <CCTVViewer cam={activeCam} />}

          <div
            className="scrollbar-hide"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.4rem", overflowY: "auto" }}
          >
            {trafficCCTVs.map((cam) => (
              <CCTVCard
                key={cam.id}
                cam={cam}
                active={cam.id === selectedCam}
                onClick={() => setSelectedCam(cam.id)}
              />
            ))}
          </div>

          {activeCam && (
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
              {CCTV_SCENE[activeCam.status].desc}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
