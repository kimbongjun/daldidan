import { FALLBACK_DEALS } from "@/lib/data/fallback";
import { ShoppingDeal, ShoppingResponse, ShoppingSearchResult, UsedItem } from "@/lib/data/types";

const NAVER_SEARCH_KEYWORDS = [
  "애플워치 할인",
  "다이슨 에어랩 특가",
  "로봇청소기 세일",
  "무선이어폰 할인",
  "운동화 세일",
  "캡슐커피 머신 할인",
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
  return value.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').trim();
}

function toDeal(item: NaverShoppingItem): ShoppingDeal | null {
  const salePrice = Number(item.lprice);
  const originalPrice = Number(item.hprice);
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;
  if (!Number.isFinite(originalPrice) || originalPrice <= salePrice) return null;

  const discountPct = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  if (discountPct < 1) return null;

  return {
    id: `naver-${item.productId}`,
    title: stripHtml(item.title),
    store: item.mallName || "Naver Shopping",
    category: [item.category2, item.category3, item.category4].filter(Boolean).pop() || item.category1 || "기타",
    originalPrice,
    salePrice,
    discountPct,
    purchaseUrl: item.link,
    image: item.image,
    mallName: item.mallName,
    brand: item.brand,
    description: `${item.brand || item.mallName || "상품"} · Naver Shopping 검색 결과`,
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
        const deal = toDeal(item);
        if (!deal) continue;
        if (!deduped.has(deal.id) || deduped.get(deal.id)!.discountPct < deal.discountPct) {
          deduped.set(deal.id, deal);
        }
      }
    }

    const deals = [...deduped.values()].sort((a, b) => b.discountPct - a.discountPct).slice(0, 18);

    if (!deals.length) {
      return {
        deals: FALLBACK_DEALS,
        source: "fallback",
        fetchedAt: new Date().toISOString(),
        error: "할인 상품을 찾지 못했습니다. 샘플 데이터를 표시합니다.",
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

// productType=4 는 중고 상품 (중고나라·번개장터 등)
const USED_PRODUCT_TYPE = "4";

function toUsedItem(item: NaverShoppingItem): UsedItem | null {
  const price = Number(item.lprice);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    id: `naver-used-${item.productId}`,
    title: stripHtml(item.title),
    price,
    link: item.link,
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

    // 할인율 낮아서 toDeal 필터링에 걸린 일반 상품도 중고 아닌 저렴한 상품으로 포함
    const allNewRaw = items
      .filter((it) => it.productType !== USED_PRODUCT_TYPE)
      .slice(0, 20)
      .map((it) => {
        const price = Number(it.lprice);
        if (!Number.isFinite(price) || price <= 0) return null;
        const existing = newItems.find((d) => d.id === `naver-${it.productId}`);
        if (existing) return null;
        return {
          id: `naver-raw-${it.productId}`,
          title: stripHtml(it.title),
          store: it.mallName || "Naver Shopping",
          category: [it.category2, it.category3].filter(Boolean).pop() || it.category1 || "기타",
          originalPrice: price,
          salePrice: price,
          discountPct: 0,
          purchaseUrl: it.link,
          image: it.image || undefined,
          mallName: it.mallName,
          brand: it.brand || undefined,
          source: "naver" as const,
          fetchedAt: new Date().toISOString(),
        } satisfies ShoppingDeal;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const mergedNew = [...newItems, ...allNewRaw].slice(0, 20);

    return {
      keyword,
      newItems: mergedNew,
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
