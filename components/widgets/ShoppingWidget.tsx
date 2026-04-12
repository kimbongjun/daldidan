"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, PackageOpen, RefreshCw, Search } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { ShoppingDeal, ShoppingSearchResult, UsedItem } from "@/lib/data/types";

type Tab = "new" | "used";

export default function ShoppingWidget({ deals, source }: { deals: ShoppingDeal[]; source: string }) {
  const [keyword, setKeyword] = useState("");
  const [searchResult, setSearchResult] = useState<ShoppingSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSearchResult(null);
    setTab("new");
    try {
      const res = await fetch(`/api/shopping/search?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const json = (await res.json()) as ShoppingSearchResult;
      if (json.error && !json.newItems.length && !json.usedItems.length) {
        setError(json.error);
      } else {
        setSearchResult(json);
      }
    } catch {
      setError("검색 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(keyword);
  };

  const clearSearch = () => {
    setKeyword("");
    setSearchResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  const displayDeals: ShoppingDeal[] = searchResult ? searchResult.newItems : deals;
  const displayUsed: UsedItem[] = searchResult ? searchResult.usedItems : [];
  const isSearchMode = searchResult !== null;

  return (
    <div className="bento-card gradient-amber h-full flex flex-col p-5 gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between shrink-0 gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent-amber)" }}>쇼핑</p>
          <h2 className="text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {isSearchMode ? `"${searchResult.keyword}" 검색결과` : "실시간 할인 상품"}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isSearchMode
              ? `신상품 ${searchResult.newItems.length}개 · 중고 ${searchResult.usedItems.length}개`
              : source === "naver-search" ? "Naver Shopping 기반" : "샘플 데이터"}
          </p>
        </div>
        <Link
          href="/shopping"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70 shrink-0"
          style={{ background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)" }}
        >
          전체보기 <ArrowRight size={11} />
        </Link>
      </div>

      {/* 검색창 */}
      <form onSubmit={onSubmit} className="flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <Search size={14} style={{ color: "var(--accent-amber)" }} className="shrink-0" />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="상품 키워드 검색 (예: 에어팟, 맥북)"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          {isSearchMode && (
            <button type="button" onClick={clearSearch} className="text-xs hover:opacity-70 shrink-0" style={{ color: "var(--text-muted)" }}>
              초기화
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          style={{ background: "var(--accent-amber)", color: "#0F0F14" }}
        >
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
          검색
        </button>
      </form>

      {/* 탭 (검색 모드에서만) */}
      {isSearchMode && (
        <div className="flex gap-1 shrink-0">
          {(["new", "used"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
              style={
                tab === t
                  ? { background: "var(--accent-amber)", color: "#0F0F14" }
                  : { background: "rgba(245,158,11,0.1)", color: "var(--text-muted)" }
              }
            >
              {t === "new" ? `신상품 (${searchResult.newItems.length})` : `중고 (${searchResult.usedItems.length})`}
            </button>
          ))}
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{error}</p>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex-1 flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin" style={{ color: "var(--accent-amber)" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>검색 중...</span>
        </div>
      )}

      {/* 중고 목록 */}
      {!loading && !error && isSearchMode && tab === "used" && (
        <div className="flex-1 overflow-auto scrollbar-hide flex flex-col gap-1.5">
          {displayUsed.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
              <PackageOpen size={28} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>중고 상품이 없습니다.</p>
            </div>
          ) : (
            displayUsed.map((item) => (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity"
                style={{ background: "rgba(245,158,11,0.06)" }}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                  {item.image
                    ? <Image src={item.image} alt={item.title} width={40} height={40} className="object-cover w-full h-full" unoptimized />
                    : <PackageOpen size={16} style={{ color: "var(--accent-amber)" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.mallName} · 중고</p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: "var(--accent-amber)" }}>{item.price.toLocaleString()}원</p>
              </a>
            ))
          )}
        </div>
      )}

      {/* 신상품 리스트 (기본 or 검색 new 탭) */}
      {!loading && !error && (!isSearchMode || tab === "new") && (
        <div className="flex-1 overflow-auto scrollbar-hide flex flex-col gap-1.5">
          {displayDeals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
              <PackageOpen size={28} style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>검색 결과가 없습니다.</p>
            </div>
          ) : (
            displayDeals.slice(0, 6).map((deal) => (
              <a
                key={deal.id}
                href={deal.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:opacity-80 transition-opacity"
                style={{ background: "rgba(245,158,11,0.05)" }}
              >
                {/* 썸네일 */}
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                  {deal.image
                    ? <Image src={deal.image} alt={deal.title} width={44} height={44} className="object-cover w-full h-full" unoptimized />
                    : <PackageOpen size={16} style={{ color: "var(--accent-amber)" }} />}
                </div>
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-snug" style={{ color: "var(--text-primary)" }}>{deal.title}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{deal.store}{deal.brand ? ` · ${deal.brand}` : ""}</p>
                </div>
                {/* 가격 + 할인율 */}
                <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                  {deal.discountPct > 0 && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.2)", color: "var(--accent-amber)" }}>
                      -{deal.discountPct}%
                    </span>
                  )}
                  <p className="text-sm font-black" style={{ color: "var(--accent-amber)" }}>{deal.salePrice.toLocaleString()}원</p>
                </div>
                <ExternalLink size={12} className="shrink-0" style={{ color: "var(--text-muted)" }} />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
