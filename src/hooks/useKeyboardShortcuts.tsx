import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export interface Shortcut {
  keys: string[];
  label: string;
  description: string;
  action: () => void;
  group: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ["Ctrl", "K"], label: "Search", description: "Open global search", action: () => {
      document.dispatchEvent(new CustomEvent("open-global-search"));
    }, group: "Navigation" },
    { keys: ["Ctrl", "J"], label: "AI Copilot", description: "Open AI Copilot command bar", action: () => {}, group: "AI" },
    { keys: ["Ctrl", "/"], label: "Shortcuts", description: "Toggle keyboard shortcuts", action: () => setShowCheatSheet((p) => !p), group: "Help" },
    { keys: ["G", "D"], label: "Dashboard", description: "Go to Dashboard", action: () => navigate("/dashboard"), group: "Navigation" },
    { keys: ["G", "H"], label: "HRM", description: "Go to Employees", action: () => navigate("/hrm/employees"), group: "Navigation" },
    { keys: ["G", "C"], label: "CRM", description: "Go to CRM Pipeline", action: () => navigate("/crm"), group: "Navigation" },
    { keys: ["G", "I"], label: "Invoices", description: "Go to Invoices", action: () => navigate("/accounting/invoices"), group: "Navigation" },
    { keys: ["G", "P"], label: "Projects", description: "Go to Projects", action: () => navigate("/projects"), group: "Navigation" },
    { keys: ["G", "T"], label: "Tickets", description: "Go to Helpdesk", action: () => navigate("/helpdesk/tickets"), group: "Navigation" },
    { keys: ["G", "K"], label: "Calendar", description: "Go to Calendar", action: () => navigate("/meetings"), group: "Navigation" },
    { keys: ["G", "S"], label: "Settings", description: "Go to Settings", action: () => navigate("/settings"), group: "Navigation" },
    { keys: ["G", "N"], label: "Notifications", description: "Go to Notifications", action: () => navigate("/notifications"), group: "Navigation" },
    { keys: ["G", "M"], label: "Marketing", description: "Go to Marketing", action: () => navigate("/marketing/campaigns"), group: "Navigation" },
    { keys: ["G", "W"], label: "Wallet", description: "Go to Wallet", action: () => navigate("/wallet"), group: "Navigation" },
    { keys: ["G", "O"], label: "POS", description: "Go to Point of Sale", action: () => navigate("/pos"), group: "Navigation" },
    { keys: ["F2"], label: "POS Search", description: "Focus POS product search", action: () => {}, group: "POS" },
    { keys: ["F3"], label: "POS Scan", description: "Open barcode scanner", action: () => {}, group: "POS" },
    { keys: ["F9"], label: "POS Checkout", description: "Complete POS sale", action: () => {}, group: "POS" },
    { keys: ["Escape"], label: "Close", description: "Close dialog/overlay", action: () => setShowCheatSheet(false), group: "General" },
  ];

  // Track sequential key presses for 2-key combos (G+X)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in input fields
    const tag = (e.target as HTMLElement).tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    if ((e.target as HTMLElement).isContentEditable) return;

    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+K
    if (ctrl && key === "k") {
      e.preventDefault();
      shortcuts.find((s) => s.keys.join("+") === "Ctrl+K")?.action();
      return;
    }

    // Ctrl+/
    if (ctrl && key === "/") {
      e.preventDefault();
      setShowCheatSheet((p) => !p);
      return;
    }

    // Escape
    if (key === "Escape") {
      setShowCheatSheet(false);
      return;
    }

    // Sequential G+X shortcuts
    if (key === "g" || key === "G") {
      (window as any).__shortcutGPressed = Date.now();
      return;
    }

    const gTime = (window as any).__shortcutGPressed;
    if (gTime && Date.now() - gTime < 500) {
      (window as any).__shortcutGPressed = 0;
      const upper = key.toUpperCase();
      const shortcut = shortcuts.find(
        (s) => s.keys[0] === "G" && s.keys[1] === upper
      );
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts, showCheatSheet, setShowCheatSheet };
}
