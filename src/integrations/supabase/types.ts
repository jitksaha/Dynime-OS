export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          abandoned_at: string | null
          cart_data: Json | null
          created_at: string | null
          currency: string | null
          email: string | null
          id: string
          recovered_at: string | null
          recovery_status: string | null
          status: string | null
          tenant_id: string
          total_value: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string | null
          cart_data?: Json | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          recovered_at?: string | null
          recovery_status?: string | null
          status?: string | null
          tenant_id: string
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string | null
          cart_data?: Json | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          recovered_at?: string | null
          recovery_status?: string | null
          status?: string | null
          tenant_id?: string
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      active_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_configs: {
        Row: {
          auto_cta_enabled: boolean
          blacklist_topics: string[] | null
          confidence_threshold: number
          created_at: string
          cta_options: Json | null
          custom_tone_instructions: string | null
          default_mode: string
          fallback_message: string | null
          greeting_template: string | null
          id: string
          max_response_length: number | null
          strict_mode: boolean
          tenant_id: string
          tone: string
          updated_at: string
        }
        Insert: {
          auto_cta_enabled?: boolean
          blacklist_topics?: string[] | null
          confidence_threshold?: number
          created_at?: string
          cta_options?: Json | null
          custom_tone_instructions?: string | null
          default_mode?: string
          fallback_message?: string | null
          greeting_template?: string | null
          id?: string
          max_response_length?: number | null
          strict_mode?: boolean
          tenant_id: string
          tone?: string
          updated_at?: string
        }
        Update: {
          auto_cta_enabled?: boolean
          blacklist_topics?: string[] | null
          confidence_threshold?: number
          created_at?: string
          cta_options?: Json | null
          custom_tone_instructions?: string | null
          default_mode?: string
          fallback_message?: string | null
          greeting_template?: string | null
          id?: string
          max_response_length?: number | null
          strict_mode?: boolean
          tenant_id?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_response_logs: {
        Row: {
          confidence: number | null
          conversation_id: string | null
          created_at: string
          id: string
          input_text: string
          kb_sources: Json | null
          message_id: string | null
          model_used: string | null
          output_text: string
          response_time_ms: number | null
          tenant_id: string
          tokens_used: number | null
          was_approved: boolean | null
          was_escalated: boolean | null
        }
        Insert: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_text: string
          kb_sources?: Json | null
          message_id?: string | null
          model_used?: string | null
          output_text: string
          response_time_ms?: number | null
          tenant_id: string
          tokens_used?: number | null
          was_approved?: boolean | null
          was_escalated?: boolean | null
        }
        Update: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          input_text?: string
          kb_sources?: Json | null
          message_id?: string | null
          model_used?: string | null
          output_text?: string
          response_time_ms?: number | null
          tenant_id?: string
          tokens_used?: number | null
          was_approved?: boolean | null
          was_escalated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_response_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_response_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "social_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_response_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string | null
          id: string
          model: string | null
          status: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          model?: string | null
          status?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string | null
          status?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_error_logs: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          feature: string | null
          http_status: number | null
          id: string
          model: string | null
          provider: string
          raw_response: Json | null
          request_summary: string | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          feature?: string | null
          http_status?: number | null
          id?: string
          model?: string | null
          provider: string
          raw_response?: Json | null
          request_summary?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          feature?: string | null
          http_status?: number | null
          id?: string
          model?: string | null
          provider?: string
          raw_response?: Json | null
          request_summary?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role?: string
          tenant_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_library: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          prompt: string
          tenant_id: string | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          prompt: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          prompt?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          feature: string
          id: string
          model: string | null
          tenant_id: string
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          feature: string
          id?: string
          model?: string | null
          tenant_id: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          feature?: string
          id?: string
          model?: string | null
          tenant_id?: string
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit_per_minute: number
          requests_count: number
          scopes: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit_per_minute?: number
          requests_count?: number
          scopes?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit_per_minute?: number
          requests_count?: number
          scopes?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method: string
          response_time_ms?: number | null
          status_code: number
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          module: string
          name: string
          steps: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          module: string
          name: string
          steps?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string
          name?: string
          steps?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string | null
          attendance_type: string | null
          branch_id: string | null
          check_in: string | null
          check_out: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          created_by: string | null
          date: string
          employee_department: string | null
          employee_id: string | null
          employee_name: string | null
          hours_worked: number | null
          id: string
          notes: string | null
          status: string
          tenant_id: string
          working_hours: number | null
        }
        Insert: {
          attendance_date?: string | null
          attendance_type?: string | null
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          employee_department?: string | null
          employee_id?: string | null
          employee_name?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          working_hours?: number | null
        }
        Update: {
          attendance_date?: string | null
          attendance_type?: string | null
          branch_id?: string | null
          check_in?: string | null
          check_out?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          employee_department?: string | null
          employee_id?: string | null
          employee_name?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          working_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          module: string | null
          resource_id: string | null
          resource_type: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string | null
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          category_id: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time: number | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          branch_id: string | null
          created_at: string
          currency: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_pricing: {
        Row: {
          branch_id: string
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          price: number
          product_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          price: number
          product_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          price?: number
          product_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_pricing_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_pricing_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_stock: {
        Row: {
          branch_id: string
          id: string
          last_counted_at: string | null
          product_id: string
          quantity: number
          reorder_level: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          id?: string
          last_counted_at?: string | null
          product_id: string
          quantity?: number
          reorder_level?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          id?: string
          last_counted_at?: string | null
          product_id?: string
          quantity?: number
          reorder_level?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          branding: Json | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string | null
          id: string
          is_active: boolean
          is_default: boolean
          manager_user_id: string | null
          metadata: Json | null
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branding?: Json | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          manager_user_id?: string | null
          metadata?: Json | null
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branding?: Json | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          manager_user_id?: string | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          allocated_amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          period: string
          spent_amount: number
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allocated_amount?: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          period?: string
          spent_amount?: number
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allocated_amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          period?: string
          spent_amount?: number
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: Json | null
          branch_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_type: string
          google_event_id: string | null
          id: string
          location: string | null
          recurrence_rule: string | null
          start_time: string
          sync_status: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: Json | null
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          start_time: string
          sync_status?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: Json | null
          branch_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          start_time?: string
          sync_status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          branch_id: string | null
          budget: number
          channel: string
          clicked: number
          converted: number
          created_at: string
          created_by: string
          id: string
          name: string
          opened: number
          sent: number
          start_date: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          budget?: number
          channel?: string
          clicked?: number
          converted?: number
          created_at?: string
          created_by: string
          id?: string
          name: string
          opened?: number
          sent?: number
          start_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          budget?: number
          channel?: string
          clicked?: number
          converted?: number
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          opened?: number
          sent?: number
          start_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_logs: {
        Row: {
          action: string
          cart_id: string
          channel: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          cart_id: string
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          cart_id?: string
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_recovery_logs_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "abandoned_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_recovery_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_recovery_offers: {
        Row: {
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          expires_after_hours: number | null
          id: string
          is_active: boolean | null
          min_cart_value: number | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_after_hours?: number | null
          id?: string
          is_active?: boolean | null
          min_cart_value?: number | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_after_hours?: number | null
          id?: string
          is_active?: boolean | null
          min_cart_value?: number | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_recovery_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cdn_configurations: {
        Row: {
          config: Json | null
          created_at: string | null
          domain: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string | null
          role: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          message_type: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          message_type?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          branch_id: string | null
          content: string | null
          created_at: string
          id: string
          recipient: string
          sent_by: string | null
          status: string
          subject: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          recipient: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          branch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          recipient?: string
          sent_by?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body: string
          branch_id: string | null
          created_at: string
          id: string
          name: string
          subject: string | null
          tenant_id: string
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body: string
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          subject?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_assets: {
        Row: {
          asset_tag: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          branch_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          asset_tag?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          asset_tag?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean
          name: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          name: string
          tenant_id: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          name?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_holidays_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_invite_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "company_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      company_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checklists: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          items: Json | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          items?: Json | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          items?: Json | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          branch_id: string | null
          client_name: string | null
          contract_number: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string | null
          file_url: string | null
          id: string
          signed_at: string | null
          start_date: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          branch_id?: string | null
          client_name?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          file_url?: string | null
          id?: string
          signed_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          branch_id?: string | null
          client_name?: string | null
          contract_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string | null
          file_url?: string | null
          id?: string
          signed_at?: string | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      country_addon_prices: {
        Row: {
          addon_id: string | null
          country_code: string
          created_at: string | null
          currency: string
          id: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          addon_id?: string | null
          country_code: string
          created_at?: string | null
          currency?: string
          id?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Update: {
          addon_id?: string | null
          country_code?: string
          created_at?: string | null
          currency?: string
          id?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_addon_prices_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "module_addons"
            referencedColumns: ["id"]
          },
        ]
      }
      country_payment_methods: {
        Row: {
          config: Json | null
          country_code: string
          created_at: string | null
          display_name: string
          gateway_key: string
          id: string
          is_enabled: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          country_code: string
          created_at?: string | null
          display_name: string
          gateway_key: string
          id?: string
          is_enabled?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          country_code?: string
          created_at?: string | null
          display_name?: string
          gateway_key?: string
          id?: string
          is_enabled?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      country_plan_prices: {
        Row: {
          country_code: string
          created_at: string | null
          currency: string
          id: string
          plan_id: string | null
          price_monthly: number
          price_quarterly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          currency?: string
          id?: string
          plan_id?: string | null
          price_monthly?: number
          price_quarterly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          currency?: string
          id?: string
          plan_id?: string | null
          price_monthly?: number
          price_quarterly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      custom_code_snippets: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          pages: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          pages?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          pages?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_widget_configs: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_visible: boolean
          position: number
          tenant_id: string
          updated_at: string
          user_id: string
          widget_key: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          tenant_id: string
          updated_at?: string
          user_id: string
          widget_key: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widget_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          branch_id: string | null
          contact_name: string | null
          created_at: string
          created_by: string
          days_in_stage: number
          id: string
          name: string
          next_follow_up: string | null
          stage: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          branch_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by: string
          days_in_stage?: number
          id?: string
          name: string
          next_follow_up?: string | null
          stage?: string
          tenant_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          branch_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string
          days_in_stage?: number
          id?: string
          name?: string
          next_follow_up?: string | null
          stage?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          branch_id: string | null
          created_at: string | null
          distance_km: number | null
          driver_name: string | null
          estimated_time_min: number | null
          id: string
          name: string
          scheduled_date: string | null
          status: string | null
          stops: Json | null
          tenant_id: string
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_name?: string | null
          estimated_time_min?: number | null
          id?: string
          name: string
          scheduled_date?: string | null
          status?: string | null
          stops?: Json | null
          tenant_id: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          distance_km?: number | null
          driver_name?: string | null
          estimated_time_min?: number | null
          id?: string
          name?: string
          scheduled_date?: string | null
          status?: string | null
          stops?: Json | null
          tenant_id?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string | null
          employee_count: number
          head_name: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          employee_count?: number
          head_name?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string | null
          employee_count?: number
          head_name?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          document_type: string
          employee_id: string | null
          employee_name: string
          id: string
          notes: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          document_type: string
          employee_id?: string | null
          employee_name: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          document_type?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          file_size: string | null
          file_url: string | null
          id: string
          status: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          status?: string
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          name: string
          preview_text: string | null
          subject_line: string | null
          tenant_id: string
          updated_at: string
          used_in_campaigns: number
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          preview_text?: string | null
          subject_line?: string | null
          tenant_id: string
          updated_at?: string
          used_in_campaigns?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          preview_text?: string | null
          subject_line?: string | null
          tenant_id?: string
          updated_at?: string
          used_in_campaigns?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_expense_claims: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          employee_id: string | null
          employee_name: string
          id: string
          receipt_url: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          employee_name: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          employee_id?: string | null
          employee_name?: string
          id?: string
          receipt_url?: string | null
          status?: string | null
          submitted_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_expense_claims_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_expense_claims_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_expense_claims_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_loans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string
          employee_id: string | null
          employee_name: string
          end_date: string | null
          id: string
          interest_rate: number
          loan_type: string
          monthly_installment: number
          notes: string | null
          principal_amount: number
          remaining_balance: number
          start_date: string
          status: string
          tenant_id: string
          total_paid: number
          total_repayable: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          loan_type?: string
          monthly_installment?: number
          notes?: string | null
          principal_amount?: number
          remaining_balance?: number
          start_date?: string
          status?: string
          tenant_id: string
          total_paid?: number
          total_repayable?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          loan_type?: string
          monthly_installment?: number
          notes?: string | null
          principal_amount?: number
          remaining_balance?: number
          start_date?: string
          status?: string
          tenant_id?: string
          total_paid?: number
          total_repayable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_loans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_loans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_surveys: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          is_anonymous: boolean | null
          questions: Json | null
          response_count: number | null
          start_date: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          questions?: Json | null
          response_count?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          questions?: Json | null
          response_count?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_surveys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_verification_requests: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_name: string
          id: string
          request_type: string
          requested_by_company: string | null
          requested_by_email: string | null
          responded_at: string | null
          response_data: Json | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_name: string
          id?: string
          request_type?: string
          requested_by_company?: string | null
          requested_by_email?: string | null
          responded_at?: string | null
          response_data?: Json | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          request_type?: string
          requested_by_company?: string | null
          requested_by_email?: string | null
          responded_at?: string | null
          response_data?: Json | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_verification_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_verification_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warnings: {
        Row: {
          acknowledged_at: string | null
          branch_id: string | null
          created_at: string
          description: string | null
          employee_id: string | null
          employee_name: string
          expires_at: string | null
          id: string
          issued_by: string | null
          issued_by_name: string | null
          reason: string
          severity: string
          status: string
          tenant_id: string
          updated_at: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          branch_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employee_name: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          issued_by_name?: string | null
          reason: string
          severity?: string
          status?: string
          tenant_id: string
          updated_at?: string
          warning_type?: string
        }
        Update: {
          acknowledged_at?: string | null
          branch_id?: string | null
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employee_name?: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          issued_by_name?: string | null
          reason?: string
          severity?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          created_by: string
          department: string | null
          email: string
          full_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          phone: string | null
          salary: number | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          department?: string | null
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          salary?: number | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          department?: string | null
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          salary?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_queue: {
        Row: {
          assigned_to: string | null
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          priority: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number | null
          tenant_id: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number | null
          tenant_id: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number | null
          tenant_id?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_cache: {
        Row: {
          base_currency: string
          fetched_at: string | null
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string | null
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string | null
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          employee_name: string | null
          expense_date: string
          has_receipt: boolean
          id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          employee_name?: string | null
          expense_date?: string
          has_receipt?: boolean
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          employee_name?: string | null
          expense_date?: string
          has_receipt?: boolean
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_bookings: {
        Row: {
          attendees: number | null
          booked_by: string | null
          booked_by_name: string | null
          branch_id: string | null
          created_at: string | null
          end_time: string
          facility_name: string
          id: string
          purpose: string | null
          start_time: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attendees?: number | null
          booked_by?: string | null
          booked_by_name?: string | null
          branch_id?: string | null
          created_at?: string | null
          end_time: string
          facility_name: string
          id?: string
          purpose?: string | null
          start_time: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attendees?: number | null
          booked_by?: string | null
          booked_by_name?: string | null
          branch_id?: string | null
          created_at?: string | null
          end_time?: string
          facility_name?: string
          id?: string
          purpose?: string | null
          start_time?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facility_bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      free_plan_limits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          limit_key: string
          limit_value: number
          module_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          limit_key: string
          limit_value?: number
          module_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          limit_key?: string
          limit_value?: number
          module_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      gateway_health_logs: {
        Row: {
          checked_at: string | null
          error_message: string | null
          gateway_key: string
          id: string
          response_time_ms: number | null
          status: string | null
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          gateway_key: string
          id?: string
          response_time_ms?: number | null
          status?: string | null
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          gateway_key?: string
          id?: string
          response_time_ms?: number | null
          status?: string | null
        }
        Relationships: []
      }
      gdpr_export_requests: {
        Row: {
          completed_at: string | null
          export_url: string | null
          id: string
          requested_at: string | null
          status: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          export_url?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_export_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          reported_by: string | null
          reported_by_name: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reported_by?: string | null
          reported_by_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_apps: {
        Row: {
          category: string | null
          config_schema: Json | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          branch_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          quantity: number | null
          reorder_level: number | null
          sku: string | null
          status: string | null
          tenant_id: string
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          tenant_id: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          quantity?: number | null
          reorder_level?: number | null
          sku?: string | null
          status?: string | null
          tenant_id?: string
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          branch_id: string | null
          client: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          items_count: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          client: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          items_count?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          client?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          items_count?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_restrictions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          ip_address: string
          is_allowed: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          ip_address: string
          is_allowed?: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string
          is_allowed?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_restrictions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_whitelist: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          label: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          label?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          label?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_whitelist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          resume_url: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          applicants: number
          benefits: string | null
          created_at: string
          department: string | null
          description: string | null
          employment_type: string
          experience_level: string | null
          id: string
          location: string | null
          posted_date: string | null
          requirements: string | null
          salary_range: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          applicants?: number
          benefits?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          employment_type?: string
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          applicants?: number
          benefits?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          employment_type?: string
          experience_level?: string | null
          id?: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_range?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          doc_type: string
          embedded_at: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          embedded_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          embedded_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_embeddings: {
        Row: {
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          tenant_id: string
        }
        Insert: {
          chunk_index?: number
          chunk_text: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          tenant_id: string
        }
        Update: {
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_embeddings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          created_at: string | null
          current_value: number | null
          id: string
          metric_type: string | null
          objective_id: string
          status: string | null
          target_value: number | null
          tenant_id: string
          title: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_type?: string | null
          objective_id: string
          status?: string | null
          target_value?: number | null
          tenant_id: string
          title: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_type?: string | null
          objective_id?: string
          status?: string | null
          target_value?: number | null
          tenant_id?: string
          title?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_public: boolean | null
          slug: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_public?: boolean | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_public?: boolean | null
          slug?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          document_back_url: string | null
          document_front_url: string | null
          document_number: string
          document_type: string
          full_name: string
          id: string
          nationality: string | null
          phone_number: string | null
          postal_code: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          submitted_at: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_back_url?: string | null
          document_front_url?: string | null
          document_number: string
          document_type?: string
          full_name: string
          id?: string
          nationality?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_back_url?: string | null
          document_front_url?: string | null
          document_number?: string
          document_type?: string
          full_name?: string
          id?: string
          nationality?: string | null
          phone_number?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      late_records: {
        Row: {
          actual_time: string
          branch_id: string | null
          created_at: string
          date: string
          employee_id: string | null
          employee_name: string
          excused: boolean
          id: string
          minutes_late: number
          reason: string | null
          scheduled_time: string
          tenant_id: string
        }
        Insert: {
          actual_time: string
          branch_id?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          employee_name: string
          excused?: boolean
          id?: string
          minutes_late?: number
          reason?: string | null
          scheduled_time: string
          tenant_id: string
        }
        Update: {
          actual_time?: string
          branch_id?: string | null
          created_at?: string
          date?: string
          employee_id?: string | null
          employee_name?: string
          excused?: boolean
          id?: string
          minutes_late?: number
          reason?: string | null
          scheduled_time?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "late_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_follow_ups: {
        Row: {
          branch_id: string | null
          completed: boolean
          created_at: string
          created_by: string
          deal_id: string
          follow_up_date: string | null
          id: string
          note: string | null
          notes: string | null
          scheduled_at: string
          status: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          completed?: boolean
          created_at?: string
          created_by: string
          deal_id: string
          follow_up_date?: string | null
          id?: string
          note?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string | null
          tenant_id: string
          type?: string
        }
        Update: {
          branch_id?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string
          deal_id?: string
          follow_up_date?: string | null
          id?: string
          note?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_follow_ups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_follow_ups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          branch_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          leave_type: string
          remaining_days: number | null
          tenant_id: string
          total_days: number | null
          updated_at: string | null
          used_days: number | null
          year: number | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          leave_type: string
          remaining_days?: number | null
          tenant_id: string
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year?: number | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          leave_type?: string
          remaining_days?: number | null
          tenant_id?: string
          total_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          branch_id: string | null
          created_at: string
          days: number
          employee_id: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          days?: number
          employee_id?: string | null
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          days?: number
          employee_id?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_conversations: {
        Row: {
          assigned_to: string | null
          channel: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          updated_at: string | null
          visitor_email: string | null
          visitor_name: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          message_type: string | null
          sender_id: string | null
          sender_type: string
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type?: string
          tenant_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string | null
          sender_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "live_chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          location: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          lifetime_earned: number | null
          tenant_id: string
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_earned?: number | null
          tenant_id: string
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          lifetime_earned?: number | null
          tenant_id?: string
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          tenant_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          tenant_id: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          tenant_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          priority: string | null
          reported_by: string | null
          reported_by_name: string | null
          resolved_at: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          reported_by?: string | null
          reported_by_name?: string | null
          resolved_at?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          priority?: string | null
          reported_by?: string | null
          reported_by_name?: string | null
          resolved_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_pages: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mobile_app_configs: {
        Row: {
          android_url: string | null
          app_name: string
          created_at: string
          features: Json
          force_update: boolean
          id: string
          ios_url: string | null
          maintenance_message: string | null
          maintenance_mode: boolean
          min_version: string
          package_name: string
          theme: Json
          updated_at: string
          version: string
        }
        Insert: {
          android_url?: string | null
          app_name?: string
          created_at?: string
          features?: Json
          force_update?: boolean
          id?: string
          ios_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          min_version?: string
          package_name?: string
          theme?: Json
          updated_at?: string
          version?: string
        }
        Update: {
          android_url?: string | null
          app_name?: string
          created_at?: string
          features?: Json
          force_update?: boolean
          id?: string
          ios_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          min_version?: string
          package_name?: string
          theme?: Json
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      module_addons: {
        Row: {
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          is_active: boolean
          key: string
          module_name: string | null
          name: string
          price_monthly: number
          price_onetime: number
          price_quarterly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          key: string
          module_name?: string | null
          name: string
          price_monthly?: number
          price_onetime?: number
          price_quarterly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          key?: string
          module_name?: string | null
          name?: string
          price_monthly?: number
          price_onetime?: number
          price_quarterly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_event_types: {
        Row: {
          available_variables: string[] | null
          category: string
          created_at: string
          default_email_body: string | null
          default_email_subject: string | null
          default_sms_template: string | null
          description: string | null
          event_key: string
          event_label: string
          id: string
          is_system: boolean
        }
        Insert: {
          available_variables?: string[] | null
          category?: string
          created_at?: string
          default_email_body?: string | null
          default_email_subject?: string | null
          default_sms_template?: string | null
          description?: string | null
          event_key: string
          event_label: string
          id?: string
          is_system?: boolean
        }
        Update: {
          available_variables?: string[] | null
          category?: string
          created_at?: string
          default_email_body?: string | null
          default_email_subject?: string | null
          default_sms_template?: string | null
          description?: string | null
          event_key?: string
          event_label?: string
          id?: string
          is_system?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          group_key: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          module: string | null
          priority: string | null
          read: boolean | null
          snoozed_until: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_key?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          module?: string | null
          priority?: string | null
          read?: boolean | null
          snoozed_until?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_key?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          module?: string | null
          priority?: string | null
          read?: boolean | null
          snoozed_until?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          owner_id: string | null
          owner_name: string | null
          parent_id: string | null
          progress: number | null
          start_date: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          owner_id?: string | null
          owner_name?: string | null
          parent_id?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objectives_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_letter_templates: {
        Row: {
          created_at: string
          id: string
          last_updated_by: string | null
          template_body: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          template_body?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_by?: string | null
          template_body?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_letter_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_seo: {
        Row: {
          canonical_url: string | null
          created_at: string
          id: string
          meta_description: string | null
          meta_image: string | null
          meta_keywords: string | null
          meta_title: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_name: string
          robots: string | null
          route_path: string
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_image?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name: string
          robots?: string | null
          route_path: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          meta_image?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name?: string
          robots?: string | null
          route_path?: string
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          category: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          services: Json | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          services?: Json | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          services?: Json | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          category: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          name: string
          services: Json | null
          short_description: string | null
          slug: string
          social_links: Json | null
          sort_order: number | null
          tags: string[] | null
          tenant_id: string | null
          tier: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name: string
          services?: Json | null
          short_description?: string | null
          slug: string
          social_links?: Json | null
          sort_order?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          tier?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          name?: string
          services?: Json | null
          short_description?: string | null
          slug?: string
          social_links?: Json | null
          sort_order?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          tier?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_configs: {
        Row: {
          created_at: string
          credentials: Json
          description: string | null
          display_name: string
          gateway_key: string
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          last_tested_at: string | null
          settings: Json
          test_result: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          description?: string | null
          display_name: string
          gateway_key: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_tested_at?: string | null
          settings?: Json
          test_result?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          description?: string | null
          display_name?: string
          gateway_key?: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_tested_at?: string | null
          settings?: Json
          test_result?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          invoice_id: string | null
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          invoice_id: string | null
          method: string
          payment_date: string
          reference: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_id?: string | null
          method?: string
          payment_date?: string
          reference?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_id?: string | null
          method?: string
          payment_date?: string
          reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          details: Json | null
          id: string
          method: string
          status: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          details?: Json | null
          id?: string
          method?: string
          status?: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          details?: Json | null
          id?: string
          method?: string
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number
          basic_salary: number
          branch_id: string | null
          created_at: string
          deductions: number
          employee_id: string | null
          id: string
          net_salary: number
          payment_date: string | null
          period: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          branch_id?: string | null
          created_at?: string
          deductions?: number
          employee_id?: string | null
          id?: string
          net_salary?: number
          payment_date?: string | null
          period: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowances?: number
          basic_salary?: number
          branch_id?: string | null
          created_at?: string
          deductions?: number
          employee_id?: string | null
          id?: string
          net_salary?: number
          payment_date?: string | null
          period?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          created_at: string
          id: string
          overtime_rate: number
          pay_day: number
          pay_frequency: string
          provident_fund_rate: number
          tax_enabled: boolean
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          overtime_rate?: number
          pay_day?: number
          pay_frequency?: string
          provident_fund_rate?: number
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          overtime_rate?: number
          pay_day?: number
          pay_frequency?: string
          provident_fund_rate?: number
          tax_enabled?: boolean
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_courier_configs: {
        Row: {
          courier_key: string
          created_at: string
          created_by: string
          credentials: Json
          display_name: string
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          last_tested_at: string | null
          settings: Json
          tenant_id: string
          test_result: string | null
          updated_at: string
        }
        Insert: {
          courier_key: string
          created_at?: string
          created_by: string
          credentials?: Json
          display_name: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_tested_at?: string | null
          settings?: Json
          tenant_id: string
          test_result?: string | null
          updated_at?: string
        }
        Update: {
          courier_key?: string
          created_at?: string
          created_by?: string
          credentials?: Json
          display_name?: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          last_tested_at?: string | null
          settings?: Json
          tenant_id?: string
          test_result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdm_courier_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_order_items: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          tenant_id: string
          total: number
          unit_price: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          tenant_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          tenant_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdm_order_items_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pdm_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pdm_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_orders: {
        Row: {
          branch_id: string | null
          cod_amount: number
          courier_consignment_id: string | null
          courier_name: string | null
          courier_status: string | null
          courier_tracking_id: string | null
          created_at: string
          created_by: string
          customer_address: string
          customer_area: string | null
          customer_city: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_zone: string | null
          delivery_charge: number
          discount: number
          id: string
          notes: string | null
          order_number: string
          order_status: string
          payment_status: string
          subtotal: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          cod_amount?: number
          courier_consignment_id?: string | null
          courier_name?: string | null
          courier_status?: string | null
          courier_tracking_id?: string | null
          created_at?: string
          created_by: string
          customer_address: string
          customer_area?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_zone?: string | null
          delivery_charge?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number: string
          order_status?: string
          payment_status?: string
          subtotal?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          cod_amount?: number
          courier_consignment_id?: string | null
          courier_name?: string | null
          courier_status?: string | null
          courier_tracking_id?: string | null
          created_at?: string
          created_by?: string
          customer_address?: string
          customer_area?: string | null
          customer_city?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_zone?: string | null
          delivery_charge?: number
          discount?: number
          id?: string
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_status?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdm_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_products: {
        Row: {
          branch_id: string | null
          category: string | null
          cost_price: number | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          tenant_id: string
          unit: string | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          branch_id?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id: string
          unit?: string | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          branch_id?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tenant_id?: string
          unit?: string | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pdm_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_store_integrations: {
        Row: {
          created_at: string
          created_by: string
          credentials: Json
          id: string
          is_enabled: boolean
          last_synced_at: string | null
          platform: string
          store_name: string
          store_url: string
          sync_categories: boolean
          sync_customers: boolean
          sync_error: string | null
          sync_orders: boolean
          sync_products: boolean
          sync_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          credentials?: Json
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          platform: string
          store_name: string
          store_url: string
          sync_categories?: boolean
          sync_customers?: boolean
          sync_error?: string | null
          sync_orders?: boolean
          sync_products?: boolean
          sync_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          credentials?: Json
          id?: string
          is_enabled?: boolean
          last_synced_at?: string | null
          platform?: string
          store_name?: string
          store_url?: string
          sync_categories?: boolean
          sync_customers?: boolean
          sync_error?: string | null
          sync_orders?: boolean
          sync_products?: boolean
          sync_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdm_store_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pdm_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          direction: string
          error_details: Json | null
          id: string
          integration_id: string
          items_failed: number
          items_synced: number
          started_at: string
          status: string
          sync_type: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          error_details?: Json | null
          id?: string
          integration_id: string
          items_failed?: number
          items_synced?: number
          started_at?: string
          status?: string
          sync_type?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          error_details?: Json | null
          id?: string
          integration_id?: string
          items_failed?: number
          items_synced?: number
          started_at?: string
          status?: string
          sync_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdm_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "pdm_store_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdm_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          branch_id: string | null
          created_at: string
          employee_id: string | null
          goals: string | null
          id: string
          improvements: string | null
          period: string
          rating: number | null
          reviewer_name: string | null
          status: string
          strengths: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          employee_id?: string | null
          goals?: string | null
          id?: string
          improvements?: string | null
          period: string
          rating?: number | null
          reviewer_name?: string | null
          status?: string
          strengths?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          employee_id?: string | null
          goals?: string | null
          id?: string
          improvements?: string | null
          period?: string
          rating?: number | null
          reviewer_name?: string | null
          status?: string
          strengths?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      platform_modules: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          label: string
          name: string
          route: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          label: string
          name: string
          route?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          label?: string
          name?: string
          route?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_payment_methods: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          display_name: string
          gateway: string
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          gateway: string
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          gateway?: string
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      pos_configurations: {
        Row: {
          branch_id: string | null
          config: Json | null
          created_at: string | null
          currency: string | null
          id: string
          receipt_footer: string | null
          receipt_header: string | null
          tax_rate: number | null
          tenant_id: string
          terminal_name: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          config?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          receipt_footer?: string | null
          receipt_header?: string | null
          tax_rate?: number | null
          tenant_id: string
          terminal_name?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          config?: Json | null
          created_at?: string | null
          currency?: string | null
          id?: string
          receipt_footer?: string | null
          receipt_header?: string | null
          tax_rate?: number | null
          tenant_id?: string
          terminal_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_configurations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_branch_id: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          is_owner: boolean
          job_title: string | null
          onboarding_completed: boolean
          phone: string | null
          phone_verified: boolean | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_branch_id?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          is_owner?: boolean
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_branch_id?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          is_owner?: boolean
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verified?: boolean | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_branch_id_fkey"
            columns: ["active_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activities: {
        Row: {
          action: string
          branch_id: string | null
          created_at: string | null
          description: string | null
          id: string
          project_id: string
          tenant_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id: string
          tenant_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          project_id?: string
          tenant_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_crm_links: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          project_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          project_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_crm_links_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crm_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_crm_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          branch_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          sort_order: number | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          sort_order?: number | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          sort_order?: number | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          branch_id: string | null
          completed_tasks: number
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          id: string
          name: string
          progress: number
          status: string
          team_size: number
          tenant_id: string
          total_tasks: number
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          completed_tasks?: number
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          progress?: number
          status?: string
          team_size?: number
          tenant_id: string
          total_tasks?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          completed_tasks?: number
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          progress?: number
          status?: string
          team_size?: number
          tenant_id?: string
          total_tasks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_date: string | null
          id: string
          items: Json | null
          notes: string | null
          order_date: string | null
          po_number: string
          status: string | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number: string
          status?: string | null
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_date?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_date?: string | null
          po_number?: string
          status?: string | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          amount: number
          branch_id: string | null
          client: string
          created_at: string
          created_by: string
          frequency: string
          id: string
          items: Json | null
          last_generated_at: string | null
          next_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          client: string
          created_at?: string
          created_by: string
          frequency?: string
          id?: string
          items?: Json | null
          last_generated_at?: string | null
          next_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          client?: string
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          items?: Json | null
          last_generated_at?: string | null
          next_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payment_logs: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          gateway_key: string
          gateway_response: Json | null
          id: string
          schedule_id: string | null
          status: string
          tenant_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          gateway_key: string
          gateway_response?: Json | null
          id?: string
          schedule_id?: string | null
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          gateway_key?: string
          gateway_response?: Json | null
          id?: string
          schedule_id?: string | null
          status?: string
          tenant_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payment_schedules: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          failure_count: number | null
          gateway_key: string
          id: string
          interval_type: string
          last_charged_at: string | null
          max_retries: number | null
          next_charge_at: string
          saved_method_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          failure_count?: number | null
          gateway_key: string
          id?: string
          interval_type?: string
          last_charged_at?: string | null
          max_retries?: number | null
          next_charge_at: string
          saved_method_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          failure_count?: number | null
          gateway_key?: string
          id?: string
          interval_type?: string
          last_charged_at?: string | null
          max_retries?: number | null
          next_charge_at?: string
          saved_method_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payment_schedules_saved_method_id_fkey"
            columns: ["saved_method_id"]
            isOneToOne: false
            referencedRelation: "saved_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payment_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          commission_percentage: number | null
          commission_type: string
          created_at: string
          id: string
          is_active: boolean | null
          tenant_id: string
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          commission_percentage?: number | null
          commission_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_percentage?: number | null
          commission_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          earning_type: string
          id: string
          referral_id: string
          referrer_user_id: string
          source_payment_id: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          earning_type?: string
          id?: string
          referral_id: string
          referrer_user_id: string
          source_payment_id?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          earning_type?: string
          id?: string
          referral_id?: string
          referrer_user_id?: string
          source_payment_id?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_earnings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          commission_type: string
          cookie_duration_days: number
          created_at: string
          default_commission_percentage: number
          id: string
          is_enabled: boolean
          max_referrals_per_user: number | null
          min_payout_amount: number
          require_subscription: boolean
          terms_and_conditions: string | null
          updated_at: string
        }
        Insert: {
          commission_type?: string
          cookie_duration_days?: number
          created_at?: string
          default_commission_percentage?: number
          id?: string
          is_enabled?: boolean
          max_referrals_per_user?: number | null
          min_payout_amount?: number
          require_subscription?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Update: {
          commission_type?: string
          cookie_duration_days?: number
          created_at?: string
          default_commission_percentage?: number
          id?: string
          is_enabled?: boolean
          max_referrals_per_user?: number | null
          min_payout_amount?: number
          require_subscription?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          referral_code_id: string
          referred_rewarded: boolean | null
          referred_tenant_id: string | null
          referred_user_id: string
          referrer_rewarded: boolean | null
          referrer_user_id: string
          reward_amount: number | null
          reward_type: string | null
          rewarded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          referral_code_id: string
          referred_rewarded?: boolean | null
          referred_tenant_id?: string | null
          referred_user_id: string
          referrer_rewarded?: boolean | null
          referrer_user_id: string
          reward_amount?: number | null
          reward_type?: string | null
          rewarded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_rewarded?: boolean | null
          referred_tenant_id?: string | null
          referred_user_id?: string
          referrer_rewarded?: boolean | null
          referrer_user_id?: string
          reward_amount?: number | null
          reward_type?: string | null
          rewarded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_tenant_id_fkey"
            columns: ["referred_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          created_at: string
          created_by: string
          frequency: string
          id: string
          last_generated: string | null
          name: string
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          frequency?: string
          id?: string
          last_generated?: string | null
          name: string
          status?: string
          tenant_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          frequency?: string
          id?: string
          last_generated?: string | null
          name?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_register: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          impact: string | null
          likelihood: string | null
          mitigation: string | null
          owner_name: string | null
          risk_score: number | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation?: string | null
          owner_name?: string | null
          risk_score?: number | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          likelihood?: string | null
          mitigation?: string | null
          owner_name?: string | null
          risk_score?: number | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_register_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          is_allowed: boolean
          module_key: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_allowed?: boolean
          module_key: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_allowed?: boolean
          module_key?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_increments: {
        Row: {
          approved_by: string | null
          branch_id: string | null
          created_at: string
          current_salary: number
          effective_date: string
          employee_id: string | null
          employee_name: string
          id: string
          increment_percentage: number
          new_salary: number
          reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          current_salary?: number
          effective_date: string
          employee_id?: string | null
          employee_name: string
          id?: string
          increment_percentage?: number
          new_salary?: number
          reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string
          current_salary?: number
          effective_date?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          increment_percentage?: number
          new_salary?: number
          reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_increments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_increments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_increments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_payment_methods: {
        Row: {
          card_brand: string | null
          card_last4: string | null
          created_at: string
          display_name: string
          gateway_key: string
          id: string
          is_active: boolean
          is_default: boolean
          method_label: string
          method_token: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          display_name?: string
          gateway_key: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method_label?: string
          method_token?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string
          display_name?: string
          gateway_key?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method_label?: string
          method_token?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_run_at: string | null
          recipients: string[]
          report_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_run_at?: string | null
          recipients?: string[]
          report_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_run_at?: string | null
          recipients?: string[]
          report_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      searchable_tables: {
        Row: {
          created_at: string
          display_name: string
          icon_name: string
          id: string
          is_active: boolean
          is_tenant_scoped: boolean
          route_template: string | null
          search_columns: string[] | null
          sort_order: number
          subtitle_columns: string[] | null
          table_name: string
          title_column: string
        }
        Insert: {
          created_at?: string
          display_name: string
          icon_name?: string
          id?: string
          is_active?: boolean
          is_tenant_scoped?: boolean
          route_template?: string | null
          search_columns?: string[] | null
          sort_order?: number
          subtitle_columns?: string[] | null
          table_name: string
          title_column: string
        }
        Update: {
          created_at?: string
          display_name?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          is_tenant_scoped?: boolean
          route_template?: string | null
          search_columns?: string[] | null
          sort_order?: number
          subtitle_columns?: string[] | null
          table_name?: string
          title_column?: string
        }
        Relationships: []
      }
      section_access_rules: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          role: string
          section_key: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          role: string
          section_key: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          role?: string
          section_key?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_access_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          employee_id: string | null
          employee_name: string
          end_date: string | null
          id: string
          is_active: boolean
          shift_type_id: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          employee_id?: string | null
          employee_name: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          shift_type_id: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          employee_id?: string | null
          employee_name?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          shift_type_id?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_types: {
        Row: {
          color: string | null
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sidebar_menu_configs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          menu_items: Json | null
          portal_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_items?: Json | null
          portal_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_items?: Json | null
          portal_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sms_balance_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          tenant_id: string
          type?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_balance_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_gateway_configs: {
        Row: {
          api_url: string
          config_fields: Json | null
          created_at: string
          credentials: Json
          display_name: string
          gateway_key: string
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          supported_countries: string[] | null
          updated_at: string
        }
        Insert: {
          api_url?: string
          config_fields?: Json | null
          created_at?: string
          credentials?: Json
          display_name: string
          gateway_key: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          supported_countries?: string[] | null
          updated_at?: string
        }
        Update: {
          api_url?: string
          config_fields?: Json | null
          created_at?: string
          credentials?: Json
          display_name?: string
          gateway_key?: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          supported_countries?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          branch_id: string | null
          created_at: string
          event_key: string | null
          gateway_key: string
          gateway_response: Json | null
          id: string
          message: string
          recipient_phone: string
          sent_by: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          event_key?: string | null
          gateway_key: string
          gateway_response?: Json | null
          id?: string
          message: string
          recipient_phone: string
          sent_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          event_key?: string | null
          gateway_key?: string
          gateway_response?: Json | null
          id?: string
          message?: string
          recipient_phone?: string
          sent_by?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_pricing: {
        Row: {
          country_code: string
          country_name: string | null
          created_at: string | null
          currency: string | null
          gateway_key: string | null
          id: string
          is_active: boolean | null
          price_per_sms: number
          updated_at: string | null
        }
        Insert: {
          country_code: string
          country_name?: string | null
          created_at?: string | null
          currency?: string | null
          gateway_key?: string | null
          id?: string
          is_active?: boolean | null
          price_per_sms?: number
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          country_name?: string | null
          created_at?: string | null
          currency?: string | null
          gateway_key?: string | null
          id?: string
          is_active?: boolean | null
          price_per_sms?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_analytics_events: {
        Row: {
          channel_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          data: Json | null
          event_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          channel_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          channel_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_analytics_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_analytics_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "social_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_analytics_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channel_credentials: {
        Row: {
          access_token: string | null
          access_token_secret: string | null
          api_key: string | null
          api_secret: string | null
          app_id: string | null
          app_secret: string | null
          bearer_token: string | null
          business_account_id: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean
          last_verified_at: string | null
          metadata: Json | null
          page_access_token: string | null
          page_id: string | null
          phone_number_id: string | null
          platform: string
          tenant_id: string
          updated_at: string
          verification_error: string | null
          verification_status: string | null
          verify_token: string | null
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          access_token_secret?: string | null
          api_key?: string | null
          api_secret?: string | null
          app_id?: string | null
          app_secret?: string | null
          bearer_token?: string | null
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          phone_number_id?: string | null
          platform: string
          tenant_id: string
          updated_at?: string
          verification_error?: string | null
          verification_status?: string | null
          verify_token?: string | null
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          access_token_secret?: string | null
          api_key?: string | null
          api_secret?: string | null
          app_id?: string | null
          app_secret?: string | null
          bearer_token?: string | null
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          metadata?: Json | null
          page_access_token?: string | null
          page_id?: string | null
          phone_number_id?: string | null
          platform?: string
          tenant_id?: string
          updated_at?: string
          verification_error?: string | null
          verification_status?: string | null
          verify_token?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_channel_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channels: {
        Row: {
          channel_config: Json | null
          channel_name: string
          connected_at: string | null
          created_at: string
          id: string
          is_active: boolean
          platform: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel_config?: Json | null
          channel_name: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel_config?: Json | null
          channel_name?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_message_at: string | null
          lead_score: string | null
          metadata: Json | null
          phone: string | null
          platform: string
          platform_user_id: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_message_at?: string | null
          lead_score?: string | null
          metadata?: Json | null
          phone?: string | null
          platform: string
          platform_user_id?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_message_at?: string | null
          lead_score?: string | null
          metadata?: Json | null
          phone?: string | null
          platform?: string
          platform_user_id?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_conversations: {
        Row: {
          ai_mode: string
          assigned_to: string | null
          channel_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          message_count: number | null
          metadata: Json | null
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_mode?: string
          assigned_to?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number | null
          metadata?: Json | null
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_mode?: string
          assigned_to?: string | null
          channel_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          message_count?: number | null
          metadata?: Json | null
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "social_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_linked_accounts: {
        Row: {
          id: string
          linked_at: string | null
          provider_email: string | null
          provider_key: string
          provider_user_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string | null
          provider_email?: string | null
          provider_key: string
          provider_user_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          linked_at?: string | null
          provider_email?: string | null
          provider_key?: string
          provider_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      social_messages: {
        Row: {
          ai_confidence: number | null
          ai_draft: string | null
          ai_sources: Json | null
          approved_by: string | null
          content: string
          conversation_id: string
          created_at: string
          cta_type: string | null
          id: string
          is_approved: boolean | null
          message_type: string | null
          metadata: Json | null
          platform_message_id: string | null
          sender_id: string | null
          sender_type: string
          tenant_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_draft?: string | null
          ai_sources?: Json | null
          approved_by?: string | null
          content: string
          conversation_id: string
          created_at?: string
          cta_type?: string | null
          id?: string
          is_approved?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          platform_message_id?: string | null
          sender_id?: string | null
          sender_type: string
          tenant_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_draft?: string | null
          ai_sources?: Json | null
          approved_by?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          cta_type?: string | null
          id?: string
          is_approved?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          platform_message_id?: string | null
          sender_id?: string | null
          sender_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      social_signin_providers: {
        Row: {
          config: Json | null
          created_at: string | null
          icon: string | null
          id: string
          is_enabled: boolean | null
          provider_key: string
          provider_name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          provider_key: string
          provider_name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_enabled?: boolean | null
          provider_key?: string
          provider_name?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_account_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          assigned_name: string | null
          assigned_to: string | null
          branch_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_name?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_name?: string | null
          assigned_to?: string | null
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_tasks_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          from_branch_id: string
          id: string
          notes: string | null
          reference: string | null
          requested_by: string | null
          status: string
          tenant_id: string
          to_branch_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          from_branch_id: string
          id?: string
          notes?: string | null
          reference?: string | null
          requested_by?: string | null
          status?: string
          tenant_id: string
          to_branch_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          from_branch_id?: string
          id?: string
          notes?: string | null
          reference?: string | null
          requested_by?: string | null
          status?: string
          tenant_id?: string
          to_branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          limit_reset_cycle: string
          max_companies: number
          max_deals: number
          max_documents: number
          max_employees: number
          max_invoices: number
          max_projects: number
          max_users: number
          modules: Json | null
          name: string
          price_lifetime: number
          price_monthly: number
          price_quarterly: number | null
          price_yearly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limit_reset_cycle?: string
          max_companies?: number
          max_deals?: number
          max_documents?: number
          max_employees?: number
          max_invoices?: number
          max_projects?: number
          max_users?: number
          modules?: Json | null
          name: string
          price_lifetime?: number
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          limit_reset_cycle?: string
          max_companies?: number
          max_deals?: number
          max_documents?: number
          max_employees?: number
          max_invoices?: number
          max_projects?: number
          max_users?: number
          modules?: Json | null
          name?: string
          price_lifetime?: number
          price_monthly?: number
          price_quarterly?: number | null
          price_yearly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          answers: Json | null
          id: string
          respondent_id: string | null
          submitted_at: string | null
          survey_id: string
          tenant_id: string
        }
        Insert: {
          answers?: Json | null
          id?: string
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id: string
          tenant_id: string
        }
        Update: {
          answers?: Json | null
          id?: string
          respondent_id?: string | null
          submitted_at?: string | null
          survey_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "employee_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string | null
          subtotal: number
          tax_amount: number | null
          tax_profile_id: string | null
          tax_rate: number | null
          tenant_id: string
          total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_profile_id?: string | null
          tax_rate?: number | null
          tenant_id: string
          total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_profile_id?: string | null
          tax_rate?: number | null
          tenant_id?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_tax_profile_id_fkey"
            columns: ["tax_profile_id"]
            isOneToOne: false
            referencedRelation: "tax_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_calculations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_compliance_records: {
        Row: {
          created_at: string | null
          due_date: string | null
          filed_at: string | null
          id: string
          jurisdiction: string | null
          notes: string | null
          period: string
          status: string | null
          tenant_id: string
          total_tax_collected: number | null
          total_tax_remitted: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          filed_at?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          period: string
          status?: string | null
          tenant_id: string
          total_tax_collected?: number | null
          total_tax_remitted?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          filed_at?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          period?: string
          status?: string | null
          tenant_id?: string
          total_tax_collected?: number | null
          total_tax_remitted?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_compliance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_profiles: {
        Row: {
          created_at: string
          filing_frequency: string | null
          fiscal_year_start: number | null
          id: string
          tax_id: string | null
          tax_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filing_frequency?: string | null
          fiscal_year_start?: number | null
          id?: string
          tax_id?: string | null
          tax_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filing_frequency?: string | null
          fiscal_year_start?: number | null
          id?: string
          tax_id?: string | null
          tax_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_rates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          rate: number
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          rate: number
          tenant_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          rate?: number
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_addon_modules: {
        Row: {
          activated_at: string | null
          addon_id: string
          amount: number
          billing_cycle: string | null
          id: string
          module_name: string | null
          payment_type: string | null
          requested_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          activated_at?: string | null
          addon_id: string
          amount?: number
          billing_cycle?: string | null
          id?: string
          module_name?: string | null
          payment_type?: string | null
          requested_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          activated_at?: string | null
          addon_id?: string
          amount?: number
          billing_cycle?: string | null
          id?: string
          module_name?: string | null
          payment_type?: string | null
          requested_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_addon_modules_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "module_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_addon_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_app_connections: {
        Row: {
          app_key: string
          app_name: string
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          id: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          app_key: string
          app_name: string
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          app_key?: string
          app_name?: string
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          id?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_app_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_branding: {
        Row: {
          accent_color: string | null
          company_name: string | null
          created_at: string
          custom_css: string | null
          email_footer_html: string | null
          email_header_html: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          tagline: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string
          custom_css?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          company_name?: string | null
          created_at?: string
          custom_css?: string | null
          email_footer_html?: string | null
          email_header_html?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          integration_key: string
          is_enabled: boolean
          last_tested_at: string | null
          tenant_id: string
          test_result: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          integration_key: string
          is_enabled?: boolean
          last_tested_at?: string | null
          tenant_id: string
          test_result?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          integration_key?: string
          is_enabled?: boolean
          last_tested_at?: string | null
          tenant_id?: string
          test_result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_modules: {
        Row: {
          id: string
          is_enabled: boolean
          module_key: string
          module_name: string | null
          tenant_id: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          module_key: string
          module_name?: string | null
          tenant_id: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          module_key?: string
          module_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notification_preferences: {
        Row: {
          created_at: string
          custom_email_body: string | null
          custom_email_subject: string | null
          custom_sms_template: string | null
          email_enabled: boolean
          event_key: string
          id: string
          recipient_type: string
          sms_enabled: boolean
          sms_gateway_key: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_email_body?: string | null
          custom_email_subject?: string | null
          custom_sms_template?: string | null
          email_enabled?: boolean
          event_key: string
          id?: string
          recipient_type?: string
          sms_enabled?: boolean
          sms_gateway_key?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_email_body?: string | null
          custom_email_subject?: string | null
          custom_sms_template?: string | null
          email_enabled?: boolean
          event_key?: string
          id?: string
          recipient_type?: string
          sms_enabled?: boolean
          sms_gateway_key?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_methods: {
        Row: {
          config: Json | null
          created_at: string
          gateway: string
          id: string
          is_enabled: boolean | null
          method_name: string
          tenant_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          gateway: string
          id?: string
          is_enabled?: boolean | null
          method_name: string
          tenant_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          gateway?: string
          id?: string
          is_enabled?: boolean | null
          method_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_balances: {
        Row: {
          balance: number | null
          currency: string | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          currency?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          currency?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sms_gateway_configs: {
        Row: {
          config: Json | null
          created_at: string | null
          gateway_key: string
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          gateway_key: string
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          gateway_key?: string
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sms_gateway_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          gateway_subscription_id: string | null
          id: string
          payment_gateway: string | null
          payment_method: string | null
          plan_id: string | null
          scheduled_plan_id: string | null
          status: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          gateway_subscription_id?: string | null
          id?: string
          payment_gateway?: string | null
          payment_method?: string | null
          plan_id?: string | null
          scheduled_plan_id?: string | null
          status?: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          gateway_subscription_id?: string | null
          id?: string
          payment_gateway?: string | null
          payment_method?: string | null
          plan_id?: string | null
          scheduled_plan_id?: string | null
          status?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage_counters: {
        Row: {
          billing_cycle: string | null
          counter_key: string
          created_at: string | null
          current_count: number | null
          cycle_end: string | null
          cycle_start: string | null
          id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          counter_key: string
          created_at?: string | null
          current_count?: number | null
          cycle_end?: string | null
          cycle_start?: string | null
          id?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          counter_key?: string
          created_at?: string | null
          current_count?: number | null
          cycle_end?: string | null
          cycle_start?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          currency_symbol: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          plan: string
          size: string | null
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan?: string
          size?: string | null
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan?: string
          size?: string | null
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          branch_id: string | null
          created_at: string
          created_by: string
          customer: string
          description: string | null
          id: string
          priority: string
          status: string
          subject: string
          tenant_id: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          branch_id?: string | null
          created_at?: string
          created_by: string
          customer: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject: string
          tenant_id: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string
          customer?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          subject?: string
          tenant_id?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_activity_logs: {
        Row: {
          activity_type: string
          app_name: string | null
          duration_seconds: number | null
          id: string
          logged_at: string | null
          session_id: string | null
          tenant_id: string
          url: string | null
          window_title: string | null
        }
        Insert: {
          activity_type: string
          app_name?: string | null
          duration_seconds?: number | null
          id?: string
          logged_at?: string | null
          session_id?: string | null
          tenant_id: string
          url?: string | null
          window_title?: string | null
        }
        Update: {
          activity_type?: string
          app_name?: string | null
          duration_seconds?: number | null
          id?: string
          logged_at?: string | null
          session_id?: string | null
          tenant_id?: string
          url?: string | null
          window_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_activity_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_config: {
        Row: {
          blur_screenshots: boolean | null
          config: Json | null
          created_at: string | null
          id: string
          idle_timeout: number | null
          screenshot_interval: number | null
          tenant_id: string
          track_apps: boolean | null
          track_urls: boolean | null
          updated_at: string | null
        }
        Insert: {
          blur_screenshots?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          idle_timeout?: number | null
          screenshot_interval?: number | null
          tenant_id: string
          track_apps?: boolean | null
          track_urls?: boolean | null
          updated_at?: string | null
        }
        Update: {
          blur_screenshots?: boolean | null
          config?: Json | null
          created_at?: string | null
          id?: string
          idle_timeout?: number | null
          screenshot_interval?: number | null
          tenant_id?: string
          track_apps?: boolean | null
          track_urls?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_projects: {
        Row: {
          budget_hours: number | null
          client_name: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          budget_hours?: number | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          budget_hours?: number | null
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_screenshots: {
        Row: {
          active_app: string | null
          active_url: string | null
          activity_level: number | null
          captured_at: string | null
          id: string
          screenshot_url: string | null
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          active_app?: string | null
          active_url?: string | null
          activity_level?: number | null
          captured_at?: string | null
          id?: string
          screenshot_url?: string | null
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          active_app?: string | null
          active_url?: string | null
          activity_level?: number | null
          captured_at?: string | null
          id?: string
          screenshot_url?: string | null
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_screenshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          started_at: string | null
          status: string | null
          task_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tracking_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tracking_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          project_id: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          project_id?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          project_id?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "tracking_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_time_corrections: {
        Row: {
          approved_by: string | null
          corrected_duration: number | null
          created_at: string | null
          id: string
          original_duration: number | null
          reason: string | null
          session_id: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          corrected_duration?: number | null
          created_at?: string | null
          id?: string
          original_duration?: number | null
          reason?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          corrected_duration?: number | null
          created_at?: string | null
          id?: string
          original_duration?: number | null
          reason?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_time_corrections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_time_corrections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: string
          instructor: string | null
          is_mandatory: boolean | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          is_mandatory?: boolean | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          instructor?: string | null
          is_mandatory?: boolean | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          course_id: string
          employee_id: string | null
          employee_name: string | null
          enrolled_at: string | null
          id: string
          progress: number | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          course_id: string
          employee_id?: string | null
          employee_name?: string | null
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          course_id?: string
          employee_id?: string | null
          employee_name?: string | null
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          branch_id: string | null
          certificate_url: string | null
          created_at: string
          employee_id: string | null
          employee_name: string
          end_date: string | null
          id: string
          notes: string | null
          provider: string | null
          score: number | null
          start_date: string | null
          status: string
          tenant_id: string
          training_name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          certificate_url?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name: string
          end_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          score?: number | null
          start_date?: string | null
          status?: string
          tenant_id: string
          training_name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          certificate_url?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          score?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          training_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branches: {
        Row: {
          access_level: string
          branch_id: string | null
          created_at: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          access_level?: string
          branch_id?: string | null
          created_at?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          item_description: string | null
          item_icon: string | null
          item_id: string
          item_label: string | null
          item_path: string | null
          item_type: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_description?: string | null
          item_icon?: string | null
          item_id: string
          item_label?: string | null
          item_path?: string | null
          item_type: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_description?: string | null
          item_icon?: string | null
          item_id?: string
          item_label?: string | null
          item_path?: string | null
          item_type?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string
          department: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passkeys: {
        Row: {
          created_at: string | null
          credential_id: string
          device_name: string | null
          id: string
          last_used: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credential_id: string
          device_name?: string | null
          id?: string
          last_used?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_theme: boolean | null
          compact_mode: boolean | null
          created_at: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          preferences: Json | null
          tenant_id: string | null
          theme: string | null
          theme_mode: string | null
          theme_schedule: Json | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_theme?: boolean | null
          compact_mode?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferences?: Json | null
          tenant_id?: string | null
          theme?: string | null
          theme_mode?: string | null
          theme_schedule?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_theme?: boolean | null
          compact_mode?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          preferences?: Json | null
          tenant_id?: string | null
          theme?: string | null
          theme_mode?: string | null
          theme_schedule?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          last_seen: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_seen?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_seen?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sidebar_preferences: {
        Row: {
          id: string
          item_order: string[]
          sidebar_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_order?: string[]
          sidebar_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_order?: string[]
          sidebar_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          assigned_driver: string | null
          branch_id: string | null
          created_at: string | null
          id: string
          insurance_expiry: string | null
          last_service_date: string | null
          make: string | null
          mileage: number | null
          model: string | null
          next_service_date: string | null
          registration_number: string
          status: string | null
          tenant_id: string
          type: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          next_service_date?: string | null
          registration_number: string
          status?: string | null
          tenant_id: string
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          assigned_driver?: string | null
          branch_id?: string | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          make?: string | null
          mileage?: number | null
          model?: string | null
          next_service_date?: string | null
          registration_number?: string
          status?: string | null
          tenant_id?: string
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          branch_id: string | null
          category: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tax_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_fee_config: {
        Row: {
          fee_percent: number
          flat_fee: number
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          operation: string
          updated_at: string
        }
        Insert: {
          fee_percent?: number
          flat_fee?: number
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          operation: string
          updated_at?: string
        }
        Update: {
          fee_percent?: number
          flat_fee?: number
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          operation?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transfers: {
        Row: {
          amount: number
          created_at: string
          from_wallet_id: string
          id: string
          note: string | null
          status: string
          to_wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_wallet_id: string
          id?: string
          note?: string | null
          status?: string
          to_wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_wallet_id?: string
          id?: string
          note?: string | null
          status?: string
          to_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transfers_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transfers_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          challenge: string
          created_at?: string
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          challenge?: string
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string
          description: string | null
          events: string[]
          id: string
          is_active: boolean
          secret: string | null
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          tenant_id: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          tenant_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_gateway_configs: {
        Row: {
          api_endpoint: string | null
          branch_id: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          api_endpoint?: string | null
          branch_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string | null
          branch_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_gateway_configs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          branch_id: string | null
          content: string | null
          cost: number | null
          error_message: string | null
          gateway_id: string | null
          id: string
          recipient: string
          sent_at: string | null
          status: string | null
          template_name: string | null
          tenant_id: string
        }
        Insert: {
          branch_id?: string | null
          content?: string | null
          cost?: number | null
          error_message?: string | null
          gateway_id?: string | null
          id?: string
          recipient: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          tenant_id: string
        }
        Update: {
          branch_id?: string | null
          content?: string | null
          cost?: number | null
          error_message?: string | null
          gateway_id?: string | null
          id?: string
          recipient?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_gateway_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          branch_id: string | null
          category: string | null
          created_at: string | null
          id: string
          language: string | null
          name: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          branch_id?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          language?: string | null
          name?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string
          id: string
          last_run: string | null
          name: string
          runs: number
          status: string
          tenant_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_run?: string | null
          name: string
          runs?: number
          status?: string
          tenant_id: string
          trigger?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_run?: string | null
          name?: string
          runs?: number
          status?: string
          tenant_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zapier_templates: {
        Row: {
          action_app: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          template_url: string | null
          trigger_app: string | null
        }
        Insert: {
          action_app?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          template_url?: string | null
          trigger_app?: string | null
        }
        Update: {
          action_app?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          template_url?: string | null
          trigger_app?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_sms_credits:
        | {
            Args: { _amount: number; _description?: string; _tenant_id: string }
            Returns: Json
          }
        | {
            Args: {
              _amount?: number
              _count?: number
              _description?: string
              _pricing_id?: string
              _tenant_id: string
            }
            Returns: Json
          }
      check_usage_limit: {
        Args: { _counter_key: string; _tenant_id: string }
        Returns: Json
      }
      complete_onboarding:
        | {
            Args: {
              _company_name: string
              _country?: string
              _currency?: string
              _currency_symbol?: string
              _industry?: string
              _size?: string
              _slug: string
            }
            Returns: string
          }
        | {
            Args: {
              _company_name: string
              _country?: string
              _currency?: string
              _currency_symbol?: string
              _industry?: string
              _plan_slug?: string
              _size?: string
              _slug: string
            }
            Returns: string
          }
      create_additional_company:
        | {
            Args: {
              _company_name: string
              _country?: string
              _currency?: string
              _currency_symbol?: string
              _industry?: string
              _size?: string
              _slug: string
            }
            Returns: string
          }
        | {
            Args: {
              _company_name: string
              _country?: string
              _currency?: string
              _currency_symbol?: string
              _industry?: string
              _plan_slug?: string
              _size?: string
              _slug: string
            }
            Returns: string
          }
      create_public_booking: {
        Args: {
          _attendee_email: string
          _attendee_name: string
          _attendee_phone?: string
          _company_slug: string
          _end_time: string
          _notes?: string
          _service_id: string
          _start_time: string
          _title: string
        }
        Returns: string
      }
      deduct_sms_credit: { Args: { _tenant_id: string }; Returns: boolean }
      ensure_default_branch: { Args: { _tenant_id: string }; Returns: string }
      execute_stock_transfer: { Args: { _transfer_id: string }; Returns: Json }
      get_active_branch_id: { Args: never; Returns: string }
      get_public_booking_services: { Args: { _slug: string }; Returns: Json }
      get_public_job: { Args: { job_id: string }; Returns: Json }
      get_public_jobs_by_slug: { Args: { company_slug: string }; Returns: Json }
      get_table_columns: { Args: { p_table_name: string }; Returns: Json }
      get_table_info: { Args: never; Returns: Json }
      get_user_branch_ids: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: string[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      global_search: {
        Args: { _limit?: number; _query: string; _tenant_id?: string }
        Returns: {
          display_name: string
          icon_name: string
          record_id: string
          route_pattern: string
          similarity: number
          source_table: string
          subtitle: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage_counter: {
        Args: { _counter_key: string; _tenant_id: string }
        Returns: Json
      }
      join_company_with_code: { Args: { _code: string }; Returns: string }
      match_kb_embeddings: {
        Args: {
          _match_count?: number
          _match_threshold?: number
          _query_embedding: string
          _tenant_id: string
        }
        Returns: {
          chunk_text: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_job_application: {
        Args: {
          _cover_letter?: string
          _email: string
          _job_id: string
          _name: string
          _phone?: string
          _resume_url?: string
        }
        Returns: string
      }
      user_has_branch_access: {
        Args: { _branch_id: string; _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_global_branch_access: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "company_admin"
        | "hr_manager"
        | "sales_manager"
        | "marketing_manager"
        | "finance_manager"
        | "support_agent"
        | "employee"
        | "customer"
        | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "company_admin",
        "hr_manager",
        "sales_manager",
        "marketing_manager",
        "finance_manager",
        "support_agent",
        "employee",
        "customer",
        "admin",
      ],
    },
  },
} as const
