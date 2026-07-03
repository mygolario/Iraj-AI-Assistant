import { setRequestLocale } from "next-intl/server";
import { StandardsPage } from "@/components/feature/standards/standards-page";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <StandardsPage />;
}
