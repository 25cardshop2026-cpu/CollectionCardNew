import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { safePath } from "@/lib/paths";
import { currentUser } from "@/lib/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  // หน้าสมัครสมาชิกไม่มีเนื้อหาให้ค้น จึงไม่ต้องให้ Google เก็บ
  return { title: t.auth.registerTitle, robots: { index: false, follow: true } };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { next } = await searchParams;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const back = next ? safePath(next, p("/portfolio")) : undefined;

  // ล็อกอินอยู่แล้วไม่ต้องเห็นฟอร์มนี้อีก
  if (await currentUser()) redirect(back ?? p("/portfolio"));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-16 sm:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          {t.auth.registerHeading}
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-2">{t.auth.registerSub}</p>
      </header>

      <div className="vitrine hud p-6">
        <AuthForm
          mode="register"
          locale={locale}
          redirectTo={back}
          labels={{
            email: t.auth.email,
            displayName: t.auth.displayName,
            password: t.auth.password,
            passwordHint: t.auth.passwordHint(MIN_PASSWORD_LENGTH),
            submit: t.auth.submitRegister,
            working: t.auth.working,
          }}
        />
      </div>

      <p className="text-[13.5px] text-ink-3">
        {t.auth.haveAccount}{" "}
        <Link
          href={next ? `${p("/login")}?next=${encodeURIComponent(next)}` : p("/login")}
          className="text-accent hover:underline"
        >
          {t.nav.login}
        </Link>
      </p>

      <p className="border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-3">
        {t.portfolio.guestNote}
      </p>
    </div>
  );
}
