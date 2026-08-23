import catalogJson from "../data/onepiece-catalog.json";
import type {
  Card,
  CardSet,
  Condition,
  Game,
  PricePoint,
  Variant,
  VariantType,
} from "./types";

/**
 * แคตตาล็อกตั้งต้นของทั้งเว็บ
 *
 * One Piece: ดึงจากเว็บทางการ (asia-th) ด้วย scripts/import-onepiece.mjs
 * แล้วเก็บไว้ที่ data/onepiece-catalog.json — เลขการ์ด ชื่อ ความหายาก
 * ประเภท และสี เป็นข้อมูลจริงทั้งหมด
 *
 * Pokémon: ยังเป็นข้อมูลตัวอย่างที่เขียนมือ รอหาแหล่งข้อมูลทางการต่อไป
 *
 * ราคาทุกใบเป็นราคาสมมติที่สร้างจากความหายาก ไม่ใช่ราคาตลาดจริง
 * จนกว่าจะมีคนกรอกราคาจริงทับผ่านแดชบอร์ด (ดู lib/repo.ts)
 */

export const GAMES: Game[] = [
  {
    slug: "one-piece",
    nameTh: "วันพีซ",
    nameEn: "One Piece Card Game",
    tagline: "การ์ดเกมจากวันพีซ เริ่มวางจำหน่ายปี 2022",
  },
  {
    slug: "pokemon",
    nameTh: "โปเกมอน",
    nameEn: "Pokémon Trading Card Game",
    tagline: "การ์ดเกมที่เก่าแก่และมีมูลค่าสะสมสูงที่สุด",
  },
];

// ---------------- One Piece จากแคตตาล็อกทางการ ----------------

interface CatalogCard {
  setCode: string;
  number: string;
  name: string;
  rarity: string;
  cardType: string;
  color: string;
  printings: string[];
}

interface CatalogSet {
  code: string;
  name: string;
  releaseDate: string;
  totalCards: number;
}

const catalog = catalogJson as {
  sets: CatalogSet[];
  cards: CatalogCard[];
};

/** ชื่อไทยของชุดที่แปลไว้แล้ว ชุดที่ยังไม่ได้แปลใช้ชื่ออังกฤษไปก่อน */
const SET_NAME_TH: Record<string, string> = {
  "OP-01": "รุ่งอรุณแห่งการผจญภัย",
  "OP-05": "การตื่นขึ้นของยุคใหม่",
  "OP-09": "จ้าวแห่งโลกใหม่",
};

/**
 * ชื่อไทยของตัวละคร เทียบด้วยชื่ออังกฤษที่ตัดอักขระพิเศษออกแล้ว
 * เพราะเว็บทางการเขียนชื่อไม่เหมือนกันทุกที่ ("Monkey.D.Luffy" กับ
 * "Monkey D. Luffy") ตัวละครหนึ่งตัวมีการ์ดหลายสิบใบ ชื่อที่แปลไว้
 * ครั้งเดียวจึงใช้ได้ทั้งเว็บ ส่วนใบที่ยังไม่มีคำแปลจะโชว์ชื่ออังกฤษ
 */
const NAME_TH: Record<string, string> = {
  roronoazoro: "โรโรโนอา โซโล",
  monkeydluffy: "มังกี้ ดี. ลูฟี่",
  nami: "นามิ",
  usopp: "อุซป",
  jinbe: "จินเบ",
  sanji: "ซันจิ",
  trafalgarlaw: "ทราฟัลการ์ ลอว์",
  boahancock: "โบอา แฮนค็อก",
  portgasdace: "พอร์ตกัส ดี. เอส",
  kaido: "ไคโด",
  shanks: "แชงคูส",
  sakazuki: "ซาคาสึกิ",
  nicorobin: "นิโค โรบิน",
  charlottekatakuri: "ชาร์ล็อต คาตาคุริ",
  yamato: "ยามาโตะ",
  kozukioden: "โคซึกิ โอเด็ง",
  buggy: "บักกี้",
  marshalldteach: "มาร์แชล ดี. ทีช",
  eustasskid: "ยูสตาส คิด",
  monkeyddragon: "มังกี้ ดี. ดราก้อน",
  goldroger: "โกล ดี. โรเจอร์",
};

function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** LEADER -> Leader ให้เข้ากับข้อมูลฝั่งโปเกมอนที่เขียนมือไว้ */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * ใบอาร์ตพิเศษในแคตตาล็อกมาเป็น p1 p2 p3 ตามลำดับที่ออก
 * เว็บทางการไม่ได้บอกว่าแต่ละใบเป็นอาร์ตแบบไหน เราจึงไล่ไปตามลำดับนี้
 * ซึ่งตรงกับความเป็นจริงส่วนใหญ่: ใบแรกเป็น parallel ใบถัด ๆ ไปหายากขึ้น
 */
const PRINTING_TYPES: VariantType[] = ["parallel", "alt_art", "manga", "full_art", "promo"];

/**
 * ราคาฐานตามความหายาก (บาท) — ใช้กับการ์ดที่ยังไม่มีใครกรอกราคาจริง
 * ตัวเลขมาจากช่วงราคาคร่าว ๆ ของตลาดไทย ไม่ใช่ราคาจริงรายใบ
 */
const RARITY_BASE: Record<string, number> = {
  C: 15,
  UC: 25,
  R: 55,
  SR: 320,
  SEC: 2400,
  L: 90,
  P: 120,
  "SP CARD": 900,
};

// ---------------- Pokémon (ข้อมูลตัวอย่างเขียนมือ) ----------------

const POKEMON_SETS: CardSet[] = [
  {
    code: "SV8a",
    gameSlug: "pokemon",
    nameTh: "เทศกาลเทระสตัล ex",
    nameEn: "Terastal Festival ex",
    language: "JP",
    releaseDate: "2024-12-06",
    totalCards: 187,
  },
  {
    code: "SV4a",
    gameSlug: "pokemon",
    nameTh: "ขุมทรัพย์แวววาว ex",
    nameEn: "Shiny Treasure ex",
    language: "JP",
    releaseDate: "2023-12-01",
    totalCards: 259,
  },
  {
    code: "SV1a",
    gameSlug: "pokemon",
    nameTh: "ทริปเปิลบีต",
    nameEn: "Triplet Beat",
    language: "JP",
    releaseDate: "2023-03-10",
    totalCards: 73,
  },
];

/** [เลขการ์ด, ชื่ออังกฤษ, ชื่อไทย, rarity, ประเภท, สี, ราคาฐาน NM, variant พิเศษ] */
type SeedCard = [
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  VariantType[],
];

const POKEMON_CARDS: Record<string, SeedCard[]> = {
  SV1a: [
    ["SV1a-005", "Pikachu ex", "พิคาชู ex", "RR", "Pokémon ex", "ไฟฟ้า", 420, ["full_art"]],
    ["SV1a-016", "Charizard", "ลิซาร์ดอน", "R", "Pokémon", "ไฟ", 310, []],
    ["SV1a-062", "Mew ex", "มิว ex", "RR", "Pokémon ex", "พลังจิต", 780, ["full_art"]],
    ["SV1a-071", "Professor's Research", "งานวิจัยของศาสตราจารย์", "SR", "Supporter", "ไม่มีสี", 540, []],
    ["SV1a-073", "Iono", "นันโจ", "SAR", "Supporter", "ไม่มีสี", 5200, ["full_art"]],
    ["SV1a-078", "Miriam", "มิริอาม", "SAR", "Supporter", "ไม่มีสี", 2900, ["full_art"]],
    ["SV1a-080", "Clive", "ไคลฟ์", "SR", "Supporter", "ไม่มีสี", 460, []],
    ["SV1a-081", "Nemona", "เนโมนา", "SAR", "Supporter", "ไม่มีสี", 3400, ["full_art"]],
  ],
  SV4a: [
    ["SV4a-020", "Charizard ex", "ลิซาร์ดอน ex", "RR", "Pokémon ex", "ไฟ", 1650, ["full_art"]],
    ["SV4a-090", "Mimikyu", "มิมิคคิว", "R", "Pokémon", "พลังจิต", 190, []],
    ["SV4a-205", "Iono", "นันโจ", "SAR", "Supporter", "ไม่มีสี", 4100, ["full_art"]],
    ["SV4a-236", "Mew ex", "มิว ex", "UR", "Pokémon ex", "พลังจิต", 2250, []],
    ["SV4a-244", "Pikachu ex", "พิคาชู ex", "UR", "Pokémon ex", "ไฟฟ้า", 1980, []],
    ["SV4a-259", "Terapagos", "เทระปาโกส", "AR", "Pokémon", "ไม่มีสี", 340, []],
  ],
  SV8a: [
    ["SV8a-018", "Charizard ex", "ลิซาร์ดอน ex", "RR", "Pokémon ex", "ไฟ", 1420, ["full_art"]],
    ["SV8a-064", "Gardevoir ex", "ซาไนต์ ex", "RR", "Pokémon ex", "พลังจิต", 890, []],
    ["SV8a-141", "Eevee", "อีวุย", "AR", "Pokémon", "ไม่มีสี", 260, []],
    ["SV8a-175", "Lillie", "ลิลี่", "SAR", "Supporter", "ไม่มีสี", 8900, ["full_art"]],
    ["SV8a-182", "Nemona", "เนโมนา", "SAR", "Supporter", "ไม่มีสี", 3100, ["full_art"]],
    ["SV8a-187", "Terapagos ex", "เทระปาโกส ex", "UR", "Pokémon ex", "ไม่มีสี", 2400, []],
  ],
};

// ---------------- ราคา ----------------

/**
 * ตัวคูณราคาตามสภาพการ์ด เทียบกับ NM
 *
 * PSA10 ไม่ได้ใช้ค่าคงที่ตัวนี้ตรง ๆ — ดู nmToPsa10() ข้างล่าง
 * ค่าที่ใส่ไว้เป็นแค่ค่ากลางของช่วง เผื่อโค้ดที่อ่านตารางนี้แบบตรงไปตรงมา
 */
export const CONDITION_MULTIPLIER: Record<Condition, number> = {
  PSA10: 4.6,
  NM: 1,
  LP: 0.74,
  MP: 0.52,
  HP: 0.33,
  DMG: 0.16,
};

/**
 * ค่าส่งเกรด (ค่าบริการ + ค่าส่งไปกลับ + ประกัน) คิดหยาบ ๆ ต่อใบ
 * ใช้เป็นพื้นราคาของการ์ดเกรด เพราะไม่มีใครขายใบที่ส่งเกรดแล้ว
 * ถูกกว่าต้นทุนที่จ่ายไป ต่อให้การ์ดดิบจะราคาไม่กี่ร้อยก็ตาม
 */
export const GRADING_COST_THB = 1200;

/**
 * เบี้ยของ PSA 10 เทียบกับการ์ดดิบสภาพ NM
 *
 * ของจริงเบี้ยนี้ไม่คงที่ ขึ้นกับว่าการ์ดใบนั้นผ่านเกรด 10 ยากแค่ไหน
 * (ขอบซีน ศูนย์กลางภาพ ฟอยล์เป็นรอยง่าย) เราจึงสุ่มแบบ deterministic
 * จาก id ของ variant ให้แต่ละใบมีเบี้ยของตัวเองในช่วง 3.4–6.8 เท่า
 * ไม่ใช่คูณเลขเดียวกันทั้งเว็บซึ่งจะดูปลอมทันทีเมื่อเทียบหลายใบ
 */
export function psa10Premium(variantId: string): number {
  const rand = makeRng(hashString(`psa10:${variantId}`));
  return 3.4 + rand() * 3.4;
}

export function nmToPsa10(nmPrice: number, variantId: string): number {
  const premium = psa10Premium(variantId);
  return Math.round(Math.max(nmPrice * premium, nmPrice + GRADING_COST_THB));
}

/** ทางกลับของ nmToPsa10 ใช้ตอนแอดมินกรอกราคามาเป็นราคาการ์ดเกรด */
export function psa10ToNm(psaPrice: number, variantId: string): number {
  const premium = psa10Premium(variantId);
  // จุดที่เบี้ยแบบคูณแซงพื้นค่าส่งเกรดพอดี — ต่ำกว่านี้ต้องถอดด้วยการลบ
  const knee = (GRADING_COST_THB / (premium - 1)) * premium;
  return Math.round(psaPrice >= knee ? psaPrice / premium : psaPrice - GRADING_COST_THB);
}

/** ตัวคูณราคาตาม variant เทียบกับ normal */
const VARIANT_MULTIPLIER: Record<VariantType, number> = {
  normal: 1,
  parallel: 3.2,
  alt_art: 6.5,
  manga: 11,
  full_art: 4.1,
  promo: 2.2,
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG แบบ deterministic เพื่อให้ราคาย้อนหลังเหมือนเดิมทุกครั้งที่ build */
function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const HISTORY_DAYS = 90;

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------- ประกอบเป็นแคตตาล็อกเดียว ----------------

export const SETS: CardSet[] = [
  ...catalog.sets.map((set) => ({
    code: set.code,
    gameSlug: "one-piece",
    nameTh: SET_NAME_TH[set.code] ?? set.name,
    nameEn: set.name,
    language: "JP" as const,
    releaseDate: set.releaseDate,
    totalCards: set.totalCards,
  })),
  ...POKEMON_SETS,
];

export const CARDS: Card[] = [];
export const VARIANTS: Variant[] = [];
const BASE_PRICE = new Map<string, number>();

for (const card of catalog.cards) {
  CARDS.push({
    id: card.number,
    slug: `${slugify(card.number)}-${slugify(card.name)}`,
    setCode: card.setCode,
    number: card.number,
    nameTh: NAME_TH[nameKey(card.name)] ?? card.name,
    nameEn: card.name,
    rarity: card.rarity,
    cardType: titleCase(card.cardType),
    color: card.color,
  });

  VARIANTS.push({
    id: `${card.number}:normal`,
    cardId: card.number,
    variantType: "normal",
    isFoil: false,
  });

  // นับเฉพาะ p (parallel) — r คือการพิมพ์ซ้ำอาร์ตเดิม ไม่ใช่ของสะสมคนละใบ
  const arts = card.printings.filter((p) => p.startsWith("p"));
  arts.slice(0, PRINTING_TYPES.length).forEach((_, index) => {
    const variantType = PRINTING_TYPES[index];
    VARIANTS.push({
      id: `${card.number}:${variantType}`,
      cardId: card.number,
      variantType,
      isFoil: true,
    });
  });

  // ราคาสมมติจากความหายาก บวกความต่างรายใบเล็กน้อยให้ไม่เท่ากันหมดทั้งชุด
  const base = RARITY_BASE[card.rarity.toUpperCase()] ?? 40;
  const rand = makeRng(hashString(`price:${card.number}`));
  BASE_PRICE.set(card.number, Math.round(base * (0.75 + rand() * 0.9)));
}

for (const [setCode, rows] of Object.entries(POKEMON_CARDS)) {
  for (const [number, nameEn, nameTh, rarity, cardType, color, base, extras] of rows) {
    CARDS.push({
      id: number,
      slug: `${slugify(number)}-${slugify(nameEn)}`,
      setCode,
      number,
      nameTh,
      nameEn,
      rarity,
      cardType,
      color,
    });

    VARIANTS.push({
      id: `${number}:normal`,
      cardId: number,
      variantType: "normal",
      isFoil: false,
    });
    for (const extra of extras) {
      VARIANTS.push({
        id: `${number}:${extra}`,
        cardId: number,
        variantType: extra,
        isFoil: true,
      });
    }

    BASE_PRICE.set(number, base);
  }
}

export function basePriceOf(variant: Variant): number {
  return (BASE_PRICE.get(variant.cardId) ?? 100) * VARIANT_MULTIPLIER[variant.variantType];
}

/**
 * เดินราคาย้อนหลังแบบ random walk ที่ deterministic แล้วส่งค่ารายวันออกทาง callback
 *
 * ไม่คืนเป็นอาร์เรย์ เพราะแคตตาล็อกมีหลายพัน variant การเก็บ 90 จุดต่อใบ
 * แปลว่าต้องถือของเป็นแสนชิ้นไว้ในหน่วยความจำทุกครั้งที่สร้างดัชนี
 * ผู้เรียกจึงเลือกเองว่าจะเก็บทุกวัน (หน้ารายละเอียด) หรือเก็บแค่สองวัน (หน้ารวม)
 */
function walk(
  variantId: string,
  base: number,
  days: number,
  onDay: (daysAgo: number, price: number) => void,
): void {
  const rand = makeRng(hashString(variantId));
  let value = base * 0.86;

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const drift = (base - value) * 0.045;
    const noise = (rand() - 0.5) * base * 0.035;
    value = Math.max(base * 0.35, value + drift + noise);
    onDay(daysAgo, Math.round(value));
  }
}

/** ราคาล่าสุดกับราคาเมื่อ 7 วันก่อนของ variant หนึ่ง — พอสำหรับหน้ารวมและ % ขยับ */
export function simulateSummary(variant: Variant): { latest: number; weekAgo: number } {
  let latest = 0;
  let weekAgo = 0;

  walk(variant.id, basePriceOf(variant), HISTORY_DAYS, (daysAgo, price) => {
    if (daysAgo === 0) latest = price;
    if (daysAgo === 7) weekAgo = price;
  });

  return { latest, weekAgo: weekAgo || latest };
}

/** ราคารายวันเต็มชุด ใช้เฉพาะตอนเปิดหน้ารายละเอียดการ์ดทีละใบ */
export function simulateSeries(variant: Variant, days = HISTORY_DAYS): PricePoint[] {
  const today = startOfToday();
  const points: PricePoint[] = [];

  walk(variant.id, basePriceOf(variant), days, (daysAgo, price) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    points.push({
      variantId: variant.id,
      condition: "NM",
      priceThb: price,
      recordedAt: date.toISOString(),
    });
  });

  return points;
}
