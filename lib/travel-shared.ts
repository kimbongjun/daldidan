export interface TravelPlace {
  id: string;
  user_id: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  travel_date: string;
  photo_url: string | null;
  note: string | null;
  continent: string | null;
  created_at: string;
}

export type TravelContinent = "Asia" | "Europe" | "Americas" | "Africa" | "Oceania";

export const CONTINENTS: TravelContinent[] = [
  "Asia",
  "Europe",
  "Americas",
  "Africa",
  "Oceania",
];

export const CONTINENT_LABELS: Record<TravelContinent, string> = {
  Asia: "아시아",
  Europe: "유럽",
  Americas: "아메리카",
  Africa: "아프리카",
  Oceania: "오세아니아",
};
