import type { WidgetDefinition } from "./types";

// ─── Complete Elementor-Level Widget Registry ────────────────────

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ══════════════════════════════════════════════════════════════
  // BASIC WIDGETS
  // ══════════════════════════════════════════════════════════════
  {
    type: "heading",
    label: "Heading",
    icon: "Type",
    category: "basic",
    description: "Add stylish headings with multiple levels",
    defaults: { text: "Your Heading", tag: "h2", align: "left", color: "", fontSize: 32, fontWeight: "bold", letterSpacing: 0 },
    settings: [
      { key: "text", label: "Text", type: "text", tab: "content", defaultValue: "Your Heading" },
      { key: "tag", label: "HTML Tag", type: "select", tab: "content", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }, { label: "H4", value: "h4" }, { label: "H5", value: "h5" }, { label: "H6", value: "h6" }] },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
      { key: "color", label: "Color", type: "color", tab: "style" },
      { key: "fontSize", label: "Font Size", type: "slider", tab: "style", min: 12, max: 96, step: 1 },
      { key: "fontWeight", label: "Weight", type: "select", tab: "style", options: [{ label: "Normal", value: "normal" }, { label: "Medium", value: "500" }, { label: "Semi Bold", value: "600" }, { label: "Bold", value: "bold" }, { label: "Extra Bold", value: "800" }] },
      { key: "letterSpacing", label: "Letter Spacing", type: "slider", tab: "style", min: -2, max: 10, step: 0.5 },
    ],
  },
  {
    type: "text_editor",
    label: "Text Editor",
    icon: "FileText",
    category: "basic",
    description: "Rich text content with markdown support",
    defaults: { content: "Add your text content here. Supports **bold**, *italic*, and [links](/).", align: "left", color: "", fontSize: 16, lineHeight: 1.6 },
    settings: [
      { key: "content", label: "Content", type: "textarea", tab: "content" },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
      { key: "color", label: "Color", type: "color", tab: "style" },
      { key: "fontSize", label: "Font Size", type: "slider", tab: "style", min: 12, max: 32, step: 1 },
      { key: "lineHeight", label: "Line Height", type: "slider", tab: "style", min: 1, max: 3, step: 0.1 },
    ],
  },
  {
    type: "image",
    label: "Image",
    icon: "ImageIcon",
    category: "basic",
    description: "Add images with captions and links",
    defaults: { src: "https://placehold.co/800x400", alt: "Image", caption: "", link: "", width: "100%", borderRadius: 8, objectFit: "cover", shadow: "none" },
    settings: [
      { key: "src", label: "Image URL", type: "url", tab: "content" },
      { key: "alt", label: "Alt Text", type: "text", tab: "content" },
      { key: "caption", label: "Caption", type: "text", tab: "content" },
      { key: "link", label: "Link", type: "url", tab: "content" },
      { key: "width", label: "Width", type: "text", tab: "style", placeholder: "100% or 400px" },
      { key: "borderRadius", label: "Border Radius", type: "slider", tab: "style", min: 0, max: 50 },
      { key: "objectFit", label: "Fit", type: "select", tab: "style", options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }, { label: "Fill", value: "fill" }] },
      { key: "shadow", label: "Shadow", type: "select", tab: "style", options: [{ label: "None", value: "none" }, { label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }, { label: "XL", value: "xl" }] },
    ],
  },
  {
    type: "button",
    label: "Button",
    icon: "MousePointerClick",
    category: "basic",
    description: "Customizable call-to-action buttons",
    defaults: { text: "Click Here", url: "#", variant: "primary", size: "md", align: "left", borderRadius: 8, fullWidth: false, icon: "" },
    settings: [
      { key: "text", label: "Text", type: "text", tab: "content" },
      { key: "url", label: "Link", type: "url", tab: "content" },
      { key: "variant", label: "Style", type: "select", tab: "style", options: [{ label: "Primary", value: "primary" }, { label: "Secondary", value: "secondary" }, { label: "Outline", value: "outline" }, { label: "Ghost", value: "ghost" }] },
      { key: "size", label: "Size", type: "select", tab: "style", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }] },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
      { key: "borderRadius", label: "Border Radius", type: "slider", tab: "style", min: 0, max: 50 },
      { key: "fullWidth", label: "Full Width", type: "toggle", tab: "style" },
    ],
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "ArrowUpDown",
    category: "basic",
    description: "Add vertical spacing between widgets",
    defaults: { height: 40 },
    settings: [
      { key: "height", label: "Height (px)", type: "slider", tab: "content", min: 8, max: 200, step: 4 },
    ],
  },
  {
    type: "divider",
    label: "Divider",
    icon: "Minus",
    category: "basic",
    description: "Horizontal line separator",
    defaults: { style: "solid", weight: 1, color: "", width: "100%", align: "center" },
    settings: [
      { key: "style", label: "Style", type: "select", tab: "style", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }, { label: "Double", value: "double" }] },
      { key: "weight", label: "Weight", type: "slider", tab: "style", min: 1, max: 10 },
      { key: "color", label: "Color", type: "color", tab: "style" },
      { key: "width", label: "Width", type: "text", tab: "style", placeholder: "100% or 200px" },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
    ],
  },
  {
    type: "google_maps",
    label: "Google Maps",
    icon: "MapPin",
    category: "basic",
    description: "Embed Google Maps location",
    defaults: { address: "New York, USA", zoom: 14, height: 300 },
    settings: [
      { key: "address", label: "Address", type: "text", tab: "content" },
      { key: "zoom", label: "Zoom", type: "slider", tab: "content", min: 1, max: 20 },
      { key: "height", label: "Height (px)", type: "slider", tab: "style", min: 150, max: 600 },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // CONTENT WIDGETS
  // ══════════════════════════════════════════════════════════════
  {
    type: "icon_box",
    label: "Icon Box",
    icon: "Box",
    category: "content",
    description: "Icon with heading and description",
    defaults: { icon: "🚀", heading: "Feature Title", description: "Feature description goes here", align: "center", iconSize: 48, iconColor: "" },
    settings: [
      { key: "icon", label: "Icon/Emoji", type: "text", tab: "content" },
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "description", label: "Description", type: "textarea", tab: "content" },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
      { key: "iconSize", label: "Icon Size", type: "slider", tab: "style", min: 24, max: 96 },
      { key: "iconColor", label: "Icon Color", type: "color", tab: "style" },
    ],
  },
  {
    type: "image_box",
    label: "Image Box",
    icon: "Image",
    category: "content",
    description: "Image with heading and description",
    defaults: { src: "https://placehold.co/400x250", heading: "Image Box Title", description: "Description text", imageHeight: 200 },
    settings: [
      { key: "src", label: "Image URL", type: "url", tab: "content" },
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "description", label: "Description", type: "textarea", tab: "content" },
      { key: "imageHeight", label: "Image Height", type: "slider", tab: "style", min: 100, max: 500 },
    ],
  },
  {
    type: "star_rating",
    label: "Star Rating",
    icon: "Star",
    category: "content",
    description: "Display star ratings",
    defaults: { rating: 4.5, maxStars: 5, size: 24, color: "#f59e0b", label: "" },
    settings: [
      { key: "rating", label: "Rating", type: "slider", tab: "content", min: 0, max: 5, step: 0.5 },
      { key: "maxStars", label: "Max Stars", type: "number", tab: "content" },
      { key: "size", label: "Size", type: "slider", tab: "style", min: 16, max: 64 },
      { key: "color", label: "Color", type: "color", tab: "style" },
      { key: "label", label: "Label", type: "text", tab: "content" },
    ],
  },
  {
    type: "counter",
    label: "Counter",
    icon: "Hash",
    category: "content",
    description: "Animated number counter",
    defaults: { startValue: 0, endValue: 1000, prefix: "", suffix: "+", title: "Happy Customers", duration: 2000 },
    settings: [
      { key: "startValue", label: "Start Value", type: "number", tab: "content" },
      { key: "endValue", label: "End Value", type: "number", tab: "content" },
      { key: "prefix", label: "Prefix", type: "text", tab: "content" },
      { key: "suffix", label: "Suffix", type: "text", tab: "content" },
      { key: "title", label: "Title", type: "text", tab: "content" },
      { key: "duration", label: "Duration (ms)", type: "slider", tab: "content", min: 500, max: 5000, step: 100 },
    ],
  },
  {
    type: "testimonial",
    label: "Testimonial",
    icon: "Quote",
    category: "content",
    description: "Customer testimonial card",
    defaults: { quote: "This product changed our workflow completely!", name: "Jane Doe", role: "CEO, Acme Inc.", avatar: "", rating: 5 },
    settings: [
      { key: "quote", label: "Quote", type: "textarea", tab: "content" },
      { key: "name", label: "Name", type: "text", tab: "content" },
      { key: "role", label: "Role", type: "text", tab: "content" },
      { key: "avatar", label: "Avatar URL", type: "url", tab: "content" },
      { key: "rating", label: "Rating", type: "slider", tab: "content", min: 0, max: 5, step: 1 },
    ],
  },
  {
    type: "tabs",
    label: "Tabs",
    icon: "PanelTop",
    category: "content",
    description: "Tabbed content panels",
    defaults: { items: [{ title: "Tab 1", content: "Content for tab 1" }, { title: "Tab 2", content: "Content for tab 2" }, { title: "Tab 3", content: "Content for tab 3" }] },
    settings: [
      { key: "items", label: "Tabs", type: "items", tab: "content" },
    ],
  },
  {
    type: "accordion",
    label: "Accordion",
    icon: "ChevronDown",
    category: "content",
    description: "Expandable accordion sections",
    defaults: { items: [{ title: "Section 1", content: "Content for section 1" }, { title: "Section 2", content: "Content for section 2" }], icon: "chevron", allowMultiple: false },
    settings: [
      { key: "items", label: "Items", type: "items", tab: "content" },
      { key: "allowMultiple", label: "Allow Multiple Open", type: "toggle", tab: "content" },
    ],
  },
  {
    type: "toggle",
    label: "Toggle",
    icon: "ToggleRight",
    category: "content",
    description: "Toggle list sections",
    defaults: { items: [{ title: "Toggle 1", content: "Toggle content 1" }] },
    settings: [
      { key: "items", label: "Items", type: "items", tab: "content" },
    ],
  },
  {
    type: "social_icons",
    label: "Social Icons",
    icon: "Share2",
    category: "content",
    description: "Social media icon links",
    defaults: { items: [{ platform: "twitter", url: "#" }, { platform: "linkedin", url: "#" }, { platform: "facebook", url: "#" }], size: 24, shape: "rounded", align: "center" },
    settings: [
      { key: "items", label: "Social Links", type: "items", tab: "content" },
      { key: "size", label: "Size", type: "slider", tab: "style", min: 16, max: 64 },
      { key: "shape", label: "Shape", type: "select", tab: "style", options: [{ label: "Circle", value: "circle" }, { label: "Rounded", value: "rounded" }, { label: "Square", value: "square" }] },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
    ],
  },
  {
    type: "alert",
    label: "Alert",
    icon: "AlertTriangle",
    category: "content",
    description: "Alert/notice boxes",
    defaults: { title: "Heads Up!", content: "This is an important notice.", variant: "info", dismissible: false },
    settings: [
      { key: "title", label: "Title", type: "text", tab: "content" },
      { key: "content", label: "Content", type: "textarea", tab: "content" },
      { key: "variant", label: "Variant", type: "select", tab: "style", options: [{ label: "Info", value: "info" }, { label: "Success", value: "success" }, { label: "Warning", value: "warning" }, { label: "Error", value: "error" }] },
      { key: "dismissible", label: "Dismissible", type: "toggle", tab: "content" },
    ],
  },
  {
    type: "icon_list",
    label: "Icon List",
    icon: "List",
    category: "content",
    description: "List with icons",
    defaults: { items: [{ icon: "✓", text: "Feature one" }, { icon: "✓", text: "Feature two" }, { icon: "✓", text: "Feature three" }], iconColor: "", spacing: 12 },
    settings: [
      { key: "items", label: "Items", type: "items", tab: "content" },
      { key: "iconColor", label: "Icon Color", type: "color", tab: "style" },
      { key: "spacing", label: "Spacing", type: "slider", tab: "style", min: 4, max: 32 },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MARKETING WIDGETS
  // ══════════════════════════════════════════════════════════════
  {
    type: "cta",
    label: "Call to Action",
    icon: "Megaphone",
    category: "marketing",
    description: "Conversion-focused call-to-action section",
    defaults: { heading: "Ready to Get Started?", description: "Join thousands of happy customers today.", buttonText: "Start Free Trial", buttonUrl: "/signup", secondaryText: "", secondaryUrl: "", bgColor: "", align: "center" },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "description", label: "Description", type: "textarea", tab: "content" },
      { key: "buttonText", label: "Button Text", type: "text", tab: "content" },
      { key: "buttonUrl", label: "Button URL", type: "url", tab: "content" },
      { key: "secondaryText", label: "Secondary Button", type: "text", tab: "content" },
      { key: "secondaryUrl", label: "Secondary URL", type: "url", tab: "content" },
      { key: "bgColor", label: "Background", type: "color", tab: "style" },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
    ],
  },
  {
    type: "pricing_table",
    label: "Pricing Table",
    icon: "DollarSign",
    category: "marketing",
    description: "Pricing comparison cards",
    defaults: { items: [{ name: "Starter", price: "$9", period: "/mo", features: ["5 Users", "10GB Storage", "Email Support"], cta: "Get Started", ctaUrl: "#", highlighted: false }, { name: "Pro", price: "$29", period: "/mo", features: ["Unlimited Users", "100GB Storage", "Priority Support", "API Access"], cta: "Get Started", ctaUrl: "#", highlighted: true }, { name: "Enterprise", price: "$99", period: "/mo", features: ["Everything in Pro", "Custom Integrations", "Dedicated Manager", "SLA"], cta: "Contact Sales", ctaUrl: "#", highlighted: false }] },
    settings: [
      { key: "items", label: "Plans", type: "items", tab: "content" },
    ],
  },
  {
    type: "countdown",
    label: "Countdown",
    icon: "Timer",
    category: "marketing",
    description: "Countdown timer to a date",
    defaults: { targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], title: "Sale Ends In", showDays: true, showHours: true, showMinutes: true, showSeconds: true },
    settings: [
      { key: "targetDate", label: "Target Date", type: "text", tab: "content", placeholder: "YYYY-MM-DD" },
      { key: "title", label: "Title", type: "text", tab: "content" },
      { key: "showDays", label: "Show Days", type: "toggle", tab: "content" },
      { key: "showHours", label: "Show Hours", type: "toggle", tab: "content" },
      { key: "showMinutes", label: "Show Minutes", type: "toggle", tab: "content" },
      { key: "showSeconds", label: "Show Seconds", type: "toggle", tab: "content" },
    ],
  },
  {
    type: "progress_bar",
    label: "Progress Bar",
    icon: "BarChart3",
    category: "marketing",
    description: "Animated progress/skill bars",
    defaults: { items: [{ label: "Design", value: 90 }, { label: "Development", value: 85 }, { label: "Marketing", value: 70 }], color: "", height: 8, showPercent: true },
    settings: [
      { key: "items", label: "Bars", type: "items", tab: "content" },
      { key: "color", label: "Color", type: "color", tab: "style" },
      { key: "height", label: "Bar Height", type: "slider", tab: "style", min: 4, max: 32 },
      { key: "showPercent", label: "Show Percentage", type: "toggle", tab: "content" },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MEDIA WIDGETS
  // ══════════════════════════════════════════════════════════════
  {
    type: "video",
    label: "Video",
    icon: "Play",
    category: "media",
    description: "Embed YouTube, Vimeo, or custom video",
    defaults: { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", aspectRatio: "16:9", autoplay: false, muted: false, controls: true },
    settings: [
      { key: "url", label: "Video URL", type: "url", tab: "content" },
      { key: "aspectRatio", label: "Aspect Ratio", type: "select", tab: "style", options: [{ label: "16:9", value: "16:9" }, { label: "4:3", value: "4:3" }, { label: "1:1", value: "1:1" }, { label: "9:16", value: "9:16" }] },
      { key: "autoplay", label: "Autoplay", type: "toggle", tab: "content" },
      { key: "controls", label: "Show Controls", type: "toggle", tab: "content" },
    ],
  },
  {
    type: "image_carousel",
    label: "Image Carousel",
    icon: "Images",
    category: "media",
    description: "Sliding image carousel",
    defaults: { items: [{ src: "https://placehold.co/800x400/1a1a2e/ffffff?text=Slide+1", alt: "Slide 1" }, { src: "https://placehold.co/800x400/16213e/ffffff?text=Slide+2", alt: "Slide 2" }, { src: "https://placehold.co/800x400/0f3460/ffffff?text=Slide+3", alt: "Slide 3" }], height: 400, autoplay: true, interval: 4000, showDots: true, showArrows: true },
    settings: [
      { key: "items", label: "Slides", type: "items", tab: "content" },
      { key: "height", label: "Height", type: "slider", tab: "style", min: 200, max: 800 },
      { key: "autoplay", label: "Autoplay", type: "toggle", tab: "content" },
      { key: "interval", label: "Interval (ms)", type: "slider", tab: "content", min: 1000, max: 10000, step: 500 },
      { key: "showDots", label: "Show Dots", type: "toggle", tab: "style" },
      { key: "showArrows", label: "Show Arrows", type: "toggle", tab: "style" },
    ],
  },
  {
    type: "image_gallery",
    label: "Image Gallery",
    icon: "LayoutGrid",
    category: "media",
    description: "Grid-based image gallery",
    defaults: { items: [{ src: "https://placehold.co/400x300?text=1", alt: "Image 1" }, { src: "https://placehold.co/400x300?text=2", alt: "Image 2" }, { src: "https://placehold.co/400x300?text=3", alt: "Image 3" }, { src: "https://placehold.co/400x300?text=4", alt: "Image 4" }], columns: 3, gap: 8, borderRadius: 8 },
    settings: [
      { key: "items", label: "Images", type: "items", tab: "content" },
      { key: "columns", label: "Columns", type: "slider", tab: "style", min: 1, max: 6 },
      { key: "gap", label: "Gap", type: "slider", tab: "style", min: 0, max: 32 },
      { key: "borderRadius", label: "Border Radius", type: "slider", tab: "style", min: 0, max: 32 },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // LAYOUT WIDGETS
  // ══════════════════════════════════════════════════════════════
  {
    type: "hero_section",
    label: "Hero Section",
    icon: "Layers",
    category: "layout",
    description: "Full-width hero banner with CTA",
    defaults: { heading: "Build Something Amazing", subheading: "The all-in-one platform for modern teams", ctaText: "Get Started", ctaUrl: "/signup", secondaryCtaText: "Learn More", secondaryCtaUrl: "#", bgImage: "", bgColor: "", align: "center", overlay: true },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "subheading", label: "Subheading", type: "textarea", tab: "content" },
      { key: "ctaText", label: "CTA Text", type: "text", tab: "content" },
      { key: "ctaUrl", label: "CTA URL", type: "url", tab: "content" },
      { key: "secondaryCtaText", label: "Secondary CTA", type: "text", tab: "content" },
      { key: "secondaryCtaUrl", label: "Secondary URL", type: "url", tab: "content" },
      { key: "bgImage", label: "Background Image", type: "url", tab: "style" },
      { key: "bgColor", label: "Background Color", type: "color", tab: "style" },
      { key: "align", label: "Alignment", type: "alignment", tab: "style" },
      { key: "overlay", label: "Dark Overlay", type: "toggle", tab: "style" },
    ],
  },
  {
    type: "columns",
    label: "Columns",
    icon: "Columns",
    category: "layout",
    description: "Multi-column layout",
    defaults: { count: 2, gap: 24, items: [{ content: "Column 1 content" }, { content: "Column 2 content" }] },
    settings: [
      { key: "count", label: "Columns", type: "slider", tab: "content", min: 1, max: 4 },
      { key: "gap", label: "Gap", type: "slider", tab: "style", min: 0, max: 64 },
      { key: "items", label: "Column Content", type: "items", tab: "content" },
    ],
  },
  {
    type: "features_grid",
    label: "Features Grid",
    icon: "Grid3x3",
    category: "layout",
    description: "Grid layout for feature highlights",
    defaults: { heading: "Features", description: "", columns: 3, items: [{ icon: "🚀", title: "Fast", description: "Lightning fast performance" }, { icon: "🔒", title: "Secure", description: "Enterprise-grade security" }, { icon: "📊", title: "Analytics", description: "Deep insights and reports" }] },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "description", label: "Description", type: "textarea", tab: "content" },
      { key: "columns", label: "Columns", type: "slider", tab: "style", min: 1, max: 4 },
      { key: "items", label: "Features", type: "items", tab: "content" },
    ],
  },
  {
    type: "stats_bar",
    label: "Stats Bar",
    icon: "TrendingUp",
    category: "layout",
    description: "Statistics/numbers row",
    defaults: { items: [{ value: "10K+", label: "Users" }, { value: "99.9%", label: "Uptime" }, { value: "50+", label: "Countries" }, { value: "24/7", label: "Support" }], bgColor: "" },
    settings: [
      { key: "items", label: "Stats", type: "items", tab: "content" },
      { key: "bgColor", label: "Background", type: "color", tab: "style" },
    ],
  },
  {
    type: "team",
    label: "Team Members",
    icon: "Users",
    category: "layout",
    description: "Team member cards",
    defaults: { heading: "Our Team", items: [{ name: "John Doe", role: "CEO", avatar: "https://placehold.co/150", bio: "" }], columns: 3 },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "items", label: "Members", type: "items", tab: "content" },
      { key: "columns", label: "Columns", type: "slider", tab: "style", min: 1, max: 4 },
    ],
  },
  {
    type: "timeline",
    label: "Timeline",
    icon: "Clock",
    category: "layout",
    description: "Vertical timeline",
    defaults: { heading: "Our Journey", items: [{ date: "2024", title: "Founded", description: "We started our journey" }, { date: "2025", title: "Growth", description: "Reached 10K users" }] },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "items", label: "Events", type: "items", tab: "content" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "HelpCircle",
    category: "layout",
    description: "Frequently asked questions",
    defaults: { heading: "Frequently Asked Questions", items: [{ question: "What is this?", answer: "A great product that solves your problems." }, { question: "How much does it cost?", answer: "We offer flexible pricing plans for all sizes." }] },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "items", label: "Questions", type: "items", tab: "content" },
    ],
  },
  {
    type: "logo_cloud",
    label: "Logo Cloud",
    icon: "Building2",
    category: "layout",
    description: "Trusted-by logo strip",
    defaults: { heading: "Trusted By", items: [{ name: "Company 1", logo: "" }, { name: "Company 2", logo: "" }, { name: "Company 3", logo: "" }] },
    settings: [
      { key: "heading", label: "Heading", type: "text", tab: "content" },
      { key: "items", label: "Companies", type: "items", tab: "content" },
    ],
  },
];

export const getWidgetDef = (type: string): WidgetDefinition | undefined =>
  WIDGET_REGISTRY.find((w) => w.type === type);

export const getWidgetsByCategory = () => {
  const map: Record<string, WidgetDefinition[]> = {};
  for (const w of WIDGET_REGISTRY) {
    if (!map[w.category]) map[w.category] = [];
    map[w.category].push(w);
  }
  return map;
};

export const CATEGORY_LABELS: Record<string, string> = {
  basic: "Basic",
  content: "Content",
  marketing: "Marketing",
  media: "Media",
  layout: "Layout & Sections",
};
