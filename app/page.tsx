import DashboardShell from "@/components/home/DashboardShell";
import { getPublishedBlogPosts } from "@/lib/blog";

export const revalidate = 120;

export default async function Home() {
  const initialBlogPosts = await getPublishedBlogPosts(3);

  return (
    <DashboardShell
      initialBlogPosts={initialBlogPosts}
    />
  );
}
