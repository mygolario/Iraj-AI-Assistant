import { setRequestLocale } from "next-intl/server";
import { SalesPage } from "@/components/feature/sales/sales-page";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <SalesPage />;
}
