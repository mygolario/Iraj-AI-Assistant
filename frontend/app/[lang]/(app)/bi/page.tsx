import { setRequestLocale } from "next-intl/server";
import { BiPage } from "@/components/feature/bi/bi-page";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <BiPage />;
}
