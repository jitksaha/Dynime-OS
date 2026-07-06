-- Enable Google and Apple, disable Facebook
UPDATE public.social_signin_providers SET is_enabled = true WHERE provider_key IN ('google', 'apple');
UPDATE public.social_signin_providers SET is_enabled = false WHERE provider_key NOT IN ('google', 'apple');