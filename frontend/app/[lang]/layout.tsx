import type { Metadata } from "next";
import { Inter, Outfit, Vazirmatn } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { AuroraBackground } from "@/components/aurora-background";
import { Providers } from "../providers";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(
  props: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const { lang } = await props.params;
  const messages = await getMessages({ locale: lang });
  const meta = messages.metadata as Record<string, string>;
  return {
    title: meta?.title ?? "Iraj Sales AI",
    description: meta?.description ?? "",
    applicationName: "Iraj Sales AI",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);
  const messages = await getMessages();
  const isRtl = lang === "fa";

  return (
    <html
      lang={lang}
      dir={isRtl ? "rtl" : "ltr"}
      className={`${inter.variable} ${outfit.variable} ${isRtl ? vazirmatn.variable : ""} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full font-sans">
        <AuroraBackground />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
