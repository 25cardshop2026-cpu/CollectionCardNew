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
 * ข้อมูลตัวอย่างสำหรับเฟส P0
 * ชื่อการ์ดและราคาเป็นข้อมูลสมมติเพื่อสาธิตโครงสร้าง ไม่ใช่ราคาตลาดจริง
 * เมื่อต่อฐานข้อมูลจริงแล้ว ให้เขียน adapter ตัวใหม่ใน lib/repo.ts แทนไฟล์นี้
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

export const SETS: CardSet[] = [
  {
    code: "OP-09",
    gameSlug: "one-piece",
    nameTh: "จ้าวแห่งโลกใหม่",
    nameEn: "Emperors in the New World",
    language: "JP",
    releaseDate: "2024-11-30",
    totalCards: 121,
  },
  {
    code: "OP-05",
    gameSlug: "one-piece",
    nameTh: "การตื่นขึ้นของยุคใหม่",
    nameEn: "Awakening of the New Era",
    language: "JP",
    releaseDate: "2023-08-05",
    totalCards: 127,
  },
  {
    code: "OP-01",
    gameSlug: "one-piece",
    nameTh: "รุ่งอรุณแห่งการผจญภัย",
    nameEn: "Romance Dawn",
    language: "JP",
    releaseDate: "2022-07-22",
    totalCards: 121,
  },
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

const SEED_CARDS: Record<string, SeedCard[]> = {
  "OP-01": [
    ["OP01-001", "Roronoa Zoro", "โรโรโนอา โซโล", "L", "Leader", "เขียว", 320, []],
    ["OP01-003", "Monkey D. Luffy", "มังกี้ ดี. ลูฟี่", "L", "Leader", "แดง", 480, []],
    ["OP01-013", "Nami", "นามิ", "R", "Character", "แดง", 180, ["parallel"]],
    ["OP01-016", "Monkey D. Luffy", "มังกี้ ดี. ลูฟี่", "SR", "Character", "แดง", 1450, ["alt_art"]],
    ["OP01-024", "Usopp", "อุซป", "C", "Character", "แดง", 45, []],
    ["OP01-025", "Jinbe", "จินเบ", "UC", "Character", "แดง", 240, ["alt_art"]],
    ["OP01-031", "Sanji", "ซันจิ", "R", "Character", "แดง", 95, []],
    ["OP01-047", "Trafalgar Law", "ทราฟัลการ์ ลอว์", "SR", "Character", "เขียว", 2100, ["alt_art"]],
    ["OP01-060", "Boa Hancock", "โบอา แฮนค็อก", "SEC", "Character", "ฟ้า", 6800, ["alt_art"]],
    ["OP01-070", "Portgas D. Ace", "พอร์ตกัส ดี. เอส", "SR", "Character", "ม่วง", 1850, ["alt_art"]],
    ["OP01-078", "Kaido", "ไคโด", "L", "Leader", "ม่วง", 520, []],
    ["OP01-120", "Shanks", "แชงคูส", "SEC", "Character", "แดง", 9800, ["alt_art", "manga"]],
  ],
  "OP-05": [
    ["OP05-001", "Sakazuki", "ซาคาสึกิ", "L", "Leader", "แดง", 260, []],
    ["OP05-034", "Nico Robin", "นิโค โรบิน", "SR", "Character", "ม่วง", 980, ["alt_art"]],
    ["OP05-060", "Charlotte Katakuri", "ชาร์ล็อต คาตาคุริ", "SR", "Character", "เหลือง", 1240, ["parallel"]],
    ["OP05-069", "Yamato", "ยามาโตะ", "R", "Character", "เหลือง", 210, []],
    ["OP05-093", "Kozuki Oden", "โคซึกิ โอเด็ง", "SEC", "Character", "เขียว", 4300, ["alt_art"]],
    ["OP05-119", "Monkey D. Luffy", "มังกี้ ดี. ลูฟี่", "SEC", "Character", "แดง", 7600, ["manga"]],
  ],
  "OP-09": [
    ["OP09-001", "Shanks", "แชงคูส", "L", "Leader", "แดง", 640, []],
    ["OP09-004", "Buggy", "บักกี้", "L", "Leader", "ฟ้า", 180, []],
    ["OP09-051", "Marshall D. Teach", "มาร์แชล ดี. ทีช", "SR", "Character", "ดำ", 1120, ["parallel"]],
    ["OP09-081", "Eustass Kid", "ยูสตาส คิด", "R", "Character", "ม่วง", 165, []],
    ["OP09-093", "Monkey D. Dragon", "มังกี้ ดี. ดราก้อน", "SR", "Character", "เขียว", 890, ["alt_art"]],
    ["OP09-119", "Gol D. Roger", "โกล ดี. โรเจอร์", "SEC", "Character", "แดง", 12400, ["alt_art", "manga"]],
  ],
  "SV1a": [
    ["SV1a-005", "Pikachu ex", "พิคาชู ex", "RR", "Pokémon ex", "ไฟฟ้า", 420, ["full_art"]],
    ["SV1a-016", "Charizard", "ลิซาร์ดอน", "R", "Pokémon", "ไฟ", 310, []],
    ["SV1a-062", "Mew ex", "มิว ex", "RR", "Pokémon ex", "พลังจิต", 780, ["full_art"]],
    ["SV1a-071", "Professor's Research", "งานวิจัยของศาสตราจารย์", "SR", "Supporter", "ไม่มีสี", 540, []],
    ["SV1a-073", "Iono", "นันโจ", "SAR", "Supporter", "ไม่มีสี", 5200, ["full_art"]],
    ["SV1a-078", "Miriam", "มิริอาม", "SAR", "Supporter", "ไม่มีสี", 2900, ["full_art"]],
    ["SV1a-080", "Clive", "ไคลฟ์", "SR", "Supporter", "ไม่มีสี", 460, []],
    ["SV1a-081", "Nemona", "เนโมนา", "SAR", "Supporter", "ไม่มีสี", 3400, ["full_art"]],
  ],
  "SV4a": [
    ["SV4a-020", "Charizard ex", "ลิซาร์ดอน ex", "RR", "Pokémon ex", "ไฟ", 1650, ["full_art"]],
    ["SV4a-090", "Mimikyu", "มิมิคคิว", "R", "Pokémon", "พลังจิต", 190, []],
    ["SV4a-205", "Iono", "นันโจ", "SAR", "Supporter", "ไม่มีสี", 4100, ["full_art"]],
    ["SV4a-236", "Mew ex", "มิว ex", "UR", "Pokémon ex", "พลังจิต", 2250, []],
    ["SV4a-244", "Pikachu ex", "พิคาชู ex", "UR", "Pokémon ex", "ไฟฟ้า", 1980, []],
    ["SV4a-259", "Terapagos", "เทระปาโกส", "AR", "Pokémon", "ไม่มีสี", 340, []],
  ],
  "SV8a": [
    ["SV8a-018", "Charizard ex", "ลิซาร์ดอน ex", "RR", "Pokémon ex", "ไฟ", 1420, ["full_art"]],
    ["SV8a-064", "Gardevoir ex", "ซาไนต์ ex", "RR", "Pokémon ex", "พลังจิต", 890, []],
    ["SV8a-141", "Eevee", "อีวุย", "AR", "Pokémon", "ไม่มีสี", 260, []],
    ["SV8a-175", "Lillie", "ลิลี่", "SAR", "Supporter", "ไม่มีสี", 8900, ["full_art"]],
    ["SV8a-182", "Nemona", "เนโมนา", "SAR", "Supporter", "ไม่มีสี", 3100, ["full_art"]],
    ["SV8a-187", "Terapagos ex", "เทระปาโกส ex", "UR", "Pokémon ex", "ไม่มีสี", 2400, []],
  ],
};

/** ตัวคูณราคาตามสภาพการ์ด เทียบกับ NM */
export const CONDITION_MULTIPLIER: Record<Condition, number> = {
  NM: 1,
  LP: 0.74,
  MP: 0.52,
  HP: 0.33,
  DMG: 0.16,
};

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

export const CARDS: Card[] = [];
export const VARIANTS: Variant[] = [];

for (const [setCode, rows] of Object.entries(SEED_CARDS)) {
  for (const [number, nameEn, nameTh, rarity, cardType, color] of rows) {
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
  }
}

for (const [, rows] of Object.entries(SEED_CARDS)) {
  for (const [number, , , , , , , extras] of rows) {
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
  }
}

const BASE_PRICE = new Map<string, number>();
for (const rows of Object.values(SEED_CARDS)) {
  for (const [number, , , , , , base] of rows) {
    BASE_PRICE.set(number, base);
  }
}

/**
 * สร้างราคาย้อนหลัง 90 วันของสภาพ NM แบบ random walk ที่ deterministic
 * ราคาสภาพอื่นคำนวณจาก NM ด้วย CONDITION_MULTIPLIER ตอนอ่าน
 */
export function buildHistory(): PricePoint[] {
  const today = startOfToday();
  const points: PricePoint[] = [];

  for (const variant of VARIANTS) {
    const base =
      (BASE_PRICE.get(variant.cardId) ?? 100) *
      VARIANT_MULTIPLIER[variant.variantType];
    const rand = makeRng(hashString(variant.id));
    let value = base * 0.86;

    for (let day = HISTORY_DAYS - 1; day >= 0; day--) {
      const drift = (base - value) * 0.045;
      const noise = (rand() - 0.5) * base * 0.035;
      value = Math.max(base * 0.35, value + drift + noise);

      const date = new Date(today);
      date.setDate(date.getDate() - day);
      points.push({
        variantId: variant.id,
        condition: "NM",
        priceThb: Math.round(value),
        recordedAt: date.toISOString(),
      });
    }
  }

  return points;
}
