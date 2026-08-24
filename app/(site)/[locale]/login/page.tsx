import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { safePath } from "@/lib/paths";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = getDictionary(locale);
  // หน้าล็อกอินไม่มีเนื้อหาให้ค้น และไม่อยากให้โผล่ในผลค้นหาแทนหน้าการ์ด
  return { title: t.auth.loginTitle, robots: { index: false, follow: true } };
}

export default async function LoginPage({
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
          {t.auth.loginHeading}
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-2">{t.auth.loginSub}</p>
      </header>

      <div className="vitrine hud p-6">
        <AuthForm
          mode="login"
          locale={locale}
          redirectTo={back}
          labels={{
            email: t.auth.email,
            displayName: t.auth.displayName,
            password: t.auth.password,
            passwordHint: "",
            submit: t.auth.submitLogin,
            working: t.auth.working,
          }}
        />
      </div>

      <Link href={p("/forgot")} className="-mt-3 text-[13px] text-ink-3 hover:text-accent">
        {t.auth.forgotLink}
      </Link>

      <p className="text-[13.5px] text-ink-3">
        {t.auth.noAccount}{" "}
        <Link
          href={next ? `${p("/register")}?next=${encodeURIComponent(next)}` : p("/register")}
          className="text-accent hover:underline"
        >
          {t.nav.register}
        </Link>
      </p>
    </div>
  );
}
