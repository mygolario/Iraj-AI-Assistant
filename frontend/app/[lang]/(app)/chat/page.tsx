import { setRequestLocale } from "next-intl/server";
import { ChatView } from "@/components/feature/chat/chat-view";

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  return <ChatView />;
}
