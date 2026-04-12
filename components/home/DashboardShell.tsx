"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import QuickStats from "@/components/QuickStats";
import BudgetWidget from "@/components/widgets/BudgetWidget";
import BlogWidget from "@/components/widgets/BlogWidget";
import ShoppingWidget from "@/components/widgets/ShoppingWidget";
import StockWidget from "@/components/widgets/StockWidget";
import TrafficWidget from "@/components/widgets/TrafficWidget";
import { FALLBACK_DEALS, FALLBACK_STOCKS } from "@/lib/data/fallback";
import { MarketResponse, ShoppingResponse } from "@/lib/data/types";
import { useLiveQuery } from "@/lib/data/useLiveQuery";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardShell() {
  const weather = useAppStore((state) => state.weather);
  const transactions = useAppStore((state) => state.transactions);

  const marketState = useLiveQuery<MarketResponse>("/api/market");
  const shoppingState = useLiveQuery<ShoppingResponse>("/api/shopping");

  const marketData = marketState.data;
  const shoppingData = shoppingState.data;

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1rem 3rem", width: "100%", boxSizing: "border-box" }}>
        <Header />
        <QuickStats stocks={marketData?.stocks ?? FALLBACK_STOCKS} weather={weather} transactions={transactions} />
        <BentoGrid
          stock={<StockWidget stocks={marketData?.stocks ?? FALLBACK_STOCKS} source={marketData?.source ?? "fallback"} fetchedAt={marketData?.fetchedAt} />}
          shopping={<ShoppingWidget deals={shoppingData?.deals ?? FALLBACK_DEALS} source={shoppingData?.source ?? "fallback"} />}
          traffic={<TrafficWidget />}
          blog={<BlogWidget />}
        />
        <Footer />
      </div>
    </div>
  );
}

function BentoGrid({
  stock,
  shopping,
  traffic,
  blog,
}: {
  stock: React.ReactNode;
  shopping: React.ReactNode;
  traffic: React.ReactNode;
  blog: React.ReactNode;
}) {
  return (
    <div style={{ width: "100%", marginTop: "1rem" }}>
      <style>{`
        .bento-desktop { display: none; }
        .bento-tablet  { display: none; }
        .bento-mobile  {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .bento-mobile { display: none; }
          .bento-tablet {
            display: grid;
            gap: 1rem;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (min-width: 1100px) {
          .bento-tablet { display: none; }
          .bento-desktop {
            display: grid;
            gap: 1rem;
            width: 100%;
            grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);
            grid-template-rows: 460px 500px 360px;
            grid-template-areas:
              "budget  stock   shopping"
              "traffic traffic  traffic"
              "blog    blog    blog";
          }
        }
      `}</style>

      {/* 데스크톱 */}
      <div className="bento-desktop">
        <div style={{ gridArea: "budget",   minWidth: 0 }}><BudgetWidget /></div>
        <div style={{ gridArea: "stock",    minWidth: 0 }}>{stock}</div>        
        <div style={{ gridArea: "shopping", minWidth: 0 }}>{shopping}</div>
        <div style={{ gridArea: "traffic",  minWidth: 0 }}>{traffic}</div>
        <div style={{ gridArea: "blog",     minWidth: 0 }}>{blog}</div>
      </div>

      {/* 태블릿 */}
      <div className="bento-tablet"> 
        <div style={{ minWidth: 0, height: 420 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 340 }}>{stock}</div>        
        <div style={{ minWidth: 0, height: 380 }}>{shopping}</div>
        <div style={{ minWidth: 0, height: 520, gridColumn: "span 2" }}>{traffic}</div>
        <div style={{ minWidth: 0, height: 320, gridColumn: "span 2" }}>{blog}</div>
      </div>

      {/* 모바일 */}
      <div className="bento-mobile">       
        <div style={{ minWidth: 0, height: 480 }}><BudgetWidget /></div>
        <div style={{ minWidth: 0, height: 460 }}>{stock}</div>        
        <div style={{ minWidth: 0, height: 380 }}>{shopping}</div>
        <div style={{ minWidth: 0, height: 560 }}>{traffic}</div>
        <div style={{ minWidth: 0, height: 360 }}>{blog}</div>
      </div>
    </div>
  );
}
