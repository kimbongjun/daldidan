import DashboardShell from "@/components/home/DashboardShell";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getMarketSnapshot } from "@/lib/data/market";
import { getShoppingDeals } from "@/lib/data/shopping";

export const revalidate = 120;

export default async function Home() {
  const [initialMarketData, initialShoppingData, initialBlogPosts] = await Promise.all([
    getMarketSnapshot(),
    getShoppingDeals(),
    getPublishedBlogPosts(3),
  ]);

  return (
    <DashboardShell
      initialMarketData={initialMarketData}
      initialShoppingData={initialShoppingData}
      initialBlogPosts={initialBlogPosts}
    />
  );
}
