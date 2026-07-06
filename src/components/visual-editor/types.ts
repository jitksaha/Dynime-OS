// ─── Elementor-Level Visual Editor Widget Types ─────────────────────

export type WidgetCategory = "basic" | "content" | "marketing" | "media" | "layout";

export interface WidgetSetting {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "color" | "select" | "toggle" | "slider" | "url" | "icon" | "image" | "items" | "alignment";
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: any;
  tab?: "content" | "style" | "advanced";
}

export interface WidgetDefinition {
  type: string;
  label: string;
  icon: string; // lucide icon name
  category: WidgetCategory;
  description: string;
  defaults: Record<string, any>;
  settings: WidgetSetting[];
}

export interface WidgetInstance {
  id: string;
  type: string;
  props: Record<string, any>;
}

export interface EditorState {
  widgets: WidgetInstance[];
  selectedWidgetId: string | null;
  isDragging: boolean;
  previewMode: boolean;
  deviceView: "desktop" | "tablet" | "mobile";
}

export type EditorContext = "page" | "post" | "email";
