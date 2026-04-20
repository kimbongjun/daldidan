"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RotateCcw, LoaderCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import type {
  FortuneResponse,
  FortuneReading,
  CardResult,
  CardCategory,
} from "@/app/api/fortune/reading/route";

const ACCENT = "#8B5CF6";

const CARD_CATEGORIES: { id: CardCategory; label: string; emoji: string }[] = [
  { id: "meal",   label: "오늘의 식사",  emoji: "🍽️" },
  { id: "travel", label: "이번 여행지",  emoji: "✈️" },
  { id: "drink",  label: "오늘의 술",    emoji: "🍺" },
  { id: "snack",  label: "오늘의 안주",  emoji: "🍖" },
];

type Tab = "fortune" | "card";

function FortuneSection({ reading }: { reading: FortuneReading }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-xl p-3 text-sm leading-relaxed"
        style={{ background: `${ACCENT}14`, color: "var(--text-primary)", border: `1px solid ${ACCENT}33` }}
      >
        {reading.overall}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "애정운", value: reading.love },
          { label: "직업운", value: reading.work },
          { label: "건강운", value: reading.health },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-2.5 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-bold" style={{ color: ACCENT }}>{label}</p>
            <p className="text-xs leading-snug" style={{ color: "var(--text-muted)" }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex-1 rounded-xl p-2.5 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>행운의 색</p>
          <p className="text-sm font-bold" style={{ color: ACCENT }}>{reading.lucky_color}</p>
        </div>
        <div
          className="flex-1 rounded-xl p-2.5 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>행운의 수</p>
          <p className="text-sm font-bold" style={{ color: ACCENT }}>{reading.lucky_number}</p>
        </div>
      </div>
    </div>
  );
}

function CardFlipper({
  card,
  onReset,
}: {
  card: CardResult;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className="flex flex-col items-center gap-4"
    >
      <div
        className="w-full rounded-2xl flex flex-col items-center justify-center gap-4 py-8 px-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${ACCENT}44, ${ACCENT}18)`,
          border: `1.5px solid ${ACCENT}66`,
          minHeight: 180,
        }}
      >
        {/* 배경 장식 원 */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
          style={{ background: ACCENT }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
          style={{ background: ACCENT }}
        />

        {/* 결과 이모지 */}
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
          style={{ fontSize: "4rem", lineHeight: 1, display: "block", position: "relative", zIndex: 1 }}
        >
          {card.result_emoji}
        </motion.span>

        {/* 결과 텍스트 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="text-center relative z-10"
        >
          <p
            className="text-lg font-bold mb-2 leading-snug"
            style={{ color: "var(--text-primary)" }}
          >
            {card.result}
          </p>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: `${ACCENT}33`, color: ACCENT, border: `1px solid ${ACCENT}55` }}
          >
            <span>{card.emoji}</span>
            {card.category_label}
          </span>
        </motion.div>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
        style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}33` }}
      >
        <RotateCcw size={12} /> 다시 뽑기
      </button>
    </motion.div>
  );
}

export default function FortuneWidget() {
  const [tab, setTab] = useState<Tab>("fortune");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [reading, setReading] = useState<FortuneReading | null>(null);
  const [card, setCard] = useState<CardResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CardCategory>("meal");
  const [flipping, setFlipping] = useState(false);

  const fetchFortune = async () => {
    setLoading(true);
    setError(null);
    setNeedsProfile(false);
    try {
      const res = await fetch("/api/fortune/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "daily" }),
      });
      if (res.status === 422) {
        setNeedsProfile(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "오류가 발생했습니다.");
      }
      const data = await res.json() as FortuneResponse;
      if (data.type === "daily" && data.reading) setReading(data.reading);
    } catch (err) {
      setError(err instanceof Error ? err.message : "운세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const drawCard = async (category: CardCategory) => {
    setFlipping(true);
    setCard(null);
    setError(null);
    setNeedsProfile(false);
    try {
      const res = await fetch("/api/fortune/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "card", card_category: category }),
      });
      if (res.status === 422) {
        setNeedsProfile(true);
        setFlipping(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "오류가 발생했습니다.");
      }
      const data = await res.json() as FortuneResponse;
      if (data.type === "card" && data.card) setCard(data.card);
    } catch (err) {
      setError(err instanceof Error ? err.message : "카드를 뽑지 못했습니다.");
    } finally {
      setFlipping(false);
    }
  };

  return (
    <div className="bento-card gradient-violet h-full flex flex-col p-5 gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>운세</p>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>오늘의 운세 & 카드</h2>
        </div>
        <span className="tag" style={{ background: `${ACCENT}22`, color: ACCENT }}>
          <Sparkles size={10} className="inline mr-1" />AI 점술
        </span>
      </div>

      {/* 탭 */}
      <div
        className="flex rounded-xl p-0.5 gap-0.5"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
      >
        {(["fortune", "card"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
            style={{
              background: tab === t ? ACCENT : "transparent",
              color: tab === t ? "#fff" : "var(--text-muted)",
            }}
          >
            {t === "fortune" ? "✨ 오늘 운세" : "🃏 카드 뽑기"}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {tab === "fortune" ? (
            <motion.div
              key="fortune"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {needsProfile ? (
                <div
                  className="rounded-xl p-4 flex flex-col items-center gap-3 text-center"
                  style={{ background: `${ACCENT}10`, border: `1px dashed ${ACCENT}44` }}
                >
                  <span style={{ fontSize: "2rem" }}>🔮</span>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    생년·성별·태어난 시 정보가 필요해요
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    마이페이지에서 입력하면 AI 운세를 볼 수 있어요.
                  </p>
                  <Link
                    href="/mypage"
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-75"
                    style={{ background: ACCENT, color: "#fff" }}
                  >
                    마이페이지로 이동 <ChevronRight size={12} />
                  </Link>
                </div>
              ) : error ? (
                <div className="rounded-xl p-3 text-sm text-center" style={{ color: "#F43F5E", background: "#F43F5E11" }}>
                  {error}
                </div>
              ) : reading ? (
                <FortuneSection reading={reading} />
              ) : (
                <div
                  className="rounded-xl p-6 flex flex-col items-center gap-4"
                  style={{ background: `${ACCENT}10`, border: `1px dashed ${ACCENT}44` }}
                >
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    style={{ fontSize: "2.5rem", display: "block" }}
                  >
                    🔮
                  </motion.span>
                  <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                    오늘의 운세를 AI가 풀어드려요
                  </p>
                  <button
                    onClick={fetchFortune}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-85"
                    style={{ background: `linear-gradient(135deg, ${ACCENT}, #6D28D9)` }}
                  >
                    {loading
                      ? <><LoaderCircle size={14} className="animate-spin" /> 운세 보는 중…</>
                      : <><Sparkles size={14} /> 운세 보기</>
                    }
                  </button>
                </div>
              )}

              {reading && (
                <button
                  onClick={() => { setReading(null); }}
                  className="flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-xl transition-opacity hover:opacity-75"
                  style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}
                >
                  <RotateCcw size={11} /> 다시 보기
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* 카테고리 선택 */}
              <div className="grid grid-cols-2 gap-2">
                {CARD_CATEGORIES.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => { setSelectedCategory(id); setCard(null); }}
                    className="rounded-xl py-2.5 px-3 flex items-center gap-2 text-xs font-semibold transition-all"
                    style={{
                      background: selectedCategory === id ? `${ACCENT}28` : "rgba(255,255,255,0.04)",
                      color: selectedCategory === id ? ACCENT : "var(--text-muted)",
                      border: selectedCategory === id ? `1px solid ${ACCENT}55` : "1px solid var(--border)",
                    }}
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>

              {needsProfile ? (
                <div
                  className="rounded-xl p-4 flex flex-col items-center gap-3 text-center"
                  style={{ background: `${ACCENT}10`, border: `1px dashed ${ACCENT}44` }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    로그인 및 프로필 정보가 필요해요
                  </p>
                  <Link
                    href="/mypage"
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: ACCENT, color: "#fff" }}
                  >
                    마이페이지로 이동 <ChevronRight size={12} />
                  </Link>
                </div>
              ) : card ? (
                <CardFlipper card={card} onReset={() => setCard(null)} />
              ) : (
                <div
                  className="rounded-xl p-5 flex flex-col items-center gap-3"
                  style={{ background: `${ACCENT}10`, border: `1px dashed ${ACCENT}44` }}
                >
                  {error && (
                    <p className="text-xs text-center" style={{ color: "#F43F5E" }}>{error}</p>
                  )}
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <button
                      onClick={() => drawCard(selectedCategory)}
                      disabled={flipping}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                      style={{ background: `linear-gradient(135deg, ${ACCENT}, #6D28D9)` }}
                    >
                      {flipping
                        ? <><LoaderCircle size={14} className="animate-spin" /> 뽑는 중…</>
                        : <>🃏 카드 뽑기</>
                      }
                    </button>
                  </motion.div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {CARD_CATEGORIES.find((c) => c.id === selectedCategory)?.label}를 랜덤으로 정해드려요
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
