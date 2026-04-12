export type EventType = "movie" | "concert" | "exhibition";

export interface CultureItem {
  id: string;
  slug: string;
  type: EventType;
  title: string;
  venue: string;
  dateLabel: string;
  summary: string;
  image?: string;
  rating?: number;
  tags: string[];
  bookingUrl?: string;
  detailUrl?: string;
  source: "tmdb" | "ticketmaster" | "seoul" | "fallback";
}

export interface CultureDetail extends CultureItem {
  description: string;
  address?: string;
  runtime?: string;
  period?: string;
  cast?: string[];
  priceInfo?: string;
  status?: string;
}

export interface CultureResponse {
  items: CultureItem[];
  source: string;
  fetchedAt: string;
}
