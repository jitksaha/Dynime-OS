import {
  Users, Building2, FileText, Megaphone, FileCheck, CalendarCheck,
  CalendarDays, Package, MessageSquare, Clock, Wallet, ShieldCheck,
  Mail, GitBranch, Layers, Briefcase, Palmtree, Bot, Inbox,
  ScrollText, File, Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  "building-2": Building2,
  "file-text": FileText,
  megaphone: Megaphone,
  "file-check": FileCheck,
  "calendar-check": CalendarCheck,
  "calendar-days": CalendarDays,
  package: Package,
  "message-square": MessageSquare,
  clock: Clock,
  wallet: Wallet,
  "shield-check": ShieldCheck,
  mail: Mail,
  "git-branch": GitBranch,
  layers: Layers,
  briefcase: Briefcase,
  "palm-tree": Palmtree,
  bot: Bot,
  inbox: Inbox,
  "scroll-text": ScrollText,
  file: File,
};

export function getSearchIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Search;
}
