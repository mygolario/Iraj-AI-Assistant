import * as React from "react";

/**
 * Iraj — Custom Icon Library
 * Single 24x24 grid. 1.5px stroke. Round line-caps/joins. 2px corner radius
 * on terminals. Drawn to feel like a precision-instrument brand: thin
 * structural lines, no decorative fills, no cartoon rounding. Inherits color
 * via `currentColor` and size via `className` (default size-5 / 20px).
 *
 * Intentionally NOT Lucide/Heroicons/Phosphor. Every icon is hand-authored
 * for this product so the set reads as belonging to Iraj, not interchangeable.
 */

export type IconProps = React.SVGProps<SVGSVGElement>;

export type IconComponent = (props: IconProps) => React.ReactNode;

function Svg({ className, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// Local cn to avoid a circular import through lib/utils consumers.
function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* --- Navigation ------------------------------------------------------- */

export function IconDashboard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="1.5" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="1.5" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    </Svg>
  );
}

export function IconAnalytics(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5.5" y="11" width="3" height="6" rx="0.5" />
      <rect x="10.5" y="7" width="3" height="10" rx="0.5" />
      <rect x="15.5" y="13" width="3" height="4" rx="0.5" />
      <path d="M5 12.5 10.5 8.5 16 9.5 19.5 6" opacity={0.45} />
    </Svg>
  );
}

export function IconStandards(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
      <line x1="8.5" y1="18" x2="13" y2="18" />
    </Svg>
  );
}

export function IconMarket(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 17.5 8.5 12l3.5 3 7-7.5" />
      <path d="M14.5 7.5H19V12" />
      <line x1="3" y1="20.5" x2="20" y2="20.5" opacity={0.4} />
    </Svg>
  );
}

export function IconSales(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <line x1="8.5" y1="9" x2="14" y2="9" />
      <line x1="8.5" y1="12.5" x2="14" y2="12.5" />
      <circle cx="15.5" cy="17" r="2.2" />
      <path d="M14 18.6 13 20.5" />
    </Svg>
  );
}

// Copilot: a discrete beam/speech mark — explicitly NOT sparkle fairy-dust.
export function IconCopilot(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 19 15.5H10l-4 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 14V8A1.5 1.5 0 0 1 5 6.5z" />
      <line x1="8" y1="10" x2="14" y2="10" />
      <line x1="8" y1="13" x2="11.5" y2="13" />
    </Svg>
  );
}

/* --- BI / KPIs -------------------------------------------------------- */

export function IconRevenue(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="20" x2="20" y2="20" opacity={0.4} />
      <path d="M5 15.5 9.5 10l3 2.5L19 5.5" />
      <path d="M14.5 5.5H19V10" />
    </Svg>
  );
}

export function IconTonnage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="7.5" width="16" height="11" rx="1.5" />
      <circle cx="8" cy="18.5" r="1.6" />
      <circle cx="16" cy="18.5" r="1.6" />
      <path d="M7 7.5 9 4h6l2 3.5" />
      <line x1="12" y1="11" x2="12" y2="15" />
    </Svg>
  );
}

export function IconAvgPrice(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.2a3 3 0 0 0-2.6-1.2c-1.7 0-2.9.9-2.9 2.2 0 3.1 5.6 1.6 5.6 4.7 0 1.3-1.3 2.3-3 2.3a3.2 3.2 0 0 1-2.8-1.4" />
      <line x1="12" y1="6" x2="12" y2="8" />
      <line x1="12" y1="16" x2="12" y2="18" />
    </Svg>
  );
}

export function IconPercent(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="6" y1="18" x2="18" y2="6" />
      <circle cx="8" cy="8" r="1.8" />
      <circle cx="16" cy="16" r="1.8" />
    </Svg>
  );
}

export function IconConversion(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h11l-2.5-2.5" />
      <path d="M20 16H9l2.5 2.5" />
    </Svg>
  );
}

export function IconTable(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="3.5" y1="14.5" x2="20.5" y2="14.5" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
      <line x1="14" y1="4.5" x2="14" y2="19.5" />
    </Svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
      <path d="M12 15V4" />
      <path d="M8 8 12 4l4 4" />
    </Svg>
  );
}

/* --- Standards Finder ------------------------------------------------- */

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="20" y2="20" />
    </Svg>
  );
}

export function IconDatasheet(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" opacity={0.5} />
      <rect x="8.5" y="10" width="7" height="2" rx="0.5" />
      <rect x="8.5" y="13.5" width="7" height="2" rx="0.5" />
      <rect x="8.5" y="17" width="4" height="2" rx="0.5" />
    </Svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
    </Svg>
  );
}

export function IconBeaker(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v6L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" />
      <line x1="7.5" y1="14.5" x2="16.5" y2="14.5" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5 10 17l9-10" />
    </Svg>
  );
}

export function IconCross(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

/* --- Live Market ------------------------------------------------------ */

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3 5 13.5h6L11 21l8-10.5h-6z" />
    </Svg>
  );
}

export function IconTune(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2" fill="var(--background)" />
      <circle cx="15" cy="16" r="2" fill="var(--background)" />
    </Svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 8a8 8 0 0 0-14-2.5L3 8" />
      <path d="M5 16a8 8 0 0 0 14 2.5L21 16" />
      <path d="M19 4v4h-4" />
      <path d="M5 20v-4h4" />
    </Svg>
  );
}

export function IconTrendUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 15.5 10 9.5l3.5 3L20 6" />
      <path d="M15 6h5v5" />
    </Svg>
  );
}

export function IconTrendDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8.5 10 14.5l3.5-3L20 18" />
      <path d="M15 18h5v-5" />
    </Svg>
  );
}

export function IconTrendFlat(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M17 9l3 3-3 3" />
    </Svg>
  );
}

export function IconCalculator(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <rect x="7.5" y="5.5" width="9" height="3" rx="0.5" />
      <circle cx="9" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconGauge(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <line x1="12" y1="16" x2="15.5" y2="9.5" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconFeed(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <line x1="3.5" y1="8.5" x2="20.5" y2="8.5" />
      <rect x="6.5" y="11.5" width="5" height="5" rx="0.5" />
      <line x1="13.5" y1="12.5" x2="17.5" y2="12.5" />
      <line x1="13.5" y1="15.5" x2="17.5" y2="15.5" />
    </Svg>
  );
}

/* --- Sales & Contracts ------------------------------------------------ */

export function IconDocument(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" opacity={0.5} />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14" x2="15.5" y2="14" />
      <line x1="8.5" y1="17" x2="13" y2="17" />
    </Svg>
  );
}

export function IconRoute(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5v3a4 4 0 0 0 4 4h4a3 3 0 0 1 3 3" opacity={0.5} />
      <path d="M8.5 6H14a4 4 0 0 1 0 8" />
    </Svg>
  );
}

export function IconDraft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" opacity={0.5} />
      <path d="M8.5 14 14 8.5l1.5 1.5L10 15.5l-2 .5z" />
    </Svg>
  );
}

// Intentional AI-action mark — distinct from IconCopilot (which is the
// nav/feature glyph). Used inline for "generate with AI" actions.
export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v4" />
      <path d="M12 16v4" />
      <path d="M4 12h4" />
      <path d="M16 12h4" />
      <path d="M12 9.5 13 11l1.5 1-1.5 1-1 1.5-1-1.5L9 12l1.5-1z" />
    </Svg>
  );
}

/* --- Chat ------------------------------------------------------------- */

export function IconSend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12 20 4l-6 16-3-7z" />
      <line x1="11" y1="13" x2="20" y2="4" />
    </Svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16" />
      <path d="M9 6.5V4.5h6v2" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5" />
      <line x1="10" y1="10" x2="10" y2="17" />
      <line x1="14" y1="10" x2="14" y2="17" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
    </Svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="8" width="14" height="10" rx="2" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <line x1="12" y1="5" x2="12" y2="8" />
      <circle cx="12" cy="4" r="1" fill="currentColor" stroke="none" />
      <line x1="9" y1="18" x2="9" y2="20" />
      <line x1="15" y1="18" x2="15" y2="20" />
    </Svg>
  );
}

/* --- Layout chrome ---------------------------------------------------- */

export function IconPanelCollapse(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
      <path d="M6.5 10 8 11.5 6.5 13" />
    </Svg>
  );
}

export function IconPanelExpand(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" />
      <path d="M6 10 4.5 11.5 6 13" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" />
      <path d="M12 3.5c2.5 2.5 2.5 14 0 17" />
      <path d="M12 3.5c-2.5 2.5-2.5 14 0 17" />
    </Svg>
  );
}

export function IconDatabase(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </Svg>
  );
}

export function IconKey(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="3.5" />
      <path d="M10.5 10.5 20 20" />
      <path d="M16 16l2-2" />
      <path d="M18.5 18.5 20 20" />
    </Svg>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
    </Svg>
  );
}

/* --- States / chevrons / arrows --------------------------------------- */

export function IconLoader(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4a8 8 0 1 0 8 8" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9.5 12 15l6-5.5" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </Svg>
  );
}

export function IconArrowOut(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Svg>
  );
}

/* --- Theme ----------------------------------------------------------- */

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.9 4.9 1.8 1.8" />
      <path d="m17.3 17.3 1.8 1.8" />
      <path d="m19.1 4.9-1.8 1.8" />
      <path d="m6.7 17.3-1.8 1.8" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </Svg>
  );
}
