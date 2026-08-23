import type { Dictionary } from "./i18n";
import type { Locale } from "./i18n/config";
import type { Card, CardSet, Game } from "./types";

/**
 * ชื่อที่ควรแสดงตามภาษาที่ผู้ใช้เลือก
 * ข้อมูลเก็บทั้งไทยและอังกฤษไว้ในแถวเดียวกันอยู่แล้ว ตรงนี้แค่เลือกว่าจะโชว์อันไหน
 */

export function cardName(card: Card, locale: Locale): string {
  return locale === "th" ? card.nameTh : card.nameEn;
}

/** ชื่อรอง แสดงตัวเล็กใต้ชื่อหลัก ให้คนค้นเจอทั้งสองภาษา */
export function cardNameAlt(card: Card, locale: Locale): string {
  return locale === "th" ? card.nameEn : card.nameTh;
}

export function setName(set: CardSet, locale: Locale): string {
  return locale === "th" ? set.nameTh : set.nameEn;
}

export function setNameAlt(set: CardSet, locale: Locale): string {
  return locale === "th" ? set.nameEn : set.nameTh;
}

export function gameName(game: Game): string {
  return game.nameEn;
}

/** คำโปรยของเกมตามภาษาที่เลือก */
export function gameTagline(game: Game, locale: Locale): string {
  return locale === "th" ? game.taglineTh : game.taglineEn;
}

/**
 * ประเภทการ์ดกับสี เก็บในข้อมูลเป็นค่าเดียว (Character / แดง) แล้วแปลตอนแสดง
 *
 * ไม่แปลตั้งแต่ตอนเก็บ เพราะแอดมินพิมพ์ค่าพวกนี้เองได้ในหน้าเพิ่มการ์ด
 * ค่าที่ไม่มีคำแปลจะโชว์ตามที่พิมพ์มา ดีกว่าโชว์ช่องว่าง
 */
export function cardTypeLabel(cardType: string, t: Dictionary): string {
  return t.cardType[cardType] ?? cardType;
}

/** การ์ดสองสีเก็บเป็น "แดง/เขียว" จึงต้องแปลทีละสีแล้วต่อกลับ */
export function colorLabel(color: string, t: Dictionary): string {
  return color
    .split("/")
    .map((part) => t.color[part.trim()] ?? part.trim())
    .join(" / ");
}
