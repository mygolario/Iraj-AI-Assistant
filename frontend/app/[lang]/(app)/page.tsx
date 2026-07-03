import { setRequestLocale } from "next-intl/server";
import { DashboardHome } from "@/components/feature/dashboard/dashboard-home";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <DashboardHome />;
}
