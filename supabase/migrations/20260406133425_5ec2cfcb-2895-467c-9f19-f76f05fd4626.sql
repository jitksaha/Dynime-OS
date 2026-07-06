
-- ============================================================
-- PART 1: TENANT-SCOPED RLS POLICIES
-- ============================================================

CREATE POLICY "tenant_ai_conversations" ON public.ai_conversations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ai_messages" ON public.ai_messages FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "read_ai_prompts" ON public.ai_prompt_library FOR SELECT USING (is_public = true OR tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "insert_ai_prompts" ON public.ai_prompt_library FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "update_ai_prompts" ON public.ai_prompt_library FOR UPDATE USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "delete_ai_prompts" ON public.ai_prompt_library FOR DELETE USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ai_usage" ON public.ai_usage_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_api_keys" ON public.api_keys FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_api_logs" ON public.api_request_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_carts" ON public.abandoned_carts FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_cart_logs" ON public.cart_recovery_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_cart_offers" ON public.cart_recovery_offers FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_chat_ch" ON public.chat_channels FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_chat_mem" ON public.chat_channel_members FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_chat_msg" ON public.chat_messages FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_assets" ON public.company_assets FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_holidays" ON public.company_holidays FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_compliance" ON public.compliance_checklists FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_contracts" ON public.contracts FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_routes" ON public.delivery_routes FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_doc_req" ON public.document_requests FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_expenses" ON public.employee_expense_claims FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_loans" ON public.employee_loans FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_surveys" ON public.employee_surveys FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_emp_verify" ON public.employee_verification_requests FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_warnings" ON public.employee_warnings FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_bookings" ON public.facility_bookings FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_incidents" ON public.incidents FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_inventory" ON public.inventory_items FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_kr" ON public.key_results FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_kb" ON public.knowledge_base_articles FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_kyc" ON public.kyc_verifications FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_late" ON public.late_records FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_leave_bal" ON public.leave_balances FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_livechat" ON public.live_chat_conversations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_livechat_msg" ON public.live_chat_messages FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_loyalty" ON public.loyalty_points FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_loyalty_tx" ON public.loyalty_transactions FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_maint" ON public.maintenance_requests FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_objectives" ON public.objectives FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_offer_tpl" ON public.offer_letter_templates FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_partners" ON public.partners FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_prod" ON public.pdm_products FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_orders" ON public.pdm_orders FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_items" ON public.pdm_order_items FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_stores" ON public.pdm_store_integrations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_courier" ON public.pdm_courier_configs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pdm_sync" ON public.pdm_sync_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_pos" ON public.pos_configurations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_proj_act" ON public.project_activities FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_proj_crm" ON public.project_crm_links FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_proj_ms" ON public.project_milestones FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_proj_tasks" ON public.project_tasks FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_po" ON public.purchase_orders FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_rec_inv" ON public.recurring_invoices FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_rec_pay" ON public.recurring_payment_schedules FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_rec_pay_log" ON public.recurring_payment_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ref_codes" ON public.referral_codes FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_ref_earn" ON public.referral_earnings FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_risk" ON public.risk_register FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_salary" ON public.salary_increments FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sched_rep" ON public.scheduled_reports FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_shifts" ON public.shift_types FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_shift_assign" ON public.shift_assignments FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sms_bal" ON public.sms_balance_transactions FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sms_logs" ON public.sms_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sms_tpl" ON public.sms_templates FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_staff_tasks" ON public.staff_tasks FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_survey_resp" ON public.survey_responses FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_tax_calc" ON public.tax_calculations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_tax_comp" ON public.tax_compliance_records FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_teams" ON public.teams FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_team_mem" ON public.team_members FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_app_conn" ON public.tenant_app_connections FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_branding" ON public.tenant_branding FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_integrations" ON public.tenant_integrations FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_notif_pref" ON public.tenant_notification_preferences FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sms_balance" ON public.tenant_sms_balances FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_sms_gw" ON public.tenant_sms_gateway_configs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_usage" ON public.tenant_usage_counters FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_act" ON public.tracking_activity_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_cfg" ON public.tracking_config FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_proj" ON public.tracking_projects FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_ss" ON public.tracking_screenshots FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_sess" ON public.tracking_sessions FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_tasks" ON public.tracking_tasks FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_track_corr" ON public.tracking_time_corrections FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_training" ON public.training_courses FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_train_enroll" ON public.training_enrollments FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_train_rec" ON public.training_records FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_vehicles" ON public.vehicles FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_vendors" ON public.vendors FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_webhooks" ON public.webhook_configs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_wh_deliv" ON public.webhook_deliveries FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_wa_logs" ON public.whatsapp_logs FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_wa_tpl" ON public.whatsapp_templates FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- ============================================================
-- PART 2: USER-SCOPED RLS POLICIES
-- ============================================================

CREATE POLICY "own_reactions_read" ON public.chat_reactions FOR SELECT USING (true);
CREATE POLICY "own_reactions_insert" ON public.chat_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_reactions_delete" ON public.chat_reactions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "own_gdpr" ON public.gdpr_export_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_favorites" ON public.user_favorites FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_passkeys" ON public.user_passkeys FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_prefs" ON public.user_preferences FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_presence" ON public.user_presence FOR ALL USING (user_id = auth.uid());
CREATE POLICY "read_presence" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "own_social" ON public.social_linked_accounts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_staff_settings" ON public.staff_account_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_saved_pay" ON public.saved_payment_methods FOR ALL USING (user_id = auth.uid());
CREATE POLICY "own_referrals" ON public.referrals FOR ALL USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- ============================================================
-- PART 3: PUBLIC READ + ADMIN MANAGE POLICIES
-- ============================================================

CREATE POLICY "pub_blog_cat" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "admin_blog_cat" ON public.blog_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_blog_posts" ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "admin_blog_posts" ON public.blog_posts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_country_addon" ON public.country_addon_prices FOR SELECT USING (true);
CREATE POLICY "admin_country_addon" ON public.country_addon_prices FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_country_pay" ON public.country_payment_methods FOR SELECT USING (true);
CREATE POLICY "admin_country_pay" ON public.country_payment_methods FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_country_plan" ON public.country_plan_prices FOR SELECT USING (true);
CREATE POLICY "admin_country_plan" ON public.country_plan_prices FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_exchange" ON public.exchange_rate_cache FOR SELECT USING (true);
CREATE POLICY "admin_exchange" ON public.exchange_rate_cache FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_free_limits" ON public.free_plan_limits FOR SELECT USING (true);
CREATE POLICY "admin_free_limits" ON public.free_plan_limits FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_integrations" ON public.integration_apps FOR SELECT USING (true);
CREATE POLICY "admin_integrations" ON public.integration_apps FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_notif_types" ON public.notification_event_types FOR SELECT USING (true);
CREATE POLICY "admin_notif_types" ON public.notification_event_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_page_seo" ON public.page_seo FOR SELECT USING (true);
CREATE POLICY "admin_page_seo" ON public.page_seo FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_platform_mod" ON public.platform_modules FOR SELECT USING (true);
CREATE POLICY "admin_platform_mod" ON public.platform_modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_sidebar" ON public.sidebar_menu_configs FOR SELECT USING (true);
CREATE POLICY "admin_sidebar" ON public.sidebar_menu_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_sms_pricing" ON public.sms_pricing FOR SELECT USING (true);
CREATE POLICY "admin_sms_pricing" ON public.sms_pricing FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_social_prov" ON public.social_signin_providers FOR SELECT USING (true);
CREATE POLICY "admin_social_prov" ON public.social_signin_providers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_sys_email" ON public.system_email_templates FOR SELECT USING (true);
CREATE POLICY "admin_sys_email" ON public.system_email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_wallet_fee" ON public.wallet_fee_config FOR SELECT USING (true);
CREATE POLICY "pub_zapier" ON public.zapier_templates FOR SELECT USING (true);
CREATE POLICY "admin_zapier" ON public.zapier_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PART 4: ADMIN-ONLY POLICIES
-- ============================================================

CREATE POLICY "admin_cdn" ON public.cdn_configurations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_custom_code" ON public.custom_code_snippets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_gw_health" ON public.gateway_health_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_ip_wl" ON public.ip_whitelist FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_section" ON public.section_access_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_sms_gw" ON public.sms_gateway_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_wa_gw" ON public.whatsapp_gateway_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_pay_gw" ON public.payment_gateway_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_ref_settings" ON public.referral_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pub_ref_settings" ON public.referral_settings FOR SELECT USING (true);

-- Mobile app configs (public read, admin manage)
CREATE POLICY "pub_mobile" ON public.mobile_app_configs FOR SELECT USING (true);
CREATE POLICY "admin_mobile" ON public.mobile_app_configs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Partner applications (anyone can apply, admin manages)
CREATE POLICY "pub_partner_apps" ON public.partner_applications FOR SELECT USING (true);
CREATE POLICY "insert_partner_apps" ON public.partner_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_partner_apps" ON public.partner_applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- PART 5: TRIGGERS FOR updated_at
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'ai_conversations','ai_prompt_library','abandoned_carts','api_keys',
    'cart_recovery_offers','cdn_configurations','chat_channels',
    'company_assets','compliance_checklists','contracts','country_addon_prices',
    'country_payment_methods','country_plan_prices','custom_code_snippets',
    'delivery_routes','document_requests','employee_expense_claims',
    'employee_loans','employee_surveys','employee_verification_requests',
    'exchange_rate_cache','facility_bookings','gateway_health_logs',
    'incidents','inventory_items','knowledge_base_articles','kyc_verifications',
    'live_chat_conversations','maintenance_requests','mobile_app_configs',
    'objectives','offer_letter_templates','page_seo','partner_applications',
    'partners','payment_gateway_configs','pdm_products','pdm_orders',
    'pdm_store_integrations','pos_configurations','project_milestones',
    'project_tasks','purchase_orders','recurring_invoices',
    'recurring_payment_schedules','referral_settings','risk_register',
    'salary_increments','scheduled_reports','shift_types','sms_templates',
    'staff_account_settings','tax_compliance_records','tax_profiles',
    'tenant_app_connections','tenant_branding','tenant_integrations',
    'tenant_notification_preferences','tenant_sms_balances',
    'tenant_sms_gateway_configs','tenant_usage_counters','tracking_config',
    'training_courses','user_preferences','vehicles','vendors',
    'webhook_configs','whatsapp_gateway_configs','whatsapp_templates',
    'blog_posts','blog_categories','referrals','saved_payment_methods'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format(
        'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
        replace(tbl, '-', '_'), tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- PART 6: STORAGE BUCKETS & POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pub_avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "upload_avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "update_avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "delete_avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "read_docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "upload_docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "update_docs" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "delete_docs" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "pub_media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "upload_media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
CREATE POLICY "update_media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "delete_media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "read_co_assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
CREATE POLICY "upload_co_assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
CREATE POLICY "update_co_assets" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "delete_co_assets" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "read_chat_files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "upload_chat_files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.role() = 'authenticated');
CREATE POLICY "delete_chat_files" ON storage.objects FOR DELETE USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- PART 7: AUTH TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
