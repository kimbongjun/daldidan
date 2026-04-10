import Header from "@/components/Header";
import QuickStats from "@/components/QuickStats";
import StockWidget from "@/components/widgets/StockWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import ShoppingWidget from "@/components/widgets/ShoppingWidget";
import EventWidget from "@/components/widgets/EventWidget";
import TravelWidget from "@/components/widgets/TravelWidget";
import BudgetWidget from "@/components/widgets/BudgetWidget";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-12">
        <Header />
        <QuickStats />
        <BentoGrid />
      </div>
    </div>
  );
}

function BentoGrid() {
  return (
    <>
      {/* Desktop bento (≥ 1024px) */}
      <div className="hidden lg:grid gap-4 mt-4" style={{
        gridTemplateColumns: "1fr 2fr 1fr",
        gridTemplateRows: "460px 420px",
        gridTemplateAreas: `
          "weather  stock   budget"
          "shopping event   travel"
        `,
      }}>
        <div style={{ gridArea: "weather" }}><WeatherWidget /></div>
        <div style={{ gridArea: "stock"   }}><StockWidget   /></div>
        <div style={{ gridArea: "budget"  }}><BudgetWidget  /></div>
        <div style={{ gridArea: "shopping"}}><ShoppingWidget /></div>
        <div style={{ gridArea: "event"   }}><EventWidget   /></div>
        <div style={{ gridArea: "travel"  }}><TravelWidget  /></div>
      </div>

      {/* Tablet bento (640px – 1023px) */}
      <div className="hidden sm:grid lg:hidden gap-4 mt-4" style={{
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto",
      }}>
        <div className="h-80"><WeatherWidget /></div>
        <div className="h-80"><StockWidget /></div>
        <div className="h-96"><ShoppingWidget /></div>
        <div className="h-96"><EventWidget /></div>
        <div className="h-96"><TravelWidget /></div>
        <div className="h-96"><BudgetWidget /></div>
      </div>

      {/* Mobile (< 640px) */}
      <div className="flex sm:hidden flex-col gap-4 mt-4">
        <div className="h-80"><WeatherWidget /></div>
        <div className="h-[480px]"><StockWidget /></div>
        <div className="h-96"><ShoppingWidget /></div>
        <div className="h-96"><EventWidget /></div>
        <div className="h-96"><TravelWidget /></div>
        <div className="h-[520px]"><BudgetWidget /></div>
      </div>
    </>
  );
}
