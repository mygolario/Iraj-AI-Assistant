import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <AppShell>{children}</AppShell>;
}
