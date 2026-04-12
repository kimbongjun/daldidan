import DashboardShell from "@/components/home/DashboardShell";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getShoppingDeals } from "@/lib/data/shopping";

export const revalidate = 120;

export default async function Home() {
  const [initialShoppingData, initialBlogPosts] = await Promise.all([
    getShoppingDeals(),
    getPublishedBlogPosts(3),
  ]);

  return (
    <DashboardShell
      initialShoppingData={initialShoppingData}
      initialBlogPosts={initialBlogPosts}
    />
  );
}
