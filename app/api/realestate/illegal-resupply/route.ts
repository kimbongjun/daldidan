import { NextResponse } from "next/server";

export interface IllegalResupplyItem {
  id: string;
  name: string;
  houseManageNo: string;
  announcementDate: string;
  winnerAnnouncementDate: string;
  transferRestriction: string;
  detailUrl: string;
}

const RESALE_INFO_URL = "https://www.applyhome.co.kr/rs/rsa/selectResaleListView.do";
const ILLEGAL_RESUPPLY_URL = "https://www.applyhome.co.kr/ap/aph/reqst/selectSubscrtReqstAptMainView.do?se=06&ty=20";

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

async function fetchIllegalResupplyItems(): Promise<IllegalResupplyItem[]> {
  const res = await fetch(RESALE_INFO_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124",
      "Referer": "https://www.applyhome.co.kr/",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`청약홈 HTTP ${res.status}`);
  const html = await res.text();

  const rowRegex = /<div class="aptRow"([^>]*)>([\s\S]*?)<\/table>\s*<\/div>\s*<\/div>/g;
  const items: IllegalResupplyItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null && items.length < 6) {
    const attrs = match[1] ?? "";
    const block = match[2] ?? "";
    const name = stripTags(block.match(/<div class="aptName">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");
    const houseManageNo = attrs.match(/data-hmno="([^"]+)"/)?.[1] ?? "";
    const rows = [...block.matchAll(/<tr>\s*<td>(.*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)];
    const rowMap = new Map(rows.map(([, key, value]) => [stripTags(key), stripTags(value)]));

    if (!name || !houseManageNo) continue;

    items.push({
      id: houseManageNo,
      name,
      houseManageNo,
      announcementDate: normalizeDate(rowMap.get("공고일") ?? ""),
      winnerAnnouncementDate: normalizeDate(rowMap.get("당첨자 발표일") ?? ""),
      transferRestriction: rowMap.get("전매제한") ?? "정보 없음",
      detailUrl: RESALE_INFO_URL,
    });
  }

  return items;
}

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET() {
  let items: IllegalResupplyItem[] = [];
  let apiError: string | null = null;

  try {
    items = await fetchIllegalResupplyItems();
  } catch (error) {
    apiError = error instanceof Error ? error.message : "불법행위 재공급 매물 조회 실패";
  }

  return NextResponse.json({
    items,
    sourceUrl: RESALE_INFO_URL,
    applicationUrl: ILLEGAL_RESUPPLY_URL,
    ...(apiError ? { apiError } : {}),
  });
}
