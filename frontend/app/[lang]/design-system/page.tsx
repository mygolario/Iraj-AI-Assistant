import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Panel, PanelHeader, PanelTitle, PanelBody } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import * as Icons from "@/components/ui/icons";
import type { IconProps } from "@/components/ui/icons";

type IconComponent = (props: IconProps) => React.ReactNode;

export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  setRequestLocale(lang);

  const palette: Array<{ name: string; varName: string; note: string }> = [
    { name: "Paper", varName: "--background", note: "App base" },
    { name: "Subtle", varName: "--bg-subtle", note: "Recessed" },
    { name: "Elevated", varName: "--bg-elevated", note: "Cards" },
    { name: "Sunken", varName: "--bg-sunken", note: "Inputs" },
    { name: "Ink", varName: "--ink", note: "Primary text" },
    { name: "Ink Muted", varName: "--ink-muted", note: "Secondary" },
    { name: "Ink Subtle", varName: "--ink-subtle", note: "Tertiary" },
    { name: "Line", varName: "--line", note: "Hairline" },
    { name: "Line Strong", varName: "--line-strong", note: "Separator" },
    { name: "Copper", varName: "--accent", note: "Single accent" },
    { name: "Copper Soft", varName: "--accent-soft", note: "Selected row" },
    { name: "Positive", varName: "--positive", note: "Status only" },
    { name: "Negative", varName: "--negative", note: "Status only" },
    { name: "Warning", varName: "--warning", note: "Status only" },
    { name: "Info", varName: "--info", note: "Status only" },
  ];

  const typeScale: Array<{ label: string; className: string; sample: string }> = [
    { label: "Display / 56", className: "font-display text-[56px] leading-[1.04] tracking-tight", sample: "Tonnage" },
    { label: "H1 / 40", className: "font-display text-[40px] leading-[1.1] tracking-tight", sample: "Live Market Prices" },
    { label: "H2 / 28", className: "font-display text-[28px] leading-[1.2] tracking-tight", sample: "Standards Finder" },
    { label: "Subsection / 22", className: "font-display text-[22px] leading-[1.3] tracking-tight", sample: "Revenue by grade" },
    { label: "Card title / 18", className: "font-display text-lg leading-tight", sample: "Sales & Contracts" },
    { label: "Body / 15", className: "text-[15px] leading-6", sample: "Rebar pricing reflects tonnage sold across grades A3 to A6." },
    { label: "Secondary / 13.5", className: "text-[13.5px] leading-5 text-ink-muted", sample: "Updated 2 minutes ago" },
    { label: "Micro / 12", className: "text-[12px] uppercase tracking-[0.08em] text-ink-subtle", sample: "AVG PRICE / TON" },
  ];

  const iconGroups: Array<{ heading: string; icons: Array<[string, IconComponent]> }> = [
    {
      heading: "Navigation",
      icons: [
        ["Dashboard", Icons.IconDashboard],
        ["Analytics", Icons.IconAnalytics],
        ["Standards", Icons.IconStandards],
        ["Market", Icons.IconMarket],
        ["Sales", Icons.IconSales],
        ["Copilot", Icons.IconCopilot],
      ],
    },
    {
      heading: "BI / KPIs",
      icons: [
        ["Revenue", Icons.IconRevenue],
        ["Tonnage", Icons.IconTonnage],
        ["AvgPrice", Icons.IconAvgPrice],
        ["Conversion", Icons.IconConversion],
        ["Table", Icons.IconTable],
        ["Upload", Icons.IconUpload],
      ],
    },
    {
      heading: "Standards",
      icons: [
        ["Search", Icons.IconSearch],
        ["Datasheet", Icons.IconDatasheet],
        ["Download", Icons.IconDownload],
        ["Beaker", Icons.IconBeaker],
        ["Check", Icons.IconCheck],
        ["Cross", Icons.IconCross],
      ],
    },
    {
      heading: "Market",
      icons: [
        ["Bolt", Icons.IconBolt],
        ["Tune", Icons.IconTune],
        ["Refresh", Icons.IconRefresh],
        ["TrendUp", Icons.IconTrendUp],
        ["TrendDown", Icons.IconTrendDown],
        ["TrendFlat", Icons.IconTrendFlat],
        ["Calculator", Icons.IconCalculator],
        ["Gauge", Icons.IconGauge],
        ["Feed", Icons.IconFeed],
      ],
    },
    {
      heading: "Sales",
      icons: [
        ["Document", Icons.IconDocument],
        ["Route", Icons.IconRoute],
        ["Draft", Icons.IconDraft],
        ["Spark", Icons.IconSpark],
      ],
    },
    {
      heading: "Chat",
      icons: [
        ["Send", Icons.IconSend],
        ["Stop", Icons.IconStop],
        ["Trash", Icons.IconTrash],
        ["User", Icons.IconUser],
        ["Bot", Icons.IconBot],
      ],
    },
    {
      heading: "Layout & states",
      icons: [
        ["PanelCollapse", Icons.IconPanelCollapse],
        ["PanelExpand", Icons.IconPanelExpand],
        ["Close", Icons.IconClose],
        ["Menu", Icons.IconMenu],
        ["Globe", Icons.IconGlobe],
        ["Database", Icons.IconDatabase],
        ["Key", Icons.IconKey],
        ["Activity", Icons.IconActivity],
        ["Loader", Icons.IconLoader],
        ["ChevronDown", Icons.IconChevronDown],
        ["ChevronRight", Icons.IconChevronRight],
        ["ArrowOut", Icons.IconArrowOut],
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-8 py-16">
        {/* Header */}
        <header className="border-b border-line pb-10">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            Iraj Design System
          </p>
          <h1 className="mt-3 font-display text-[56px] leading-[1.04] tracking-tight text-ink">
            Fintech-Warm / Steel
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ink-muted">
            Light-mode-first. Warm paper base, graphite ink, a single copper accent for
            emphasis. Hierarchy through type and spacing; depth through soft warm shadows;
            structure through hairlines. No glass, no aurora, no gradient surfaces.
          </p>
        </header>

        {/* Palette */}
        <Section title="Palette" caption="Warm neutrals + one accent. Status colors used only as signal.">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            {palette.map((sw) => (
              <div key={sw.varName} className="bg-background p-4">
                <div
                  className="h-16 rounded-sm border border-line"
                  style={{ background: `var(${sw.varName})` }}
                />
                <div className="mt-3 text-[13px] font-medium text-ink">{sw.name}</div>
                <div className="font-mono text-[11px] text-ink-subtle">{sw.varName}</div>
                <div className="text-[11px] text-ink-subtle">{sw.note}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Type scale */}
        <Section title="Type scale" caption="Instrument Serif (display) + Inter (body) + Geist Mono.">
          <div className="space-y-5 rounded-md border border-line bg-card p-8 shadow-[var(--shadow-1)]">
            {typeScale.map((row) => (
              <div key={row.label} className="flex flex-col gap-1 border-b border-line pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8">
                <div className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
                  {row.label}
                </div>
                <div className={row.className}>{row.sample}</div>
              </div>
            ))}
            <div className="flex flex-col gap-1 border-b border-line pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8">
              <div className="w-40 shrink-0 font-mono text-[11px] uppercase tracking-wider text-ink-subtle">
                Mono / 13
              </div>
              <div className="font-mono text-[13px] text-ink">$1,248.50 / ton · 1,420 t</div>
            </div>
          </div>
        </Section>

        {/* Icons */}
        <Section title="Icon library" caption="24×24 · 1.5px stroke · round caps · custom — no Lucide.">
          <div className="space-y-8">
            {iconGroups.map((group) => (
              <div key={group.heading}>
                <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-subtle">
                  {group.heading}
                </div>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-6 lg:grid-cols-9">
                  {group.icons.map(([name, Icon]) => (
                    <div key={name} className="flex flex-col items-center gap-2 bg-background px-2 py-5">
                      <Icon className="size-5 text-ink" />
                      <span className="text-[10px] text-ink-subtle">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" caption="Deliberate radii (6px). Copper primary. No glow, no gradient.">
          <div className="space-y-6 rounded-md border border-line bg-card p-8 shadow-[var(--shadow-1)]">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="primary">Small</Button>
              <Button size="default" variant="primary">Default</Button>
              <Button size="lg" variant="primary">Large</Button>
              <Button size="icon" variant="outline" aria-label="refresh"><Icons.IconRefresh /></Button>
              <Button size="icon-sm" variant="outline" aria-label="close"><Icons.IconClose /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary"><Icons.IconDownload /> Export</Button>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges" caption="Status pills — 6px radius, hairline border, not all-pill.">
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-card p-8 shadow-[var(--shadow-1)]">
            <Badge>Neutral</Badge>
            <Badge variant="accent">Copper</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="positive">Active</Badge>
            <Badge variant="negative">Declined</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="info">Synced</Badge>
          </div>
        </Section>

        {/* Surfaces & elevation */}
        <Section title="Surfaces & elevation" caption="Three functional warm shadows. Hairline always paired.">
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Shadow 1</CardTitle>
                <CardDescription>Default cards — barely there.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-[12px] text-ink-muted">--shadow-1</div>
              </CardContent>
            </Card>
            <div className="rounded-md border border-line bg-card p-6 shadow-[var(--shadow-2)]">
              <div className="font-display text-lg text-ink">Shadow 2</div>
              <p className="mt-1 text-sm text-ink-muted">Hover / raised.</p>
              <div className="mt-4 font-mono text-[12px] text-ink-muted">--shadow-2</div>
            </div>
            <div className="rounded-md border border-line bg-card p-6 shadow-[var(--shadow-3)]">
              <div className="font-display text-lg text-ink">Shadow 3</div>
              <p className="mt-1 text-sm text-ink-muted">Modals, dropdowns.</p>
              <div className="mt-4 font-mono text-[12px] text-ink-muted">--shadow-3</div>
            </div>
          </div>
        </Section>

        {/* Stat cards */}
        <Section title="Stat cards" caption="Serif KPI numbers. Hairline. No gradient border, no stagger.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue" value="$4.82M" sub="↑ 6.2% vs last cycle" icon={Icons.IconRevenue} tone="accent" />
            <StatCard label="Tonnage" value="1,420 t" sub="A3–A6 combined" icon={Icons.IconTonnage} tone="ink" />
            <StatCard label="Avg Price / ton" value="$1,248" sub="↑ across 4 grades" icon={Icons.IconAvgPrice} tone="positive" />
            <StatCard label="Conversion" value="38.4%" sub="↓ 1.1 pts" icon={Icons.IconConversion} tone="negative" />
          </div>
        </Section>

        {/* Panel + table */}
        <Section title="Panel & table" caption="Structural hairlines, sunken wells, monospace numbers.">
          <Panel>
            <PanelHeader>
              <PanelTitle>Grade performance</PanelTitle>
              <Badge variant="accent">Live</Badge>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-ink-subtle">
                    <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-[11px]">Grade</th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[11px]">Tonnage</th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[11px]">Revenue</th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-[11px]">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["A3", "612 t", "$763,440", "+4.1%"],
                    ["A4", "430 t", "$537,600", "+2.8%"],
                    ["A5", "238 t", "$297,500", "−0.6%"],
                    ["A6", "140 t", "$175,000", "+1.2%"],
                  ].map(([grade, ton, rev, delta], i) => (
                    <tr key={grade} className={i % 2 === 1 ? "bg-bg-subtle/60" : ""}>
                      <td className="px-6 py-3 font-medium text-ink">{grade}</td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-ink">{ton}</td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-ink">{rev}</td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums text-positive">{delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Section>

        {/* Radii & motion notes */}
        <Section title="Radii & motion" caption="Discipline over decoration.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Panel tone="subtle">
              <PanelBody>
                <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-subtle">Radii</div>
                <div className="mt-4 flex items-end gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-12 rounded-sm border border-line-strong bg-card" />
                    <span className="font-mono text-[11px] text-ink-subtle">6 · sm</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-12 rounded-md border border-line-strong bg-card" />
                    <span className="font-mono text-[11px] text-ink-subtle">10 · md</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-12 rounded-lg border border-line-strong bg-card" />
                    <span className="font-mono text-[11px] text-ink-subtle">14 · lg</span>
                  </div>
                </div>
              </PanelBody>
            </Panel>
            <Panel tone="subtle">
              <PanelBody>
                <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-subtle">Motion</div>
                <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                  <li>· 150ms color/opacity hovers</li>
                  <li>· 200ms chat message fade (no translate)</li>
                  <li>· Skeleton pulse on sunken blocks</li>
                  <li>· No staggered mount entrances</li>
                  <li>· prefers-reduced-motion gated</li>
                </ul>
              </PanelBody>
            </Panel>
          </div>
        </Section>

        <footer className="mt-16 border-t border-line pt-6 text-[12px] text-ink-subtle">
          Temporary sample sheet — remove before final delivery.
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="mb-4 flex items-baseline justify-between gap-6">
        <h2 className="font-display text-[22px] leading-tight tracking-tight text-ink">{title}</h2>
        <p className="text-[13px] text-ink-muted">{caption}</p>
      </div>
      {children}
    </section>
  );
}
