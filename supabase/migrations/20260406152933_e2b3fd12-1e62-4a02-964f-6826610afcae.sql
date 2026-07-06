ALTER TABLE public.user_roles ALTER COLUMN tenant_id DROP NOT NULL;

INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('d035fe75-ac18-4c55-984e-af0c5881cb52', 'super_admin', NULL)
ON CONFLICT (user_id, role) DO NOTHING;