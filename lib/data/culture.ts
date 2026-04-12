import { FALLBACK_CULTURE_DETAILS, FALLBACK_CULTURE_ITEMS } from "@/lib/data/fallback";
import { CultureDetail, CultureItem, CultureResponse } from "@/lib/data/types";

type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
};

type TmdbNowPlayingResponse = {
  results?: TmdbMovie[];
};

type TmdbMovieDetail = TmdbMovie & {
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ name: string }>;
};

type TicketmasterEvent = {
  id: string;
  name: string;
  info?: string;
  pleaseNote?: string;
  images?: Array<{ url: string; width: number }>;
  dates?: {
    status?: { code?: string };
    start?: { localDate?: string; localTime?: string };
  };
  url?: string;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      address?: { line1?: string };
    }>;
    attractions?: Array<{ name?: string }>;
  };
};

type TicketmasterResponse = {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
};

type SeoulEvent = {
  CODENAME?: string;
  GUNAME?: string;
  TITLE?: string;
  DATE?: string;
  PLACE?: string;
  ORG_LINK?: string;
  MAIN_IMG?: string;
  PROGRAM?: string;
  USE_TRGT?: string;
  IS_FREE?: string;
};

type SeoulResponse = {
  culturalEventInfo?: {
    row?: SeoulEvent[];
  };
};

function toSlug(prefix: string, id: string | number) {
  return `${prefix}-${id}`;
}

function formatDateLabel(value?: string) {
  if (!value) return "일정 확인";
  return value;
}

export async function getCultureItems(): Promise<CultureResponse> {
  const tmdbKey = process.env.TMDB_API_KEY;
  const ticketmasterKey = process.env.TICKETMASTER_API_KEY;
  const seoulKey = process.env.SEOUL_OPEN_API_KEY;

  const items: CultureItem[] = [];

  try {
    if (tmdbKey) {
      const response = await fetch(buildTmdbUrl("/movie/now_playing", tmdbKey, "language=ko-KR&region=KR&page=1"), {
        next: { revalidate: 1800 },
        headers: buildTmdbHeaders(tmdbKey),
      });
      if (response.ok) {
        const data = (await response.json()) as TmdbNowPlayingResponse;
        for (const movie of (data.results ?? []).slice(0, 6)) {
          items.push({
            id: `tmdb-${movie.id}`,
            slug: toSlug("tmdb", movie.id),
            type: "movie",
            title: movie.title,
            venue: "국내 상영관",
            dateLabel: "현재 상영중",
            summary: movie.overview || "현재 상영중인 영화",
            image: movie.backdrop_path ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}` : undefined,
            rating: Number(movie.vote_average.toFixed(1)),
            tags: ["movie", "now playing"],
            detailUrl: `https://www.themoviedb.org/movie/${movie.id}`,
            bookingUrl: "https://www.cgv.co.kr",
            source: "tmdb",
          });
        }
      }
    }

    if (ticketmasterKey) {
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?classificationName=music&size=6&sort=date,asc&countryCode=KR&apikey=${ticketmasterKey}`,
        { next: { revalidate: 1800 } },
      );
      if (response.ok) {
        const data = (await response.json()) as TicketmasterResponse;
        for (const event of data._embedded?.events ?? []) {
          const venue = event._embedded?.venues?.[0];
          items.push({
            id: `ticketmaster-${event.id}`,
            slug: toSlug("ticketmaster", event.id),
            type: "concert",
            title: event.name,
            venue: venue?.name || "공연장 미정",
            dateLabel: formatDateLabel(event.dates?.start?.localDate),
            summary: event.info || "예매 가능한 공연 정보",
            image: event.images?.sort((a, b) => b.width - a.width)[0]?.url,
            tags: ["concert", event.dates?.status?.code || "on sale"],
            bookingUrl: event.url,
            source: "ticketmaster",
          });
        }
      }
    }

    if (seoulKey) {
      const response = await fetch(
        `http://openapi.seoul.go.kr:8088/${seoulKey}/json/culturalEventInfo/1/8/전시`,
        { next: { revalidate: 1800 } },
      );
      if (response.ok) {
        const data = (await response.json()) as SeoulResponse;
        for (const event of data.culturalEventInfo?.row ?? []) {
          items.push({
            id: `seoul-${event.TITLE}`,
            slug: toSlug("seoul", encodeURIComponent(event.TITLE ?? "event")),
            type: "exhibition",
            title: event.TITLE || "전시",
            venue: event.PLACE || event.GUNAME || "서울",
            dateLabel: event.DATE || "진행중",
            summary: event.PROGRAM || "서울 문화행사 정보",
            image: event.MAIN_IMG,
            tags: ["exhibition", event.CODENAME || "seoul"],
            bookingUrl: event.ORG_LINK,
            source: "seoul",
          });
        }
      }
    }
  } catch {
    return {
      items: FALLBACK_CULTURE_ITEMS,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!items.length) {
    return {
      items: FALLBACK_CULTURE_ITEMS,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }

  const ordered = items
    .sort((a, b) => {
      const typeOrder = { movie: 0, concert: 1, exhibition: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    })
    .slice(0, 18);

  return {
    items: ordered,
    source: "mixed-live",
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCultureDetail(slug: string): Promise<CultureDetail | null> {
  if (FALLBACK_CULTURE_DETAILS[slug]) {
    return FALLBACK_CULTURE_DETAILS[slug];
  }

  const [provider, id] = slug.split("-", 2);
  if (!provider || !id) return null;

  try {
    if (provider === "tmdb" && process.env.TMDB_API_KEY) {
      const response = await fetch(buildTmdbUrl(`/movie/${id}`, process.env.TMDB_API_KEY, "language=ko-KR"), {
        next: { revalidate: 1800 },
        headers: buildTmdbHeaders(process.env.TMDB_API_KEY),
      });
      if (!response.ok) return null;
      const movie = (await response.json()) as TmdbMovieDetail;
      return {
        id: `tmdb-${movie.id}`,
        slug,
        type: "movie",
        title: movie.title,
        venue: "국내 상영관",
        dateLabel: "현재 상영중",
        summary: movie.overview || "현재 상영중인 영화",
        description: movie.overview || "상세 설명이 없습니다.",
        image: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined,
        rating: Number(movie.vote_average.toFixed(1)),
        tags: (movie.genres ?? []).map((genre) => genre.name),
        bookingUrl: "https://www.cgv.co.kr",
        detailUrl: `https://www.themoviedb.org/movie/${movie.id}`,
        runtime: movie.runtime ? `${movie.runtime}분` : undefined,
        period: movie.release_date,
        cast: movie.production_companies?.map((company) => company.name).slice(0, 4),
        status: "상영중",
        source: "tmdb",
      };
    }
  } catch {
    return null;
  }

  const list = await getCultureItems();
  const item = list.items.find((entry) => entry.slug === slug);
  if (!item) return null;

  return {
    ...item,
    description: item.summary,
    period: item.dateLabel,
    status: item.tags[1] || item.dateLabel,
    priceInfo: "예매처 링크에서 확인",
    address: item.venue,
  };
}

function isTmdbBearerToken(value: string) {
  return value.includes(".") || value.startsWith("ey") || value.startsWith("Bearer ");
}

function buildTmdbHeaders(rawKey: string) {
  const key = rawKey.replace(/^Bearer\s+/i, "").trim();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (isTmdbBearerToken(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

function buildTmdbUrl(path: string, rawKey: string, search: string) {
  const key = rawKey.replace(/^Bearer\s+/i, "").trim();
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [name, value] of new URLSearchParams(search)) {
    url.searchParams.set(name, value);
  }

  if (!isTmdbBearerToken(key)) {
    url.searchParams.set("api_key", key);
  }

  return url.toString();
}
