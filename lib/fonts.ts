import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Trirong } from "next/font/google";

/**
 * เซอริฟไทยสำหรับพาดหัว + Plex สำหรับเนื้อความและตัวเลข
 * แยกไฟล์ไว้เพราะมี root layout สองชุด (หน้าเว็บกับแดชบอร์ด) ที่ต้องใช้ร่วมกัน
 */

const trirong = Trirong({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-trirong",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-thai",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const fontVariables = `${trirong.variable} ${plexThai.variable} ${plexMono.variable}`;
