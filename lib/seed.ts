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
 * Pokémon: ยังไม่มีข้อมูล — ของเดิมเป็นการ์ดที่แต่งขึ้นจึงเอาออกไปแล้ว
 * รอดึงจากแหล่งทางการเหมือนที่ทำกับ One Piece
 *
 * ราคาทุกใบเป็นราคาสมมติที่สร้างจากความหายาก ไม่ใช่ราคาตลาดจริง
 * จนกว่าจะมีคนกรอกราคาจริงทับผ่านแดชบอร์ด (ดู lib/repo.ts)
 */

export const GAMES: Game[] = [
  {
    slug: "one-piece",
    nameTh: "วันพีซ",
    nameEn: "One Piece Card Game",
    taglineTh: "การ์ดเกมจากวันพีซ เริ่มวางจำหน่ายปี 2022",
    taglineEn: "The One Piece trading card game, launched in 2022.",
  },
  {
    slug: "pokemon",
    nameTh: "โปเกมอน",
    nameEn: "Pokémon Trading Card Game",
    taglineTh: "การ์ดเกมที่เก่าแก่และมีมูลค่าสะสมสูงที่สุด",
    taglineEn: "The oldest trading card game, and the one collectors pay the most for.",
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

/** LEADER -> Leader อ่านง่ายกว่าตัวพิมพ์ใหญ่ทั้งคำเวลาแสดงบนหน้าเว็บ */
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
];

export const CARDS: Card[] = [];
export const VARIANTS: Variant[] = [];

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

}
