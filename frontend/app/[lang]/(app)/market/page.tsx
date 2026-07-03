import { setRequestLocale } from "next-intl/server";
import { MarketPage } from "@/components/feature/market/market-page";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <MarketPage />;
}
