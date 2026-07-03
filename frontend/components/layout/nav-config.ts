import {
  LayoutDashboard,
  BarChart3,
  Library,
  LineChart,
  Briefcase,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type TFunction = (key: string, values?: Record<string, string | number | Date>) => string;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export function getNavItems(t: TFunction): NavItem[] {
  return [
    {
      label: t("nav.dashboard"),
      href: "/",
      icon: LayoutDashboard,
      description: t("nav.dashboard_desc"),
    },
    {
      label: t("nav.bi"),
      href: "/bi",
      icon: BarChart3,
      description: t("nav.bi_desc"),
    },
    {
      label: t("nav.standards"),
      href: "/standards",
      icon: Library,
      description: t("nav.standards_desc"),
    },
    {
      label: t("nav.live_market"),
      href: "/market",
      icon: LineChart,
      description: t("nav.live_market_desc"),
    },
    {
      label: t("nav.sales_contracts"),
      href: "/sales",
      icon: Briefcase,
      description: t("nav.sales_contracts_desc"),
    },
    {
      label: t("nav.ai_copilot"),
      href: "/chat",
      icon: Sparkles,
      description: t("nav.ai_copilot_desc"),
    },
  ];
}
