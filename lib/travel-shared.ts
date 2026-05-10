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
  is_domestic: boolean;
  province: string | null;
  drive_link: string | null;
  created_at: string;
  updated_at: string;
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

export type KoreaRegion = "서울" | "경기/인천" | "강원" | "충청" | "전라" | "경상" | "제주";

export const KOREA_REGIONS: KoreaRegion[] = [
  "서울", "경기/인천", "강원", "충청", "전라", "경상", "제주",
];

export const KOREA_REGION_LABELS: Record<KoreaRegion, string> = {
  "서울": "서울",
  "경기/인천": "경기/인천",
  "강원": "강원",
  "충청": "충청",
  "전라": "전라",
  "경상": "경상",
  "제주": "제주",
};

export const KOREA_PROVINCES = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
] as const;

export type KoreaProvince = typeof KOREA_PROVINCES[number];

export const PROVINCE_TO_REGION: Record<string, KoreaRegion> = {
  "서울특별시": "서울",
  "인천광역시": "경기/인천",
  "경기도": "경기/인천",
  "강원도": "강원",
  "강원특별자치도": "강원",
  "충청북도": "충청",
  "충청남도": "충청",
  "대전광역시": "충청",
  "세종특별자치시": "충청",
  "전라북도": "전라",
  "전북특별자치도": "전라",
  "전라남도": "전라",
  "광주광역시": "전라",
  "경상북도": "경상",
  "경상남도": "경상",
  "대구광역시": "경상",
  "부산광역시": "경상",
  "울산광역시": "경상",
  "제주특별자치도": "제주",
};

export const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "서울특별시": { lat: 37.5665, lng: 126.978 },
  "부산광역시": { lat: 35.1796, lng: 129.0756 },
  "대구광역시": { lat: 35.8714, lng: 128.6014 },
  "인천광역시": { lat: 37.4563, lng: 126.7052 },
  "광주광역시": { lat: 35.1595, lng: 126.8526 },
  "대전광역시": { lat: 36.3504, lng: 127.3845 },
  "울산광역시": { lat: 35.5384, lng: 129.3114 },
  "세종특별자치시": { lat: 36.48, lng: 127.289 },
  "경기도": { lat: 37.4138, lng: 127.5183 },
  "강원특별자치도": { lat: 37.8813, lng: 127.8671 },
  "충청북도": { lat: 36.6358, lng: 127.4918 },
  "충청남도": { lat: 36.5184, lng: 126.8 },
  "전북특별자치도": { lat: 35.7175, lng: 127.1531 },
  "전라남도": { lat: 34.8679, lng: 126.991 },
  "경상북도": { lat: 36.4919, lng: 128.8889 },
  "경상남도": { lat: 35.4606, lng: 128.2132 },
  "제주특별자치도": { lat: 33.4996, lng: 126.5312 },
};
