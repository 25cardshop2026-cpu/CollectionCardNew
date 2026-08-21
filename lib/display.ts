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
