import {
  IconDashboard,
  IconAnalytics,
  IconStandards,
  IconMarket,
  IconSales,
  IconCopilot,
  type IconComponent,
} from "@/components/ui/icons";

type TFunction = (key: string, values?: Record<string, string | number | Date>) => string;

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  description: string;
}

export function getNavItems(t: TFunction): NavItem[] {
  return [
    {
      label: t("nav.dashboard"),
      href: "/",
      icon: IconDashboard,
      description: t("nav.dashboard_desc"),
    },
    {
      label: t("nav.bi"),
      href: "/bi",
      icon: IconAnalytics,
      description: t("nav.bi_desc"),
    },
    {
      label: t("nav.standards"),
      href: "/standards",
      icon: IconStandards,
      description: t("nav.standards_desc"),
    },
    {
      label: t("nav.live_market"),
      href: "/market",
      icon: IconMarket,
      description: t("nav.live_market_desc"),
    },
    {
      label: t("nav.sales_contracts"),
      href: "/sales",
      icon: IconSales,
      description: t("nav.sales_contracts_desc"),
    },
    {
      label: t("nav.ai_copilot"),
      href: "/chat",
      icon: IconCopilot,
      description: t("nav.ai_copilot_desc"),
    },
  ];
}
