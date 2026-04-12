"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { FALLBACK_DEALS } from "@/lib/data/fallback";
import { ShoppingDeal, ShoppingResponse } from "@/lib/data/types";
import { useLiveQuery } from "@/lib/data/useLiveQuery";
import { ExternalLink, Search, Tag } from "lucide-react";

const ACCENT = "#F59E0B";

type SortKey = "discount" | "price_asc" | "price_desc";

export default function ShoppingPage() {
  const { data } = useLiveQuery<ShoppingResponse>("/api/shopping");
  const deals = data?.deals ?? FALLBACK_DEALS;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("discount");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = deals.filter((deal) => !query || deal.title.toLowerCase().includes(query) || deal.store.toLowerCase().includes(query));
    return [...list].sort((a, b) => {
      if (sort === "price_asc") return a.salePrice - b.salePrice;
      if (sort === "price_desc") return b.salePrice - a.salePrice;
      return b.discountPct - a.discountPct;
    });
  }, [deals, search, sort]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-12">
        <PageHeader title="이벤트 특가" subtitle="실제 상품 검색 결과 기반 할인 모아보기" accentColor={ACCENT} />

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--text-primary)" }} placeholder="상품명, 쇼핑몰 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="discount">할인율 높은 순</option>
            <option value="price_asc">가격 낮은 순</option>
            <option value="price_desc">가격 높은 순</option>
          </select>
        </div>

        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          {data?.source === "naver-search"
            ? "Naver Search API 연결됨"
            : data?.error
              ? `fallback 사용 중: ${data.error}`
              : "현재는 fallback 데이터입니다. `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`를 설정하면 실상품으로 교체됩니다."}
        </p>

        {filtered.length === 0 ? (
          <div className="bento-card py-20 flex flex-col items-center gap-3">
            <Tag size={32} style={{ color: "var(--border)" }} />
            <p style={{ color: "var(--text-muted)" }}>검색 결과가 없습니다</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: ShoppingDeal }) {
  const saved = deal.originalPrice - deal.salePrice;
  return (
    <article className="bento-card flex flex-col overflow-hidden">
      <div className="relative w-full aspect-video" style={{ background: "var(--border)" }}>
        {deal.image ? <Image src={deal.image} alt={deal.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover" unoptimized /> : null}
        <div className="absolute top-2 left-2 text-sm font-black px-2 py-0.5 rounded-lg" style={{ background: ACCENT, color: "#0F0F14" }}>-{deal.discountPct}%</div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{deal.title}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{deal.store} · {deal.brand || deal.category}</p>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{deal.description}</p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div>
            <p className="text-xs line-through" style={{ color: "var(--text-muted)" }}>{deal.originalPrice.toLocaleString()}원</p>
            <p className="text-xl font-black" style={{ color: ACCENT }}>{deal.salePrice.toLocaleString()}원</p>
            <p className="text-xs font-semibold" style={{ color: "#10B981" }}>{saved.toLocaleString()}원 절약</p>
          </div>
          <a href={deal.purchaseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80" style={{ background: ACCENT, color: "#0F0F14" }}>
            구매하기 <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </article>
  );
}
