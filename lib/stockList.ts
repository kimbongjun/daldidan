// KOSPI / KOSDAQ 주요 종목 (시총 상위 + 섹터 대표)
// 가격/변동은 데모 데이터이며 실시간 연동 시 교체 필요

export interface StockItem {
  symbol: string;
  name: string;
  market: "KOSPI" | "KOSDAQ" | "NYSE" | "NASDAQ";
  sector: string;
  price: number;
  changePct: number;
}

export const KR_STOCKS: StockItem[] = [
  // ── KOSPI ──────────────────────────────────────────────────────────────────
  { symbol:"005930", name:"삼성전자",     market:"KOSPI", sector:"반도체",    price:74200,   changePct:1.5   },
  { symbol:"000660", name:"SK하이닉스",   market:"KOSPI", sector:"반도체",    price:185500,  changePct:-1.23 },
  { symbol:"005490", name:"POSCO홀딩스",  market:"KOSPI", sector:"철강/금속", price:379500,  changePct:0.66  },
  { symbol:"005380", name:"현대차",       market:"KOSPI", sector:"자동차",    price:241500,  changePct:1.34  },
  { symbol:"000270", name:"기아",         market:"KOSPI", sector:"자동차",    price:112000,  changePct:0.9   },
  { symbol:"051910", name:"LG화학",       market:"KOSPI", sector:"화학",      price:298000,  changePct:-1.49 },
  { symbol:"006400", name:"삼성SDI",      market:"KOSPI", sector:"2차전지",   price:272000,  changePct:-0.73 },
  { symbol:"035420", name:"NAVER",        market:"KOSPI", sector:"IT/인터넷", price:192000,  changePct:2.4   },
  { symbol:"035720", name:"카카오",       market:"KOSPI", sector:"IT/인터넷", price:37350,   changePct:1.08  },
  { symbol:"028260", name:"삼성물산",     market:"KOSPI", sector:"건설/지주", price:148200,  changePct:0.34  },
  { symbol:"207940", name:"삼성바이오로직스",market:"KOSPI",sector:"바이오",  price:892000,  changePct:0.11  },
  { symbol:"068270", name:"셀트리온",     market:"KOSPI", sector:"바이오",    price:172300,  changePct:-0.46 },
  { symbol:"012330", name:"현대모비스",   market:"KOSPI", sector:"자동차부품",price:241000,  changePct:0.75  },
  { symbol:"032830", name:"삼성생명",     market:"KOSPI", sector:"금융",      price:91000,   changePct:0.55  },
  { symbol:"055550", name:"신한지주",     market:"KOSPI", sector:"금융",      price:52900,   changePct:0.95  },
  { symbol:"105560", name:"KB금융",       market:"KOSPI", sector:"금융",      price:87600,   changePct:1.16  },
  { symbol:"086790", name:"하나금융지주", market:"KOSPI", sector:"금융",      price:67400,   changePct:0.89  },
  { symbol:"017670", name:"SK텔레콤",     market:"KOSPI", sector:"통신",      price:55100,   changePct:0.18  },
  { symbol:"030200", name:"KT",           market:"KOSPI", sector:"통신",      price:40400,   changePct:0.5   },
  { symbol:"066570", name:"LG전자",       market:"KOSPI", sector:"가전",      price:93000,   changePct:-0.32 },
  { symbol:"010950", name:"S-Oil",        market:"KOSPI", sector:"에너지",    price:72100,   changePct:-0.28 },
  { symbol:"096770", name:"SK이노베이션", market:"KOSPI", sector:"에너지",    price:108000,  changePct:-1.10 },
  { symbol:"003670", name:"포스코퓨처엠", market:"KOSPI", sector:"2차전지",   price:185500,  changePct:-2.11 },
  { symbol:"009830", name:"한화솔루션",   market:"KOSPI", sector:"화학",      price:29700,   changePct:1.54  },
  { symbol:"011200", name:"HMM",          market:"KOSPI", sector:"해운",      price:18440,   changePct:3.25  },
  { symbol:"000100", name:"유한양행",     market:"KOSPI", sector:"제약",      price:109700,  changePct:0.37  },
  { symbol:"326030", name:"SK바이오팜",   market:"KOSPI", sector:"바이오",    price:82900,   changePct:-1.30 },
  { symbol:"373220", name:"LG에너지솔루션",market:"KOSPI",sector:"2차전지",   price:380000,  changePct:-0.92 },
  { symbol:"247540", name:"에코프로비엠", market:"KOSPI", sector:"2차전지",   price:166500,  changePct:-1.54 },
  { symbol:"034220", name:"LG디스플레이", market:"KOSPI", sector:"디스플레이",price:9640,    changePct:1.26  },

  // ── KOSDAQ ──────────────────────────────────────────────────────────────────
  { symbol:"293490", name:"카카오게임즈", market:"KOSDAQ",sector:"게임",      price:16600,   changePct:-0.60 },
  { symbol:"263750", name:"펄어비스",     market:"KOSDAQ",sector:"게임",      price:29400,   changePct:1.73  },
  { symbol:"112040", name:"위메이드",     market:"KOSDAQ",sector:"게임",      price:26250,   changePct:-2.22 },
  { symbol:"259960", name:"크래프톤",     market:"KOSPI", sector:"게임",      price:285500,  changePct:2.16  },
  { symbol:"041510", name:"에스엠",       market:"KOSDAQ",sector:"엔터",      price:83500,   changePct:0.60  },
  { symbol:"035900", name:"JYP Ent.",     market:"KOSDAQ",sector:"엔터",      price:49900,   changePct:1.22  },
  { symbol:"122870", name:"와이지엔터테인먼트",market:"KOSDAQ",sector:"엔터", price:38350,   changePct:0.26  },
  { symbol:"352820", name:"하이브",       market:"KOSPI", sector:"엔터",      price:178500,  changePct:-0.56 },
  { symbol:"196170", name:"알테오젠",     market:"KOSDAQ",sector:"바이오",    price:208500,  changePct:3.47  },
  { symbol:"091990", name:"셀트리온헬스케어",market:"KOSDAQ",sector:"바이오", price:43500,   changePct:-1.14 },
  { symbol:"145020", name:"휴젤",         market:"KOSDAQ",sector:"바이오",    price:220500,  changePct:0.91  },
  { symbol:"214150", name:"클래시스",     market:"KOSDAQ",sector:"의료기기",  price:43550,   changePct:2.58  },
  { symbol:"039030", name:"이오테크닉스", market:"KOSDAQ",sector:"반도체장비",price:121500,  changePct:1.67  },
  { symbol:"357780", name:"솔브레인",     market:"KOSDAQ",sector:"반도체소재",price:267000,  changePct:0.75  },
  { symbol:"054040", name:"한국전자금융", market:"KOSDAQ",sector:"핀테크",    price:8790,    changePct:0.46  },
  { symbol:"095340", name:"ISC",          market:"KOSDAQ",sector:"반도체",    price:49650,   changePct:-0.30 },
  { symbol:"086900", name:"메디오젠",     market:"KOSDAQ",sector:"바이오",    price:30500,   changePct:4.11  },
  { symbol:"240810", name:"원익IPS",      market:"KOSDAQ",sector:"반도체장비",price:36100,   changePct:1.40  },
  { symbol:"064760", name:"티씨케이",     market:"KOSDAQ",sector:"반도체소재",price:116600,  changePct:2.29  },
  { symbol:"058470", name:"리노공업",     market:"KOSDAQ",sector:"반도체",    price:194500,  changePct:0.83  },
];

export const US_STOCKS: StockItem[] = [
  { symbol:"AAPL",  name:"Apple",          market:"NASDAQ", sector:"IT",        price:213.07, changePct:1.02  },
  { symbol:"NVDA",  name:"NVIDIA",         market:"NASDAQ", sector:"반도체",    price:875.4,  changePct:-1.39 },
  { symbol:"TSLA",  name:"Tesla",          market:"NASDAQ", sector:"전기차",    price:172.63, changePct:3.22  },
  { symbol:"MSFT",  name:"Microsoft",      market:"NASDAQ", sector:"IT",        price:415.2,  changePct:0.92  },
  { symbol:"GOOGL", name:"Alphabet",       market:"NASDAQ", sector:"IT",        price:165.54, changePct:0.75  },
  { symbol:"AMZN",  name:"Amazon",         market:"NASDAQ", sector:"이커머스",  price:185.0,  changePct:1.55  },
  { symbol:"META",  name:"Meta",           market:"NASDAQ", sector:"소셜미디어",price:499.3,  changePct:2.11  },
  { symbol:"NFLX",  name:"Netflix",        market:"NASDAQ", sector:"미디어",    price:625.4,  changePct:0.43  },
  { symbol:"AMD",   name:"AMD",            market:"NASDAQ", sector:"반도체",    price:169.8,  changePct:-0.82 },
  { symbol:"INTC",  name:"Intel",          market:"NASDAQ", sector:"반도체",    price:30.45,  changePct:-1.23 },
  { symbol:"QCOM",  name:"Qualcomm",       market:"NASDAQ", sector:"반도체",    price:167.2,  changePct:0.58  },
  { symbol:"AVGO",  name:"Broadcom",       market:"NASDAQ", sector:"반도체",    price:1321.5, changePct:1.77  },
  { symbol:"JPM",   name:"JPMorgan Chase", market:"NYSE",   sector:"금융",      price:211.4,  changePct:0.34  },
  { symbol:"BAC",   name:"Bank of America",market:"NYSE",   sector:"금융",      price:38.75,  changePct:0.52  },
  { symbol:"V",     name:"Visa",           market:"NYSE",   sector:"금융",      price:281.3,  changePct:0.67  },
  { symbol:"JNJ",   name:"Johnson&Johnson",market:"NYSE",   sector:"헬스케어",  price:156.2,  changePct:-0.11 },
  { symbol:"WMT",   name:"Walmart",        market:"NYSE",   sector:"유통",      price:67.8,   changePct:0.29  },
  { symbol:"DIS",   name:"Disney",         market:"NYSE",   sector:"미디어",    price:111.3,  changePct:1.08  },
  { symbol:"PLTR",  name:"Palantir",       market:"NYSE",   sector:"AI/데이터", price:22.85,  changePct:4.35  },
  { symbol:"COIN",  name:"Coinbase",       market:"NASDAQ", sector:"핀테크",    price:234.6,  changePct:-2.47 },
];

export const ALL_STOCKS: StockItem[] = [...KR_STOCKS, ...US_STOCKS];
