import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewPasswordForm } from "@/components/auth/ResetForm";
import { getDictionary } from "@/lib/i18n";
import { isLocale, localePath } from "@/lib/i18n/config";
import { userForResetToken } from "@/lib/password-reset";
import { MIN_PASSWORD_LENGTH } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).auth.resetTitle,
    robots: { index: false, follow: false },
  };
}

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { token } = await searchParams;
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  // ตรวจลิงก์ตั้งแต่ตอนเปิดหน้า จะได้ไม่ให้คนตั้งรหัสใหม่จนเสร็จแล้วค่อยบอกว่าใช้ไม่ได้
  const user = token ? await userForResetToken(token) : null;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-16 sm:px-8">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em]">
          {t.auth.resetInvalidTitle}
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-2">{t.auth.resetInvalidSub}</p>
        <Link href={p("/forgot")} className="btn btn-primary btn-sm self-start">
          {t.auth.resetAskAgain}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-16 sm:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[28px] font-semibold tracking-[-0.01em]">
          {t.auth.resetHeading}
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-2">{t.auth.resetSub}</p>
        <p className="font-mono text-[12px] text-ink-3">{user.email}</p>
      </header>

      <div className="vitrine hud p-6">
        <NewPasswordForm
          locale={locale}
          token={token!}
          labels={{
            password: t.auth.newPassword,
            hint: t.auth.passwordHint(MIN_PASSWORD_LENGTH),
            submit: t.auth.resetSubmit,
            working: t.auth.working,
          }}
        />
      </div>
    </div>
  );
}
