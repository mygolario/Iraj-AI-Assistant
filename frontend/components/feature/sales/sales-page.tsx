"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  IconDocument,
  IconRoute,
  IconLoader,
  IconDownload,
  IconSpark,
  IconDraft,
} from "@/components/ui/icons";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn, downloadText } from "@/lib/utils";
import { Markdown } from "@/components/ui/markdown";

const CONTRACT_GRADES = [
  "DIN B500B",
  "ASTM A615 Grade 60",
  "JIS G3112 SD390",
  "A3",
  "A4",
  "GB/T 1499.2 HRB400",
];

type Tab = "contract" | "roadmap";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 rounded-sm border border-line bg-bg-sunken px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:bg-card";

function ContractDrafter() {
  const t = useTranslations();
  const [buyer, setBuyer] = React.useState("");
  const [seller, setSeller] = React.useState("");
  const [grade, setGrade] = React.useState(CONTRACT_GRADES[0]);
  const [tonnage, setTonnage] = React.useState(250);
  const [price, setPrice] = React.useState(550);
  const [md, setMd] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const generate = async () => {
    if (!buyer.trim() || !seller.trim()) {
      toast.error(t("sales.buyer_seller_required"));
      return;
    }
    setLoading(true);
    setMd("");
    try {
      const res = await api.sales.contract({
        buyer,
        seller,
        rebar_grade: grade,
        tonnage,
        price_per_ton: price,
      });
      setMd(res.markdown);
      toast.success(t("sales.contract_drafting"));
    } catch (e) {
      toast.error(t("sales.contract_failed"), { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-4 flex items-center gap-2">
          <IconDraft className="size-4 text-accent" />
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("sales.contract_details")}</h3>
        </div>
        <div className="grid gap-3">
          <Field label={t("sales.buyer_company")}>
            <input className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder={t("sales.buyer_placeholder")} />
          </Field>
          <Field label={t("sales.seller_company")}>
            <input className={inputCls} value={seller} onChange={(e) => setSeller(e.target.value)} placeholder={t("sales.seller_placeholder")} />
          </Field>
          <Field label={t("sales.rebar_grade")}>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
              {CONTRACT_GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("sales.tonnage_t")}>
              <input type="number" min={1} className={inputCls} value={tonnage} onChange={(e) => setTonnage(Number(e.target.value) || 0)} />
            </Field>
            <Field label={t("sales.unit_price_usd")}>
              <input type="number" min={1} className={inputCls} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </Field>
          </div>
          <Button onClick={generate} disabled={loading} className="mt-1 h-10">
            {loading ? <IconLoader className="size-4 animate-spin" /> : <IconSpark className="size-4" />}
            {loading ? t("sales.drafting") : t("sales.generate_contract")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("sales.formatted_draft")}</h3>
          {md && (
            <Button variant="outline" size="sm" onClick={() => downloadText(`Sales_Contract_${buyer.replace(/\s+/g, "_")}.md`, md)}>
              <IconDownload className="size-3.5" />
              {t("common.download_md")}
            </Button>
          )}
        </div>
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-4 rounded-sm" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        ) : md ? (
          <Markdown>{md}</Markdown>
        ) : (
          <p className="py-10 text-center text-sm text-ink-muted">
            {t("sales.contract_empty")}
          </p>
        )}
      </div>
    </div>
  );
}

function RoadmapGenerator() {
  const t = useTranslations();
  const [company, setCompany] = React.useState("");
  const [market, setMarket] = React.useState("");
  const [md, setMd] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const generate = async () => {
    if (!company.trim() || !market.trim()) {
      toast.error(t("sales.company_market_required"));
      return;
    }
    setLoading(true);
    setMd("");
    try {
      const res = await api.sales.roadmap({ company_name: company, target_market: market });
      setMd(res.markdown);
      toast.success(t("sales.roadmap_generated"));
    } catch (e) {
      toast.error(t("sales.roadmap_failed"), { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-4 flex items-center gap-2">
          <IconRoute className="size-4 text-accent" />
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("sales.roadmap_inputs")}</h3>
        </div>
        <div className="grid gap-3">
          <Field label={t("sales.company_name")}>
            <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("sales.your_company")} />
          </Field>
          <Field label={t("sales.target_market")}>
            <input className={inputCls} value={market} onChange={(e) => setMarket(e.target.value)} placeholder={t("sales.target_placeholder")} />
          </Field>
          <Button onClick={generate} disabled={loading} className="mt-1 h-10">
            {loading ? <IconLoader className="size-4 animate-spin" /> : <IconSpark className="size-4" />}
            {loading ? t("sales.compiling") : t("sales.compile_roadmap")}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-1)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base leading-tight tracking-tight text-ink">{t("sales.transformation_roadmap")}</h3>
          {md && (
            <Button variant="outline" size="sm" onClick={() => downloadText(`Sales_Roadmap_${company.replace(/\s+/g, "_")}.md`, md)}>
              <IconDownload className="size-3.5" />
              {t("common.download_md")}
            </Button>
          )}
        </div>
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-4 rounded-sm" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        ) : md ? (
          <Markdown>{md}</Markdown>
        ) : (
          <p className="py-10 text-center text-sm text-ink-muted">
            {t("sales.roadmap_empty")}
          </p>
        )}
      </div>
    </div>
  );
}

export function SalesPage() {
  const t = useTranslations();
  const [tab, setTab] = React.useState<Tab>("contract");
  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "contract", label: t("sales.contract_drafter"), icon: IconDocument },
    { id: "roadmap", label: t("sales.sales_roadmap"), icon: IconRoute },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex w-fit gap-1 rounded-sm border border-line bg-card p-1 shadow-[var(--shadow-1)]">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === tabItem.id ? "text-accent-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {tab === tabItem.id && (
              <motion.span
                layoutId="sales-tab"
                className="absolute inset-0 rounded-sm bg-accent-soft"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <tabItem.icon className="relative size-4" />
            <span className="relative">{tabItem.label}</span>
          </button>
        ))}
      </div>
      <div key={tab} className="transition-opacity duration-200">
        {tab === "contract" ? <ContractDrafter /> : <RoadmapGenerator />}
      </div>
    </div>
  );
}
