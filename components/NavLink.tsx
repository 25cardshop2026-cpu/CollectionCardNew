"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ลิงก์เมนูที่รู้ว่าตัวเองคือหน้าที่เปิดอยู่หรือเปล่า
 *
 * ต้องเป็น client component เพราะ layout ฝั่งเซิร์ฟเวอร์ไม่รู้ path ปัจจุบัน
 *
 * หน้าลูกนับเป็นหน้าเดียวกับเมนูแม่ด้วย เช่นอยู่ /admin/cards/OP01-001
 * เมนู "จัดการการ์ด" ต้องยังติดสีอยู่ ไม่งั้นพอกดเข้าไปแก้การ์ดแล้วเมนูจะดับ
 * เหมือนหลุดออกไปนอกส่วนนั้น
 */
export function NavLink({
  href,
  className = "",
  activeClassName,
  inactiveClassName = "",
  exact = false,
  children,
}: {
  href: string;
  className?: string;
  activeClassName: string;
  /** คลาสของตอนไม่ได้เลือก — ต้องแยกจาก active ไม่ใช่ทับกัน
   *  เพราะคลาสสีที่ชนกัน (border-transparent กับ border-accent) ตัวไหนชนะ
   *  ขึ้นกับลำดับใน stylesheet ไม่ใช่ลำดับที่เขียนต่อกันในสตริง */
  inactiveClassName?: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName}`}
    >
      {children}
    </Link>
  );
}
