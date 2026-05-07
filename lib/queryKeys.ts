export const queryKeys = {
  stocks: {
    quotes: (items: string) => ["stocks", "quotes", items] as const,
  },
  watchlist: {
    all: ["watchlist"] as const,
  },
  budget: {
    byMonth: (month: string) => ["budget", month] as const,
    allTransactions: ["budget", "allTransactions"] as const,
  },
  calendar: {
    byMonth: (year: number, month: number) => ["calendar", year, month] as const,
  },
  blog: {
    posts: (limit: number) => ["blog", "posts", limit] as const,
  },
  lotto: {
    latest: ["lotto", "latest"] as const,
  },
  realEstate: {
    subscriptions: ["realEstate", "subscriptions"] as const,
    transactions: ["realEstate", "transactions"] as const,
    rates: ["realEstate", "rates"] as const,
    illegalResupply: ["realEstate", "illegalResupply"] as const,
  },
  pushDevices: {
    all: ["pushDevices"] as const,
  },
  pushLogs: {
    filtered: (type: string, page: number) => ["pushLogs", type, page] as const,
  },
  siteSettings: {
    all: ["siteSettings"] as const,
  },
  travel: {
    activities: ["travel", "activities"] as const,
  },
  user: {
    profile: ["user", "profile"] as const,
  },
  mypage: {
    profile: ["mypage", "profile"] as const,
  },
};
