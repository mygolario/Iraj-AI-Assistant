import {
  LayoutDashboard,
  BarChart3,
  Library,
  LineChart,
  Briefcase,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "Command center overview",
  },
  {
    label: "BI & KPIs",
    href: "/bi",
    icon: BarChart3,
    description: "Sales analytics & performance",
  },
  {
    label: "Standards",
    href: "/standards",
    icon: Library,
    description: "RAG search & datasheets",
  },
  {
    label: "Live Market",
    href: "/market",
    icon: LineChart,
    description: "Pricing feeds & arbitrage",
  },
  {
    label: "Sales & Contracts",
    href: "/sales",
    icon: Briefcase,
    description: "Contracts & roadmaps",
  },
  {
    label: "AI Copilot",
    href: "/chat",
    icon: Sparkles,
    description: "Full-screen chat assistant",
  },
];
