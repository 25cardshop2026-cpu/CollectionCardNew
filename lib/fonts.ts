import { Bai_Jamjuree, IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

/**
 * Bai Jamjuree สำหรับพาดหัว — ออกแบบไทยกับละตินมาคู่กัน
 * ตำแหน่งสระและวรรณยุกต์จึงเข้าที่ ไม่ชนกันเวลาตัวโต
 * IBM Plex Sans Thai สำหรับเนื้อความ และ Plex Mono สำหรับเลขการ์ดกับราคา
 */

const baiJamjuree = Bai_Jamjuree({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-bai",
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

export const fontVariables = `${baiJamjuree.variable} ${plexThai.variable} ${plexMono.variable}`;
