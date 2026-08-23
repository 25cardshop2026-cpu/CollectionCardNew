import type { Condition, VariantType } from "../types";
import type { RarityTier } from "../rarity";

/**
 * คำแปลภาษาไทย — ไฟล์นี้เป็นต้นแบบของโครงสร้าง
 * ภาษาอื่นต้องมีคีย์ครบเท่านี้ ไม่งั้น TypeScript จะฟ้องตอน build
 */
export const th = {
  meta: {
    siteTitle: "Collection Card — ราคาการ์ดสะสม One Piece และ Pokémon",
    siteDescription:
      "ฐานข้อมูลราคาการ์ดสะสม One Piece และ Pokémon แยกตามชุด เวอร์ชัน และสภาพการ์ด พร้อมราคาย้อนหลัง",
  },

  nav: {
    home: "หน้าแรก",
    browse: "เลือกเกม",
    movers: "ราคาขยับแรง",
    dashboard: "แดชบอร์ด",
    start: "เริ่มใช้งาน",
    tagline: "ราคาการ์ดสะสม",
  },

  footer: {
    blurb:
      "ฐานข้อมูลราคาการ์ดสะสมสำหรับนักสะสมชาวไทย แยกราคาตามเวอร์ชันและสภาพการ์ดอย่างละเอียด",
    phase:
      "รายชื่อการ์ดมาจากเว็บทางการ One Piece Card Game · ราคายังเป็นข้อมูลสาธิต ไม่ใช่ราคาตลาดจริง",
  },

  landing: {
    eyebrow: "One Piece · Pokémon",
    headlineLead: "รู้ราคาการ์ดของคุณ",
    headlineAccent: "ก่อนจะซื้อหรือปล่อย",
    sub: "ฐานข้อมูลราคาการ์ดสะสมสำหรับนักสะสมชาวไทย แยกราคาตามชุด เวอร์ชัน และสภาพการ์ดอย่างละเอียด พร้อมกราฟย้อนหลังให้เห็นแนวโน้ม",
    ctaPrimary: "เริ่มใช้งาน",
    ctaSecondary: "ดูราคาขยับแรง",
    freeNote: "เปิดใช้ฟรี ไม่ต้องสมัครสมาชิก",
    showcaseLabel: "ขยับแรงที่สุดใน 7 วัน",

    statCards: "การ์ดในฐานข้อมูล",
    statVariants: "เวอร์ชันที่แยกราคา",
    statSets: "ชุดการ์ดในระบบ",
    statHistory: "วันของราคาย้อนหลัง",

    featuresEyebrow: "สิ่งที่ใช้งานได้แล้ววันนี้",
    featuresTitle: "ละเอียดพอที่จะเชื่อได้จริง",
    featuresSub:
      "เว็บราคาการ์ดส่วนใหญ่บอกราคาเดียวต่อการ์ดหนึ่งใบ ซึ่งใช้ตัดสินใจซื้อขายจริงไม่ได้ เพราะราคาขึ้นกับเวอร์ชันและสภาพเสมอ",

    features: [
      {
        title: "ราคาแยกตามเวอร์ชันและสภาพ",
        body: "การ์ดใบเดียวกัน Normal กับ Alt Art ราคาต่างกันได้สิบเท่า เราแยกให้ครบทุกเวอร์ชัน คูณด้วยสภาพการ์ดห้าระดับ",
        cta: "ดูตัวอย่าง",
      },
      {
        title: "กราฟราคาย้อนหลัง",
        body: "เห็นราคาย้อนหลัง 90 วันของทุกเวอร์ชัน รู้ว่ากำลังขึ้นหรือกำลังลงก่อนตัดสินใจ",
        cta: "ดูกราฟ",
      },
      {
        title: "จับการ์ดที่ราคาขยับแรง",
        body: "อันดับการ์ดที่ขึ้นและลงมากที่สุดในเจ็ดวัน อัปเดตตามข้อมูลจริงทุกครั้งที่มีการบันทึกราคา",
        cta: "ดูอันดับ",
      },
      {
        title: "แยกฉบับ JP และ EN",
        body: "ชุดเดียวกันคนละภาษาคือคนละตลาดคนละราคา เราเก็บแยกกันตั้งแต่ต้น ไม่เอามารวมให้สับสน",
        cta: "เลือกเกม",
      },
    ],

    upcomingChip: "กำลังพัฒนา",
    upcomingTitle: "ต่อไปคือคอลเลกชันของคุณเอง",
    upcomingSub:
      "ตอนนี้เว็บยังเป็นฐานข้อมูลราคาอย่างเดียว เฟสถัดไปจะเปิดให้บันทึกการ์ดที่คุณมีจริง แล้วติดตามมูลค่าเหมือนดูพอร์ตลงทุน",
    upcoming: [
      "บันทึกคอลเลกชันของตัวเอง แล้วดูว่าเก็บครบชุดไปกี่เปอร์เซ็นต์",
      "มูลค่าพอร์ตย้อนหลังพร้อมกำไรขาดทุนเทียบราคาที่ซื้อ",
      "แจ้งเตือนผ่าน LINE เมื่อการ์ดที่หมายตาลงถึงราคาที่ตั้งไว้",
      "เพิ่มการ์ดด้วยการถ่ายรูป ไม่ต้องพิมพ์เลขการ์ดเอง",
    ],

    finalTitle: "เริ่มดูราคาการ์ดได้เลยตอนนี้",
    finalSub: (cards: string, sets: number, price: string) =>
      `มีข้อมูล ${cards} ใบจาก ${sets} ชุดให้ไล่ดู การ์ดที่แพงที่สุดในระบบตอนนี้อยู่ที่ ${price}`,
  },

  browse: {
    title: "เลือกเกม",
    heading: "จะดูการ์ดเกมไหนดี",
    sub: "เลือกเกมเพื่อไล่ดูชุดทั้งหมด แล้วเจาะเข้าไปดูราคาของการ์ดแต่ละใบ",
    description: "เลือกเกมเพื่อดูชุดการ์ดทั้งหมดและราคาปัจจุบัน One Piece และ Pokémon",
    cards: "การ์ด",
    sets: "ชุด",
    updated: "อัปเดต",
    moversTitle: "ราคาขยับแรงใน 7 วัน",
    seeAll: "ดูทั้งหมด →",
  },

  game: {
    title: (game: string) => `ชุดการ์ด ${game}`,
    description: (game: string) =>
      `รายการชุดการ์ด ${game} ทั้งหมด พร้อมจำนวนการ์ดและวันวางจำหน่าย`,
    inDb: "ในฐานข้อมูล",
    empty: "ยังไม่มีชุดของเกมนี้ในระบบ",
    progressLabel: (pct: number) => `มีข้อมูลแล้ว ${pct}% ของชุด`,
  },

  set: {
    title: (code: string, name: string) => `${code} ${name} — ราคาการ์ดทั้งชุด`,
    description: (code: string, name: string) =>
      `ราคาการ์ดในชุด ${code} ${name} ทุกใบ อัปเดตล่าสุด แยกตามเวอร์ชันและสภาพการ์ด`,
    released: "วางจำหน่าย",
    rarity: "Rarity",
    sortBy: "เรียงตาม",
    all: "ทั้งหมด",
    byNumber: "เลขการ์ด",
    byPrice: "ราคาสูงสุด",
    byChange: "ขยับแรง",
    has: (variant: string) => `มี ${variant}`,
    empty: "ไม่มีการ์ดที่ตรงกับตัวกรองนี้",
  },

  card: {
    title: (number: string, name: string, price: string) =>
      `${number} ${name} — ราคาล่าสุด ${price}`,
    description: (name: string, nameEn: string, number: string, set: string) =>
      `ราคาการ์ด ${name} (${nameEn}) ${number} จากชุด ${set} แยกตามเวอร์ชันและสภาพการ์ด พร้อมราคาย้อนหลัง 90 วัน`,
    noPrice: "ยังไม่มีข้อมูล",
    conditionNm: "สภาพ NM",
    per7d: "/ 7 วัน",
    updated: "อัปเดต",
    historyTitle: "ราคาย้อนหลัง 90 วัน",
    historyLabel: (name: string) => `กราฟราคาย้อนหลัง 90 วันของ ${name}`,
    priceTableTitle: "ราคาแยกตามเวอร์ชันและสภาพ",
    psaLabel: "PSA 10",
    psaNote: "ใบส่งเกรดได้ 10 เต็ม",
    priceNote:
      "ราคาผูกกับเวอร์ชันการ์ดและสภาพ ไม่ใช่ผูกกับตัวการ์ด — คอลัมน์ PSA 10 คือใบที่ส่งเกรดแล้วได้ 10 เต็ม ซึ่งเป็นคนละตลาดกับการ์ดดิบ ราคาประเมินจากราคาการ์ดดิบบวกเบี้ยของแต่ละใบ โดยมีค่าส่งเกรดเป็นพื้น ส่วนเกรด BGS จะเพิ่มในเฟสถัดไป",
    siblings: (code: string) => `การ์ดอื่นในชุด ${code}`,
    notEnoughData: "ยังมีข้อมูลราคาไม่พอสำหรับวาดกราฟ",
    low: "ต่ำสุด",
    high: "สูงสุด",
    days: (n: number) => `${n} วัน`,
  },

  movers: {
    title: "ราคาขยับแรงใน 7 วัน",
    description:
      "การ์ดสะสม One Piece และ Pokémon ที่ราคาขึ้นและลงมากที่สุดในรอบ 7 วัน",
    eyebrow: "7 วันล่าสุด",
    heading: "ราคาขยับแรง",
    sub: "เรียงตามขนาดการเปลี่ยนแปลงของราคา ไม่ว่าจะขึ้นหรือลง คิดจากราคาสภาพ NM",
    colRank: "#",
    colCard: "การ์ด",
    colSet: "ชุด",
    colVariant: "เวอร์ชัน",
    colPrice: "ราคา",
    colChange: "7 วัน",
  },

  variant: {
    normal: "Normal",
    parallel: "Parallel",
    alt_art: "Alt Art",
    manga: "Manga Rare",
    full_art: "Full Art",
    promo: "Promo",
  } satisfies Record<VariantType, string>,

  tier: {
    mythic: "หายากที่สุด",
    epic: "หายากมาก",
    rare: "หายาก",
    common: "ทั่วไป",
  } satisfies Record<RarityTier, string>,

  condition: {
    PSA10: "PSA 10",
    NM: "NM",
    LP: "LP",
    MP: "MP",
    HP: "HP",
    DMG: "DMG",
  } satisfies Record<Condition, string>,

  time: {
    justNow: "เมื่อครู่",
    minutes: (n: number) => `${n} นาทีที่แล้ว`,
    hours: (n: number) => `${n} ชม.ที่แล้ว`,
    days: (n: number) => `${n} วันก่อน`,
  },
};

export type Dictionary = typeof th;
