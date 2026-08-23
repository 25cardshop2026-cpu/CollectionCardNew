import type { Dictionary } from "./th";

/** ต้องมีคีย์ครบเท่าไฟล์ th.ts — TypeScript จะฟ้องตอน build ถ้าขาด */
export const en: Dictionary = {
  meta: {
    siteTitle: "Collection Card — One Piece & Pokémon card prices",
    siteDescription:
      "Price database for One Piece and Pokémon trading cards, broken down by set, variant and condition, with 90 days of price history.",
  },

  nav: {
    home: "Home",
    browse: "Browse",
    movers: "Movers",
    dashboard: "Dashboard",
    start: "Get started",
    tagline: "Card prices",
  },

  footer: {
    blurb:
      "A card price database built for collectors, with prices separated by variant and condition rather than lumped into one number.",
    phase:
      "Card data from the official One Piece Card Game site · prices are still demo data, not real market prices",
  },

  landing: {
    eyebrow: "One Piece · Pokémon",
    headlineLead: "Check the real price",
    headlineAccent: "before you buy or sell",
    sub: "A price database for trading card collectors. Every set, every variant, every condition priced separately — with history charts so you can see where a card is heading.",
    ctaPrimary: "Get started",
    ctaSecondary: "See what's moving",
    freeNote: "Free to use, no account needed",
    showcaseLabel: "Biggest movers, 7 days",

    statCards: "Cards in the database",
    statVariants: "Separately priced variants",
    statSets: "Sets in the database",
    statHistory: "Days of price history",

    featuresEyebrow: "What works today",
    featuresTitle: "Detailed enough to actually trust",
    featuresSub:
      "Most card price sites give you one number per card. That number can't guide a real trade, because price always depends on which variant you hold and what condition it's in.",

    features: [
      {
        title: "Priced by variant and condition",
        body: "The same card can be worth ten times more as an Alt Art than as a Normal. We price every variant, multiplied across five condition grades.",
        cta: "See an example",
      },
      {
        title: "90 days of price history",
        body: "Chart every variant over the last 90 days so you know whether a card is climbing or sliding before you commit.",
        cta: "View a chart",
      },
      {
        title: "Catch the big movers",
        body: "A live ranking of the cards that rose and fell hardest over seven days, recalculated every time a price is recorded.",
        cta: "See the ranking",
      },
      {
        title: "JP and EN kept apart",
        body: "The same set in a different language is a different market at a different price. We store them separately from day one instead of averaging them together.",
        cta: "Pick a game",
      },
    ],

    upcomingChip: "In development",
    upcomingTitle: "Your own collection comes next",
    upcomingSub:
      "Right now this is a price database and nothing more. The next phase lets you record the cards you actually own and track their value like an investment portfolio.",
    upcoming: [
      "Log your own collection and see how close each set is to complete",
      "Portfolio value over time, with gains and losses against what you paid",
      "Alerts when a card on your wishlist drops to your target price",
      "Add cards by photographing them instead of typing card numbers",
    ],

    finalTitle: "Start checking prices now",
    finalSub: (cards: string, sets: number, price: string) =>
      `${cards} cards across ${sets} sets to explore. The most valuable card in the database right now sits at ${price}.`,
  },

  browse: {
    title: "Browse",
    heading: "Which game are you collecting?",
    sub: "Pick a game to see every set, then drill into the price of any individual card.",
    description:
      "Browse every One Piece and Pokémon card set with current market prices.",
    cards: "Cards",
    sets: "Sets",
    updated: "Updated",
    moversTitle: "Biggest movers, 7 days",
    seeAll: "See all →",
  },

  game: {
    title: (game: string) => `${game} sets`,
    description: (game: string) =>
      `Every ${game} set, with card counts and release dates.`,
    inDb: "In database",
    empty: "No sets for this game yet.",
    progressLabel: (pct: number) => `${pct}% of this set is in the database`,
  },

  set: {
    title: (code: string, name: string) => `${code} ${name} — full set prices`,
    description: (code: string, name: string) =>
      `Current prices for every card in ${code} ${name}, broken down by variant and condition.`,
    released: "Released",
    rarity: "Rarity",
    sortBy: "Sort by",
    all: "All",
    byNumber: "Card number",
    byPrice: "Highest price",
    byChange: "Biggest move",
    has: (variant: string) => `${variant} available`,
    empty: "No cards match this filter.",
  },

  card: {
    title: (number: string, name: string, price: string) =>
      `${number} ${name} — latest price ${price}`,
    description: (name: string, nameEn: string, number: string, set: string) =>
      `Price for ${nameEn} (${name}) ${number} from ${set}, broken down by variant and condition, with 90 days of history.`,
    noPrice: "no data yet",
    conditionNm: "NM condition",
    per7d: "/ 7 days",
    updated: "Updated",
    historyTitle: "90-day price history",
    historyLabel: (name: string) => `90-day price history chart for ${name}`,
    priceTableTitle: "Price by variant and condition",
    psaLabel: "PSA 10",
    psaNote: "graded gem mint",
    priceNote:
      "Price attaches to a variant and a condition, never to the card alone. The PSA 10 column is a graded gem-mint copy, a separate market from raw cards: it is estimated from the raw price plus a per-card premium, floored at what grading costs to begin with. BGS is coming in a later phase.",
    siblings: (code: string) => `More from ${code}`,
    notEnoughData: "Not enough price data to draw a chart yet.",
    low: "Low",
    high: "High",
    days: (n: number) => `${n} days`,
  },

  channel: {
    title: "Price by channel",
    ebay: "eBay",
    snkrdunk: "SNKRDUNK",
    estimated: "estimated",
    empty: "No price recorded yet",
    note: "Channel prices are entered by hand in the dashboard, not fetched automatically yet.",
  },

  search: {
    title: "Search",
    heading: "Find a card by name",
    placeholder: "Card name or number",
    submit: "Search",
    hint: "Type at least 2 characters. Works on Thai names, English names and card numbers — try Luffy, Shanks or OP01-120.",
    noResults: (q: string) => `No cards match "${q}"`,
    found: (n: number) => `${n} cards`,
  },

  movers: {
    title: "Biggest movers, 7 days",
    description:
      "One Piece and Pokémon cards with the largest price moves over the past seven days.",
    eyebrow: "Last 7 days",
    heading: "Biggest movers",
    sub: "Ranked by how far the price moved, up or down, measured on NM condition.",
    colRank: "#",
    colCard: "Card",
    colSet: "Set",
    colVariant: "Variant",
    colPrice: "Price",
    colChange: "7d",
  },

  variant: {
    normal: "Normal",
    parallel: "Parallel",
    alt_art: "Alt Art",
    manga: "Manga Rare",
    full_art: "Full Art",
    promo: "Promo",
  },

  cardType: {
    Leader: "Leader",
    Character: "Character",
    Event: "Event",
    Stage: "Stage",
  },

  color: {
    แดง: "Red",
    เขียว: "Green",
    ฟ้า: "Blue",
    ม่วง: "Purple",
    ดำ: "Black",
    เหลือง: "Yellow",
    ไม่มีสี: "Colorless",
  },

  tier: {
    mythic: "Chase",
    epic: "Very rare",
    rare: "Rare",
    common: "Common",
  },

  condition: {
    PSA10: "PSA 10",
    NM: "NM",
    LP: "LP",
    MP: "MP",
    HP: "HP",
    DMG: "DMG",
  },

  time: {
    justNow: "just now",
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n}h ago`,
    days: (n: number) => `${n}d ago`,
  },
};
