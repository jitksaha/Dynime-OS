
-- Seed default industry solutions into platform_settings
INSERT INTO public.platform_settings (key, value)
VALUES ('industry_solutions', '[
  {"slug":"healthcare","name":"Healthcare","icon":"Heart","description":"Complete HRMS, compliance & patient management for hospitals and clinics","color":"hsl(0,72%,50%)"},
  {"slug":"education","name":"Education","icon":"GraduationCap","description":"Student management, payroll & academic workflows for schools and universities","color":"hsl(210,80%,55%)"},
  {"slug":"manufacturing","name":"Manufacturing","icon":"Factory","description":"Production tracking, inventory & workforce management for factories","color":"hsl(38,92%,50%)"},
  {"slug":"retail","name":"Retail & E-Commerce","icon":"ShoppingBag","description":"POS integration, CRM & marketing automation for retail businesses","color":"hsl(270,80%,60%)"},
  {"slug":"technology","name":"Technology & SaaS","icon":"Laptop","description":"Agile project management, billing & team collaboration for tech companies","color":"hsl(199,89%,48%)"},
  {"slug":"finance","name":"Finance & Banking","icon":"Landmark","description":"Accounting, compliance & client management for financial institutions","color":"hsl(142,71%,45%)"},
  {"slug":"hospitality","name":"Hospitality","icon":"Hotel","description":"Staff scheduling, guest management & operations for hotels and restaurants","color":"hsl(25,95%,53%)"},
  {"slug":"construction","name":"Construction","icon":"HardHat","description":"Project tracking, resource allocation & safety compliance for builders","color":"hsl(45,93%,47%)"},
  {"slug":"logistics","name":"Logistics & Transport","icon":"Truck","description":"Fleet management, route optimization & workforce tracking","color":"hsl(200,80%,45%)"},
  {"slug":"nonprofit","name":"Non-Profit & NGO","icon":"HandHeart","description":"Donor management, volunteer tracking & grant reporting","color":"hsl(340,75%,55%)"},
  {"slug":"realestate","name":"Real Estate","icon":"Building2","description":"Property management, CRM & document workflows for agencies","color":"hsl(160,60%,45%)"},
  {"slug":"legal","name":"Legal Services","icon":"Scale","description":"Case management, billing & document automation for law firms","color":"hsl(220,70%,50%)"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
