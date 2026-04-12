import { FALLBACK_DEALS } from "@/lib/data/fallback";
import { ShoppingDeal, ShoppingResponse, ShoppingSearchResult, UsedItem } from "@/lib/data/types";

const NAVER_SEARCH_KEYWORDS = [
  "이어폰 블루투스 할인",
  "청소기 추천",
  "노트북 세일",
  "의류 특가",
  "주방용품 특가",
  "헬스용품 할인",
];

type NaverShoppingItem = {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  brand: string;
  productId: string;
  productType: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
};

type NaverShoppingResponse = {
  items?: NaverShoppingItem[];
};

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** HTML 엔티티를 URL 안전하게 디코딩 */
function decodeUrl(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function toDeal(item: NaverShoppingItem): ShoppingDeal | null {
  const salePrice = Number(item.lprice);
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;

  const originalPrice = Number(item.hprice);
  // hprice 없거나 lprice 이하이면 할인 없음 (discountPct = 0)
  const hasDiscount = Number.isFinite(originalPrice) && originalPrice > salePrice;
  const discountPct = hasDiscount
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;

  const link = decodeUrl(item.link);
  if (!link.startsWith("http")) return null;

  return {
    id: `naver-${item.productId}`,
    title: stripHtml(item.title),
    store: item.mallName || "Naver Shopping",
    category: [item.category2, item.category3, item.category4].filter(Boolean).pop() || item.category1 || "기타",
    originalPrice: hasDiscount ? originalPrice : salePrice,
    salePrice,
    discountPct,
    purchaseUrl: link,
    image: item.image || undefined,
    mallName: item.mallName,
    brand: item.brand || undefined,
    description: `${item.brand || item.mallName || "상품"} · Naver Shopping`,
    source: "naver",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getShoppingDeals(): Promise<ShoppingResponse> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      deals: FALLBACK_DEALS,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
      error: "NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 비어 있습니다.",
    };
  }

  try {
    const responses = await Promise.all(
      NAVER_SEARCH_KEYWORDS.map(async (query) => {
        const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=20&sort=sim&exclude=used:rental:cbshop`;
        const response = await fetch(url, {
          next: { revalidate: 1800 },
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Naver shopping request failed (${response.status}): ${message}`);
        }

        return (await response.json()) as NaverShoppingResponse;
      }),
    );

    const deduped = new Map<string, ShoppingDeal>();
    for (const response of responses) {
      for (const item of response.items ?? []) {
        if (item.productType === "4") continue; // 중고 제외
        const deal = toDeal(item);
        if (!deal) continue;
        // 같은 상품은 할인율 높은 것 우선
        const existing = deduped.get(deal.id);
        if (!existing || existing.discountPct < deal.discountPct) {
          deduped.set(deal.id, deal);
        }
      }
    }

    const deals = [...deduped.values()]
      .sort((a, b) => b.discountPct - a.discountPct)
      .slice(0, 24);

    if (!deals.length) {
      return {
        deals: FALLBACK_DEALS,
        source: "fallback",
        fetchedAt: new Date().toISOString(),
        error: "상품 데이터를 가져오지 못했습니다.",
      };
    }

    return {
      deals,
      source: "naver-search",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      deals: FALLBACK_DEALS,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Naver shopping request failed",
    };
  }
}

// productType=4 는 중고 상품
const USED_PRODUCT_TYPE = "4";

function toUsedItem(item: NaverShoppingItem): UsedItem | null {
  const price = Number(item.lprice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const link = decodeUrl(item.link);
  if (!link.startsWith("http")) return null;
  return {
    id: `naver-used-${item.productId}`,
    title: stripHtml(item.title),
    price,
    link,
    mallName: item.mallName || "중고마켓",
    image: item.image || undefined,
    source: "naver-used",
    fetchedAt: new Date().toISOString(),
  };
}

export async function searchShopping(keyword: string): Promise<ShoppingSearchResult> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      keyword,
      newItems: [],
      usedItems: [],
      source: "no-api-key",
      fetchedAt: new Date().toISOString(),
      error: "NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 이 설정되지 않았습니다.",
    };
  }

  try {
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=40&sort=sim&exclude=rental:cbshop`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Naver search failed (${response.status}): ${message}`);
    }

    const data = (await response.json()) as NaverShoppingResponse;
    const items: NaverShoppingItem[] = data.items ?? [];

    const newItems: ShoppingDeal[] = [];
    const usedItems: UsedItem[] = [];

    for (const item of items) {
      if (item.productType === USED_PRODUCT_TYPE) {
        const usedItem = toUsedItem(item);
        if (usedItem) usedItems.push(usedItem);
      } else {
        const deal = toDeal(item);
        if (deal) newItems.push(deal);
      }
    }

    return {
      keyword,
      newItems: newItems.slice(0, 20),
      usedItems: usedItems.slice(0, 20),
      source: "naver-search",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      keyword,
      newItems: [],
      usedItems: [],
      source: "fallback",
      fetchedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "검색 요청 실패",
    };
  }
}
