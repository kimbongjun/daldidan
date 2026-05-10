import type { TravelContinent } from "@/lib/travel-shared";

export interface CountryData {
  en: string;
  ko: string;
  lat: number;
  lng: number;
  continent: TravelContinent;
}

export const COUNTRIES: CountryData[] = [
  { en: "South Korea", ko: "대한민국", lat: 37.5665, lng: 126.9780, continent: "Asia" },
  { en: "Japan", ko: "일본", lat: 35.6762, lng: 139.6503, continent: "Asia" },
  { en: "China", ko: "중국", lat: 39.9042, lng: 116.4074, continent: "Asia" },
  { en: "Taiwan", ko: "대만", lat: 25.0330, lng: 121.5654, continent: "Asia" },
  { en: "Hong Kong", ko: "홍콩", lat: 22.3193, lng: 114.1694, continent: "Asia" },
  { en: "Macau", ko: "마카오", lat: 22.1987, lng: 113.5439, continent: "Asia" },
  { en: "Thailand", ko: "태국", lat: 13.7563, lng: 100.5018, continent: "Asia" },
  { en: "Vietnam", ko: "베트남", lat: 21.0285, lng: 105.8542, continent: "Asia" },
  { en: "Singapore", ko: "싱가포르", lat: 1.3521, lng: 103.8198, continent: "Asia" },
  { en: "Indonesia", ko: "인도네시아", lat: -6.2088, lng: 106.8456, continent: "Asia" },
  { en: "Philippines", ko: "필리핀", lat: 14.5995, lng: 120.9842, continent: "Asia" },
  { en: "Malaysia", ko: "말레이시아", lat: 3.1390, lng: 101.6869, continent: "Asia" },
  { en: "Cambodia", ko: "캄보디아", lat: 11.5564, lng: 104.9282, continent: "Asia" },
  { en: "Myanmar", ko: "미얀마", lat: 16.8661, lng: 96.1951, continent: "Asia" },
  { en: "Laos", ko: "라오스", lat: 17.9757, lng: 102.6331, continent: "Asia" },
  { en: "Nepal", ko: "네팔", lat: 27.7172, lng: 85.3240, continent: "Asia" },
  { en: "India", ko: "인도", lat: 28.6139, lng: 77.2090, continent: "Asia" },
  { en: "Sri Lanka", ko: "스리랑카", lat: 6.9271, lng: 79.8612, continent: "Asia" },
  { en: "Maldives", ko: "몰디브", lat: 4.1755, lng: 73.5093, continent: "Asia" },
  { en: "Mongolia", ko: "몽골", lat: 47.9077, lng: 106.8832, continent: "Asia" },
  { en: "Uzbekistan", ko: "우즈베키스탄", lat: 41.2995, lng: 69.2401, continent: "Asia" },
  { en: "Kazakhstan", ko: "카자흐스탄", lat: 51.1801, lng: 71.4460, continent: "Asia" },
  { en: "Israel", ko: "이스라엘", lat: 31.7683, lng: 35.2137, continent: "Asia" },
  { en: "Jordan", ko: "요르단", lat: 31.9539, lng: 35.9106, continent: "Asia" },
  { en: "UAE", ko: "아랍에미리트", lat: 25.2048, lng: 55.2708, continent: "Asia" },
  { en: "Qatar", ko: "카타르", lat: 25.2854, lng: 51.5310, continent: "Asia" },
  { en: "Saudi Arabia", ko: "사우디아라비아", lat: 24.7136, lng: 46.6753, continent: "Asia" },
  { en: "Turkey", ko: "튀르키예", lat: 39.9334, lng: 32.8597, continent: "Asia" },
  { en: "France", ko: "프랑스", lat: 48.8566, lng: 2.3522, continent: "Europe" },
  { en: "Italy", ko: "이탈리아", lat: 41.9028, lng: 12.4964, continent: "Europe" },
  { en: "Spain", ko: "스페인", lat: 40.4168, lng: -3.7038, continent: "Europe" },
  { en: "United Kingdom", ko: "영국", lat: 51.5074, lng: -0.1278, continent: "Europe" },
  { en: "Germany", ko: "독일", lat: 52.5200, lng: 13.4050, continent: "Europe" },
  { en: "Netherlands", ko: "네덜란드", lat: 52.3676, lng: 4.9041, continent: "Europe" },
  { en: "Belgium", ko: "벨기에", lat: 50.8503, lng: 4.3517, continent: "Europe" },
  { en: "Switzerland", ko: "스위스", lat: 46.9481, lng: 7.4474, continent: "Europe" },
  { en: "Austria", ko: "오스트리아", lat: 48.2082, lng: 16.3738, continent: "Europe" },
  { en: "Portugal", ko: "포르투갈", lat: 38.7223, lng: -9.1393, continent: "Europe" },
  { en: "Greece", ko: "그리스", lat: 37.9838, lng: 23.7275, continent: "Europe" },
  { en: "Czech Republic", ko: "체코", lat: 50.0755, lng: 14.4378, continent: "Europe" },
  { en: "Hungary", ko: "헝가리", lat: 47.4979, lng: 19.0402, continent: "Europe" },
  { en: "Poland", ko: "폴란드", lat: 52.2297, lng: 21.0122, continent: "Europe" },
  { en: "Sweden", ko: "스웨덴", lat: 59.3293, lng: 18.0686, continent: "Europe" },
  { en: "Norway", ko: "노르웨이", lat: 59.9139, lng: 10.7522, continent: "Europe" },
  { en: "Denmark", ko: "덴마크", lat: 55.6761, lng: 12.5683, continent: "Europe" },
  { en: "Finland", ko: "핀란드", lat: 60.1699, lng: 24.9384, continent: "Europe" },
  { en: "Iceland", ko: "아이슬란드", lat: 64.1466, lng: -21.9426, continent: "Europe" },
  { en: "Croatia", ko: "크로아티아", lat: 45.8150, lng: 15.9819, continent: "Europe" },
  { en: "Ireland", ko: "아일랜드", lat: 53.3498, lng: -6.2603, continent: "Europe" },
  { en: "Romania", ko: "루마니아", lat: 44.4268, lng: 26.1025, continent: "Europe" },
  { en: "Russia", ko: "러시아", lat: 55.7558, lng: 37.6173, continent: "Europe" },
  { en: "United States", ko: "미국", lat: 38.9072, lng: -77.0369, continent: "NorthAmerica" },
  { en: "Canada", ko: "캐나다", lat: 45.4215, lng: -75.6972, continent: "NorthAmerica" },
  { en: "Mexico", ko: "멕시코", lat: 19.4326, lng: -99.1332, continent: "NorthAmerica" },
  { en: "Brazil", ko: "브라질", lat: -15.8267, lng: -47.9218, continent: "SouthAmerica" },
  { en: "Argentina", ko: "아르헨티나", lat: -34.6037, lng: -58.3816, continent: "SouthAmerica" },
  { en: "Peru", ko: "페루", lat: -12.0464, lng: -77.0428, continent: "SouthAmerica" },
  { en: "Chile", ko: "칠레", lat: -33.4489, lng: -70.6693, continent: "SouthAmerica" },
  { en: "Colombia", ko: "콜롬비아", lat: 4.7110, lng: -74.0721, continent: "SouthAmerica" },
  { en: "Cuba", ko: "쿠바", lat: 23.1136, lng: -82.3666, continent: "NorthAmerica" },
  { en: "Costa Rica", ko: "코스타리카", lat: 9.9281, lng: -84.0907, continent: "NorthAmerica" },
  { en: "Egypt", ko: "이집트", lat: 30.0444, lng: 31.2357, continent: "Africa" },
  { en: "Morocco", ko: "모로코", lat: 33.9716, lng: -6.8498, continent: "Africa" },
  { en: "South Africa", ko: "남아프리카공화국", lat: -25.7479, lng: 28.2293, continent: "Africa" },
  { en: "Kenya", ko: "케냐", lat: -1.2921, lng: 36.8219, continent: "Africa" },
  { en: "Tanzania", ko: "탄자니아", lat: -6.7924, lng: 39.2083, continent: "Africa" },
  { en: "Ethiopia", ko: "에티오피아", lat: 9.0320, lng: 38.7469, continent: "Africa" },
  { en: "Tunisia", ko: "튀니지", lat: 36.8190, lng: 10.1658, continent: "Africa" },
  { en: "Australia", ko: "호주", lat: -33.8688, lng: 151.2093, continent: "Oceania" },
  { en: "New Zealand", ko: "뉴질랜드", lat: -36.8485, lng: 174.7633, continent: "Oceania" },
  { en: "Fiji", ko: "피지", lat: -18.1416, lng: 178.4419, continent: "Oceania" },
  { en: "Hawaii", ko: "하와이", lat: 21.3069, lng: -157.8583, continent: "Oceania" },
];

export function findCountryByName(name: string): CountryData | undefined {
  const q = name.trim().toLowerCase();
  return COUNTRIES.find(
    (c) => c.ko.toLowerCase() === q || c.en.toLowerCase() === q,
  );
}

export function searchCountries(query: string): CountryData[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRIES;
  return COUNTRIES.filter(
    (c) => c.ko.toLowerCase().includes(q) || c.en.toLowerCase().includes(q),
  );
}
