export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  admin: {
    Tables: {
      workspace_credit_logs: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          operation_type: string
          payment_type: string | null
          plan_key: string | null
          reason: string
          subscription_id: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          operation_type: string
          payment_type?: string | null
          plan_key?: string | null
          reason: string
          subscription_id?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          operation_type?: string
          payment_type?: string | null
          plan_key?: string | null
          reason?: string
          subscription_id?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_subscription_logs: {
        Row: {
          amount_yen: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_payment_type: string | null
          new_plan_key: string | null
          old_payment_type: string | null
          old_plan_key: string | null
          operation_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_yen?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_payment_type?: string | null
          new_plan_key?: string | null
          old_payment_type?: string | null
          old_plan_key?: string | null
          operation_type: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_yen?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_payment_type?: string | null
          new_plan_key?: string | null
          old_payment_type?: string | null
          old_plan_key?: string | null
          operation_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_app_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_jobs: {
        Row: {
          app_id: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: number
          next_step: string | null
          process_type: string
          started_at: string | null
          status: string
          step: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: number
          next_step?: string | null
          process_type?: string
          started_at?: string | null
          status: string
          step: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: number
          next_step?: string | null
          process_type?: string
          started_at?: string | null
          status?: string
          step?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_step_process_type_fkey"
            columns: ["step", "process_type"]
            isOneToOne: false
            referencedRelation: "m_steps"
            referencedColumns: ["key", "process_type"]
          },
        ]
      }
      agent_operations: {
        Row: {
          agent_func: string | null
          agent_job_id: number
          app_id: string
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: number
          message: string | null
          operation: string
          result_json: Json | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_func?: string | null
          agent_job_id: number
          app_id: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: number
          message?: string | null
          operation: string
          result_json?: Json | null
          started_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          agent_func?: string | null
          agent_job_id?: number
          app_id?: string
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: number
          message?: string | null
          operation?: string
          result_json?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_operations_agent_job_id_fkey"
            columns: ["agent_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_operations_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usages: {
        Row: {
          agent_key: string
          credit_used: number
          details: Json | null
          id: number
          input_token_count: number | null
          output_token_count: number | null
          request_id: string | null
          total_token_count: number | null
          used_at: string
          user_id: string
        }
        Insert: {
          agent_key: string
          credit_used: number
          details?: Json | null
          id?: number
          input_token_count?: number | null
          output_token_count?: number | null
          request_id?: string | null
          total_token_count?: number | null
          used_at?: string
          user_id: string
        }
        Update: {
          agent_key?: string
          credit_used?: number
          details?: Json | null
          id?: number
          input_token_count?: number | null
          output_token_count?: number | null
          request_id?: string | null
          total_token_count?: number | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_usages_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["key"]
          },
        ]
      }
      agents: {
        Row: {
          agent_level: number
          agent_name: string
          created_at: string | null
          creator: string | null
          credit_per_token: number
          is_active: boolean
          is_premium: boolean
          is_reasoning: boolean
          key: string
          model_name: string
          order_no: number | null
          provider: string
          settings: Json | null
          token_limit_per_day: number | null
          token_limit_per_hour: number | null
        }
        Insert: {
          agent_level: number
          agent_name: string
          created_at?: string | null
          creator?: string | null
          credit_per_token: number
          is_active?: boolean
          is_premium?: boolean
          is_reasoning?: boolean
          key: string
          model_name: string
          order_no?: number | null
          provider: string
          settings?: Json | null
          token_limit_per_day?: number | null
          token_limit_per_hour?: number | null
        }
        Update: {
          agent_level?: number
          agent_name?: string
          created_at?: string | null
          creator?: string | null
          credit_per_token?: number
          is_active?: boolean
          is_premium?: boolean
          is_reasoning?: boolean
          key?: string
          model_name?: string
          order_no?: number | null
          provider?: string
          settings?: Json | null
          token_limit_per_day?: number | null
          token_limit_per_hour?: number | null
        }
        Relationships: []
      }
      app_build_messages: {
        Row: {
          app_id: string
          created_at: string | null
          id: string
          message: string
          type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: string
          message: string
          type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: string
          message?: string
          type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      app_codes: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          creator: string | null
          id: string
          type: string
          version: number | null
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type: string
          version?: number | null
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_codes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_functions: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          creator: string | null
          id: string
          type: string
          version: number | null
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type: string
          version?: number | null
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_functions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_histories: {
        Row: {
          app_id: string | null
          changes: Json
          created_at: string | null
          creator: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          changes: Json
          created_at?: string | null
          creator?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          changes?: Json
          created_at?: string | null
          creator?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_histories_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_schemas: {
        Row: {
          app_id: string
          content: Json
          created_at: string | null
          created_by: string | null
          id: string
          schema_type: string
          updated_at: string | null
          version: number
          version_comment: string | null
          workspace_id: string
        }
        Insert: {
          app_id: string
          content: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          schema_type: string
          updated_at?: string | null
          version?: number
          version_comment?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          schema_type?: string
          updated_at?: string | null
          version?: number
          version_comment?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_schemas_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_schemas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_trial_access_logs: {
        Row: {
          action: string
          app_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          action: string
          app_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          action?: string
          app_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_trial_access_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_access_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "app_trial_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_access_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_trial_sessions: {
        Row: {
          app_id: string
          approval_required: boolean
          created_at: string | null
          created_by: string
          description: string | null
          duration_hours: number
          expires_at: string
          id: string
          max_users: number
          referral_code: string | null
          session_name: string
          status: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          app_id: string
          approval_required?: boolean
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_hours?: number
          expires_at: string
          id?: string
          max_users?: number
          referral_code?: string | null
          session_name: string
          status?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string
          approval_required?: boolean
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_hours?: number
          expires_at?: string
          id?: string
          max_users?: number
          referral_code?: string | null
          session_name?: string
          status?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_trial_sessions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      app_trial_users: {
        Row: {
          app_id: string
          expires_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          session_id: string
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          app_id: string
          expires_at: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id: string
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string
          expires_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_trial_users_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_users_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "app_trial_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_trial_users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          app_name: string
          app_schema: string | null
          completed_steps: Json
          created_at: string | null
          creator: string | null
          current_job_id: number | null
          current_operation_id: number | null
          current_step: string
          description: string | null
          emoji: string | null
          id: string
          initial_request: string | null
          input_files: Json | null
          is_cloneable: boolean
          is_main: boolean
          is_public: boolean
          is_trial_enabled: boolean
          main_app_id: string | null
          process_type: string
          schema_versions: Json
          slug: string | null
          status: string
          trial_settings: Json | null
          updated_at: string | null
          version: number
          version_comment: string | null
          visibility_settings: Json | null
          workspace_id: string
        }
        Insert: {
          app_name: string
          app_schema?: string | null
          completed_steps?: Json
          created_at?: string | null
          creator?: string | null
          current_job_id?: number | null
          current_operation_id?: number | null
          current_step?: string
          description?: string | null
          emoji?: string | null
          id?: string
          initial_request?: string | null
          input_files?: Json | null
          is_cloneable?: boolean
          is_main?: boolean
          is_public?: boolean
          is_trial_enabled?: boolean
          main_app_id?: string | null
          process_type?: string
          schema_versions?: Json
          slug?: string | null
          status: string
          trial_settings?: Json | null
          updated_at?: string | null
          version?: number
          version_comment?: string | null
          visibility_settings?: Json | null
          workspace_id: string
        }
        Update: {
          app_name?: string
          app_schema?: string | null
          completed_steps?: Json
          created_at?: string | null
          creator?: string | null
          current_job_id?: number | null
          current_operation_id?: number | null
          current_step?: string
          description?: string | null
          emoji?: string | null
          id?: string
          initial_request?: string | null
          input_files?: Json | null
          is_cloneable?: boolean
          is_main?: boolean
          is_public?: boolean
          is_trial_enabled?: boolean
          main_app_id?: string | null
          process_type?: string
          schema_versions?: Json
          slug?: string | null
          status?: string
          trial_settings?: Json | null
          updated_at?: string | null
          version?: number
          version_comment?: string | null
          visibility_settings?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_current_job_id_fkey"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_current_operation_id_fkey"
            columns: ["current_operation_id"]
            isOneToOne: false
            referencedRelation: "agent_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_current_step_process_type_fkey"
            columns: ["current_step", "process_type"]
            isOneToOne: false
            referencedRelation: "m_steps"
            referencedColumns: ["key", "process_type"]
          },
          {
            foreignKeyName: "apps_main_app_id_fkey"
            columns: ["main_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_applications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          group_id: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          group_id: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          group_id?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_applications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          like_count: number
          parent_id: string | null
          post_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          like_count?: number
          parent_id?: string | null
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          allow_post_sharing: boolean
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          requires_approval: boolean
          type: string
          updated_at: string
        }
        Insert: {
          allow_post_sharing?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          requires_approval?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          allow_post_sharing?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          requires_approval?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_memberships: {
        Row: {
          created_at: string
          group_id: string
          id: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category_id: string | null
          comment_count: number
          content: string
          created_at: string
          group_id: string | null
          id: string
          is_featured: boolean
          is_pinned: boolean
          like_count: number
          metadata: Json | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string | null
          view_count: number
        }
        Insert: {
          category_id?: string | null
          comment_count?: number
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          like_count?: number
          metadata?: Json | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Update: {
          category_id?: string | null
          comment_count?: number
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          like_count?: number
          metadata?: Json | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "community_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_grants_history: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          grant_type: string
          granted_at: string
          id: string
          reason: string | null
          recipient_id: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          grant_type?: string
          granted_at?: string
          id?: string
          reason?: string | null
          recipient_id: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          grant_type?: string
          granted_at?: string
          id?: string
          reason?: string | null
          recipient_id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: []
      }
      credit_grants_pending: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          grant_type: string
          id: string
          processed_at: string | null
          reason: string | null
          recipient_id: string
          scheduled_for: string
          source_id: string | null
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          grant_type?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          recipient_id: string
          scheduled_for: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          grant_type?: string
          id?: string
          processed_at?: string | null
          reason?: string | null
          recipient_id?: string
          scheduled_for?: string
          source_id?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      flow_engines: {
        Row: {
          agent_key: string | null
          agent_level: number
          created_at: string
          created_by: string | null
          credits_per_token: number | null
          default_config: Json | null
          description: string | null
          engine_key: string
          engine_name: string
          id: string
          input_schema: Json
          is_active: boolean
          is_implemented: boolean
          is_test_only: boolean
          minimum_credits: number
          output_schema: Json
          prompt_variables: Json | null
          required_plan: string
          required_tables: Json | null
          schema_keys: string[] | null
          supported_functions: Json
          system_prompt: string | null
          to_track_token_usage: boolean | null
          translations: Json | null
          type: string
          updated_at: string
          use_ai: boolean
          use_case: string | null
          user_prompt_template: string | null
        }
        Insert: {
          agent_key?: string | null
          agent_level?: number
          created_at?: string
          created_by?: string | null
          credits_per_token?: number | null
          default_config?: Json | null
          description?: string | null
          engine_key: string
          engine_name: string
          id?: string
          input_schema: Json
          is_active?: boolean
          is_implemented?: boolean
          is_test_only?: boolean
          minimum_credits?: number
          output_schema: Json
          prompt_variables?: Json | null
          required_plan: string
          required_tables?: Json | null
          schema_keys?: string[] | null
          supported_functions: Json
          system_prompt?: string | null
          to_track_token_usage?: boolean | null
          translations?: Json | null
          type: string
          updated_at?: string
          use_ai: boolean
          use_case?: string | null
          user_prompt_template?: string | null
        }
        Update: {
          agent_key?: string | null
          agent_level?: number
          created_at?: string
          created_by?: string | null
          credits_per_token?: number | null
          default_config?: Json | null
          description?: string | null
          engine_key?: string
          engine_name?: string
          id?: string
          input_schema?: Json
          is_active?: boolean
          is_implemented?: boolean
          is_test_only?: boolean
          minimum_credits?: number
          output_schema?: Json
          prompt_variables?: Json | null
          required_plan?: string
          required_tables?: Json | null
          schema_keys?: string[] | null
          supported_functions?: Json
          system_prompt?: string | null
          to_track_token_usage?: boolean | null
          translations?: Json | null
          type?: string
          updated_at?: string
          use_ai?: boolean
          use_case?: string | null
          user_prompt_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_engines_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["key"]
          },
        ]
      }
      flow_executions: {
        Row: {
          app_id: string | null
          completed_at: string | null
          completed_nodes: string[] | null
          context_embedding: string | null
          context_summary: string | null
          created_at: string
          created_by: string
          current_node_id: string | null
          error_details: Json | null
          errors: Json | null
          execution_id: string | null
          execution_time_ms: number | null
          flow_id: string
          global_variables: Json | null
          id: string
          input_data: Json | null
          node_outputs: Json | null
          output_data: Json | null
          started_at: string | null
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          completed_at?: string | null
          completed_nodes?: string[] | null
          context_embedding?: string | null
          context_summary?: string | null
          created_at?: string
          created_by: string
          current_node_id?: string | null
          error_details?: Json | null
          errors?: Json | null
          execution_id?: string | null
          execution_time_ms?: number | null
          flow_id: string
          global_variables?: Json | null
          id?: string
          input_data?: Json | null
          node_outputs?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          completed_at?: string | null
          completed_nodes?: string[] | null
          context_embedding?: string | null
          context_summary?: string | null
          created_at?: string
          created_by?: string
          current_node_id?: string | null
          error_details?: Json | null
          errors?: Json | null
          execution_id?: string | null
          execution_time_ms?: number | null
          flow_id?: string
          global_variables?: Json | null
          id?: string
          input_data?: Json | null
          node_outputs?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_node_executions: {
        Row: {
          app_id: string | null
          asset_paths: Json | null
          completed_at: string | null
          context_data: Json | null
          created_at: string
          dependencies: string[] | null
          error_details: Json | null
          estimated_cost: number | null
          execution_level: number | null
          execution_metadata: Json | null
          execution_path: string | null
          execution_time_ms: number | null
          flow_execution_id: string
          function_name: string
          id: string
          input_data: Json | null
          is_parallel: boolean | null
          node_id: string
          output_data: Json | null
          parallel_group_id: string | null
          parent_node_id: string | null
          reference_node_id: string | null
          retry_count: number | null
          started_at: string | null
          status: string
          token_usage: Json | null
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          asset_paths?: Json | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          dependencies?: string[] | null
          error_details?: Json | null
          estimated_cost?: number | null
          execution_level?: number | null
          execution_metadata?: Json | null
          execution_path?: string | null
          execution_time_ms?: number | null
          flow_execution_id: string
          function_name: string
          id?: string
          input_data?: Json | null
          is_parallel?: boolean | null
          node_id: string
          output_data?: Json | null
          parallel_group_id?: string | null
          parent_node_id?: string | null
          reference_node_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          token_usage?: Json | null
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          asset_paths?: Json | null
          completed_at?: string | null
          context_data?: Json | null
          created_at?: string
          dependencies?: string[] | null
          error_details?: Json | null
          estimated_cost?: number | null
          execution_level?: number | null
          execution_metadata?: Json | null
          execution_path?: string | null
          execution_time_ms?: number | null
          flow_execution_id?: string
          function_name?: string
          id?: string
          input_data?: Json | null
          is_parallel?: boolean | null
          node_id?: string
          output_data?: Json | null
          parallel_group_id?: string | null
          parent_node_id?: string | null
          reference_node_id?: string | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          token_usage?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_node_executions_flow_execution_id_fkey"
            columns: ["flow_execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_node_executions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_schema_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          is_active: boolean | null
          is_default: boolean
          is_official: boolean | null
          name: string
          optional_extensions: Json | null
          required_relations: Json | null
          schema_key: string
          schema_structure: Json
          tags: string[] | null
          updated_at: string
          version: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          is_active?: boolean | null
          is_default?: boolean
          is_official?: boolean | null
          name: string
          optional_extensions?: Json | null
          required_relations?: Json | null
          schema_key: string
          schema_structure: Json
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          is_active?: boolean | null
          is_default?: boolean
          is_official?: boolean | null
          name?: string
          optional_extensions?: Json | null
          required_relations?: Json | null
          schema_key?: string
          schema_structure?: Json
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      flow_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          flow_definition: Json | null
          flow_input_schema: Json | null
          flow_output_schema: Json | null
          id: string
          is_active: boolean | null
          is_official: boolean | null
          is_premium: boolean | null
          is_test_only: boolean
          name: string
          parameter_limits: Json | null
          preview_image_url: string | null
          tags: string[] | null
          template_key: string
          translations: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          flow_definition?: Json | null
          flow_input_schema?: Json | null
          flow_output_schema?: Json | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          is_premium?: boolean | null
          is_test_only?: boolean
          name: string
          parameter_limits?: Json | null
          preview_image_url?: string | null
          tags?: string[] | null
          template_key: string
          translations?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          flow_definition?: Json | null
          flow_input_schema?: Json | null
          flow_output_schema?: Json | null
          id?: string
          is_active?: boolean | null
          is_official?: boolean | null
          is_premium?: boolean | null
          is_test_only?: boolean
          name?: string
          parameter_limits?: Json | null
          preview_image_url?: string | null
          tags?: string[] | null
          template_key?: string
          translations?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      flows: {
        Row: {
          app_id: string
          created_at: string
          created_by: string
          description: string | null
          flow_definition: Json | null
          flow_input_schema: Json | null
          flow_output_schema: Json | null
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          parameter_limits: Json | null
          status: string
          template_id: string | null
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          created_by: string
          description?: string | null
          flow_definition?: Json | null
          flow_input_schema?: Json | null
          flow_output_schema?: Json | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          parameter_limits?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          flow_definition?: Json | null
          flow_input_schema?: Json | null
          flow_output_schema?: Json | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          parameter_limits?: Json | null
          status?: string
          template_id?: string | null
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "flow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      m_coupons: {
        Row: {
          coupon_code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          start_date: string
          stripe_coupon_id: string
          stripe_coupon_id_test: string | null
          stripe_coupon_id_yearly: string | null
          stripe_coupon_id_yearly_test: string | null
          target_plan_key: string
          updated_at: string | null
        }
        Insert: {
          coupon_code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description: string
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          start_date: string
          stripe_coupon_id: string
          stripe_coupon_id_test?: string | null
          stripe_coupon_id_yearly?: string | null
          stripe_coupon_id_yearly_test?: string | null
          target_plan_key: string
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          start_date?: string
          stripe_coupon_id?: string
          stripe_coupon_id_test?: string | null
          stripe_coupon_id_yearly?: string | null
          stripe_coupon_id_yearly_test?: string | null
          target_plan_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "m_coupons_target_plan_key_fkey"
            columns: ["target_plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      m_plans: {
        Row: {
          app_limit: number
          billing_interval: string | null
          created_at: string | null
          creator: string | null
          currency: string | null
          daily_credits: number
          description: string | null
          features: Json | null
          initial_credits: number
          is_active: boolean | null
          key: string
          monthly_credits: number
          monthly_price_yen: number
          name: string
          payment_type: string
          sort_order: number | null
          stripe_price_id_monthly_prod: string | null
          stripe_price_id_monthly_test: string | null
          stripe_price_id_yearly_prod: string | null
          stripe_price_id_yearly_test: string | null
          trial_days: number | null
          yearly_credits_bonus_rate: number | null
          yearly_discount_rate: number | null
          yearly_price_yen: number | null
        }
        Insert: {
          app_limit: number
          billing_interval?: string | null
          created_at?: string | null
          creator?: string | null
          currency?: string | null
          daily_credits: number
          description?: string | null
          features?: Json | null
          initial_credits?: number
          is_active?: boolean | null
          key: string
          monthly_credits: number
          monthly_price_yen: number
          name: string
          payment_type?: string
          sort_order?: number | null
          stripe_price_id_monthly_prod?: string | null
          stripe_price_id_monthly_test?: string | null
          stripe_price_id_yearly_prod?: string | null
          stripe_price_id_yearly_test?: string | null
          trial_days?: number | null
          yearly_credits_bonus_rate?: number | null
          yearly_discount_rate?: number | null
          yearly_price_yen?: number | null
        }
        Update: {
          app_limit?: number
          billing_interval?: string | null
          created_at?: string | null
          creator?: string | null
          currency?: string | null
          daily_credits?: number
          description?: string | null
          features?: Json | null
          initial_credits?: number
          is_active?: boolean | null
          key?: string
          monthly_credits?: number
          monthly_price_yen?: number
          name?: string
          payment_type?: string
          sort_order?: number | null
          stripe_price_id_monthly_prod?: string | null
          stripe_price_id_monthly_test?: string | null
          stripe_price_id_yearly_prod?: string | null
          stripe_price_id_yearly_test?: string | null
          trial_days?: number | null
          yearly_credits_bonus_rate?: number | null
          yearly_discount_rate?: number | null
          yearly_price_yen?: number | null
        }
        Relationships: []
      }
      m_steps: {
        Row: {
          action_prompt_nouse: string | null
          description: string | null
          key: string
          next_step: string | null
          order_no: number
          parent_step: string | null
          process_type: string
          step_name: string
          system_action: string
          user_action: boolean
        }
        Insert: {
          action_prompt_nouse?: string | null
          description?: string | null
          key: string
          next_step?: string | null
          order_no: number
          parent_step?: string | null
          process_type?: string
          step_name: string
          system_action: string
          user_action?: boolean
        }
        Update: {
          action_prompt_nouse?: string | null
          description?: string | null
          key?: string
          next_step?: string | null
          order_no?: number
          parent_step?: string | null
          process_type?: string
          step_name?: string
          system_action?: string
          user_action?: boolean
        }
        Relationships: []
      }
      m_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      plan_coupons: {
        Row: {
          coupon_code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          plan_key: string
          priority: number
          updated_at: string | null
        }
        Insert: {
          coupon_code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          plan_key: string
          priority?: number
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          plan_key?: string
          priority?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_coupons_coupon_code_fkey"
            columns: ["coupon_code"]
            isOneToOne: false
            referencedRelation: "m_coupons"
            referencedColumns: ["coupon_code"]
          },
          {
            foreignKeyName: "plan_coupons_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      plugin_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          domain_models: string[] | null
          id: string
          is_active: boolean | null
          name: string
          plugin_key: string
          schema_json: Json | null
          sort_order: number | null
          spec_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          domain_models?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          plugin_key: string
          schema_json?: Json | null
          sort_order?: number | null
          spec_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          domain_models?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          plugin_key?: string
          schema_json?: Json | null
          sort_order?: number | null
          spec_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      post_files: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_path: string
          file_size: number
          filename: string
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          post_id: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_path: string
          file_size: number
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          post_id?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          post_id?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_files_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string | null
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "m_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          category: string
          content: string
          cover_image_prompt: string | null
          cover_image_url: string | null
          created_at: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          published_at: string | null
          slug: string
          status: string | null
          summary: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          market_rate_max_yen: number | null
          market_rate_min_yen: number | null
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          market_rate_max_yen?: number | null
          market_rate_min_yen?: number | null
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          market_rate_max_yen?: number | null
          market_rate_min_yen?: number | null
          name?: string
        }
        Relationships: []
      }
      stripe_webhook_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          is_completed: boolean
          plan_key: string | null
          session_id: string
          stripe_event_id: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          is_completed?: boolean
          plan_key?: string | null
          session_id: string
          stripe_event_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          is_completed?: boolean
          plan_key?: string | null
          session_id?: string
          stripe_event_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notifications: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          message: string
          notification_type: string
          start_date: string
          target_page: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          message: string
          notification_type?: string
          start_date: string
          target_page?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          message?: string
          notification_type?: string
          start_date?: string
          target_page?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tickets: {
        Row: {
          app_id: string | null
          assigned_to: string | null
          attachments: Json | null
          category: string
          closed_at: string | null
          company: string | null
          content: string
          created_at: string | null
          description: string
          email: string | null
          id: string
          internal_notes: string | null
          name: string | null
          phone: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          app_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category: string
          closed_at?: string | null
          company?: string | null
          content: string
          created_at?: string | null
          description: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          name?: string | null
          phone?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          app_id?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category?: string
          closed_at?: string | null
          company?: string | null
          content?: string
          created_at?: string | null
          description?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          name?: string | null
          phone?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_histories: {
        Row: {
          amount: number
          created_at: string | null
          creator: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credit: number
          deprecated_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit: number
          deprecated_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit?: number
          deprecated_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_payments: {
        Row: {
          amount_yen: number
          created_at: string | null
          creator: string | null
          id: string
          payment_intent_id: string
          payment_method: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount_yen: number
          created_at?: string | null
          creator?: string | null
          id?: string
          payment_intent_id: string
          payment_method: string
          status: string
          user_id?: string | null
        }
        Update: {
          amount_yen?: number
          created_at?: string | null
          creator?: string | null
          id?: string
          payment_intent_id?: string
          payment_method?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          app_limit: number
          created_at: string
          credit_limit: number
          deprecated_at: string | null
          id: string
          plan_key: string
          team_member_limit: number
          updated_at: string
        }
        Insert: {
          app_limit?: number
          created_at?: string
          credit_limit?: number
          deprecated_at?: string | null
          id: string
          plan_key?: string
          team_member_limit?: number
          updated_at?: string
        }
        Update: {
          app_limit?: number
          created_at?: string
          credit_limit?: number
          deprecated_at?: string | null
          id?: string
          plan_key?: string
          team_member_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cookie_consent: Json
          created_at: string | null
          display_name: string
          id: string
          lang_code: string | null
          last_sign_in_at: string | null
          sns_links: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cookie_consent?: Json
          created_at?: string | null
          display_name: string
          id: string
          lang_code?: string | null
          last_sign_in_at?: string | null
          sns_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cookie_consent?: Json
          created_at?: string | null
          display_name?: string
          id?: string
          lang_code?: string | null
          last_sign_in_at?: string | null
          sns_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          amount_yen: number
          created_at: string | null
          creator: string | null
          credit_amount: number
          id: string
          user_id: string | null
        }
        Insert: {
          amount_yen: number
          created_at?: string | null
          creator?: string | null
          credit_amount: number
          id?: string
          user_id?: string | null
        }
        Update: {
          amount_yen?: number
          created_at?: string | null
          creator?: string | null
          credit_amount?: number
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          email: string
          id: string
          is_app_admin: boolean
          is_developer: boolean
          language: string
          main_workspace_id: string | null
          notifications: Json
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_app_admin?: boolean
          is_developer?: boolean
          language?: string
          main_workspace_id?: string | null
          notifications?: Json
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_app_admin?: boolean
          is_developer?: boolean
          language?: string
          main_workspace_id?: string | null
          notifications?: Json
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_main_workspace_id_fkey"
            columns: ["main_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscription_histories: {
        Row: {
          changes: Json
          created_at: string | null
          creator: string | null
          id: string
          subscription_id: string | null
        }
        Insert: {
          changes: Json
          created_at?: string | null
          creator?: string | null
          id?: string
          subscription_id?: string | null
        }
        Update: {
          changes?: Json
          created_at?: string | null
          creator?: string | null
          id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscription_histories_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          coupon_code: string | null
          created_at: string | null
          creator: string | null
          current_period_end: string | null
          current_period_start: string | null
          deprecated_at: string | null
          id: string
          payment_type: string
          plan_key: string | null
          status: string
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          coupon_code?: string | null
          created_at?: string | null
          creator?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          deprecated_at?: string | null
          id?: string
          payment_type?: string
          plan_key?: string | null
          status: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          coupon_code?: string | null
          created_at?: string | null
          creator?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          deprecated_at?: string | null
          id?: string
          payment_type?: string
          plan_key?: string | null
          status?: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          created_at: string | null
          creator: string | null
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          creator?: string | null
          id?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          creator?: string | null
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          converted_at: string | null
          created_at: string
          email: string
          id: string
          is_converted: boolean | null
          metadata: Json | null
          notified_at: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          is_converted?: boolean | null
          metadata?: Json | null
          notified_at?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_converted?: boolean | null
          metadata?: Json | null
          notified_at?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workspace_credit_grants: {
        Row: {
          amount: number
          description: string | null
          expires_at: string | null
          grant_type: string
          granted_at: string
          id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          description?: string | null
          expires_at?: string | null
          grant_type: string
          granted_at?: string
          id?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          description?: string | null
          expires_at?: string | null
          grant_type?: string
          granted_at?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credit_grants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credit_purchases: {
        Row: {
          amount_yen: number
          completed_at: string | null
          created_at: string
          credits_amount: number
          id: string
          payment_intent_id: string | null
          purchased_by: string
          status: string
          stripe_payment_id: string | null
          workspace_id: string
        }
        Insert: {
          amount_yen: number
          completed_at?: string | null
          created_at?: string
          credits_amount: number
          id?: string
          payment_intent_id?: string | null
          purchased_by: string
          status?: string
          stripe_payment_id?: string | null
          workspace_id: string
        }
        Update: {
          amount_yen?: number
          completed_at?: string | null
          created_at?: string
          credits_amount?: number
          id?: string
          payment_intent_id?: string | null
          purchased_by?: string
          status?: string
          stripe_payment_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credit_purchases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credit_usages: {
        Row: {
          amount: number
          description: string | null
          grant_id: string
          id: string
          used_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          description?: string | null
          grant_id: string
          id?: string
          used_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          description?: string | null
          grant_id?: string
          id?: string
          used_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credit_usages_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "workspace_credit_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_credit_usages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_credits: {
        Row: {
          available_credits: number | null
          created_at: string
          id: string
          total_credits: number
          updated_at: string
          used_credits: number
          workspace_id: string
        }
        Insert: {
          available_credits?: number | null
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
          workspace_id: string
        }
        Update: {
          available_credits?: number | null
          created_at?: string
          id?: string
          total_credits?: number
          updated_at?: string
          used_credits?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_credits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          coupon_code: string | null
          created_at: string
          creator: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_type: string
          plan_key: string
          status: string
          stripe_coupon_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          coupon_code?: string | null
          created_at?: string
          creator?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_type?: string
          plan_key: string
          status?: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          coupon_code?: string | null
          created_at?: string
          creator?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_type?: string
          plan_key?: string
          status?: string
          stripe_coupon_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "workspace_subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          creator: string | null
          default_app_settings: Json | null
          id: string
          is_active: boolean
          name: string
          stripe_customer_id: string | null
          stripe_customer_owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator?: string | null
          default_app_settings?: Json | null
          id?: string
          is_active?: boolean
          name: string
          stripe_customer_id?: string | null
          stripe_customer_owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator?: string | null
          default_app_settings?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          stripe_customer_id?: string | null
          stripe_customer_owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ws_bookmarks: {
        Row: {
          app_id: string | null
          created_at: string | null
          id: string
          object_id: string
          object_type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          object_id: string
          object_type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          id?: string
          object_id?: string
          object_type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_bookmarks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_connections: {
        Row: {
          app_id: string | null
          created_at: string | null
          creator: string | null
          external_id: string
          id: string
          oauth_token: string
          status: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          external_id: string
          id?: string
          oauth_token: string
          status?: string | null
          type: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          external_id?: string
          id?: string
          oauth_token?: string
          status?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_documents: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          creator: string | null
          id: string
          type: string
          version: number | null
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type: string
          version?: number | null
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          creator?: string | null
          id?: string
          type?: string
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_documents_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_events: {
        Row: {
          app_id: string | null
          created_at: string | null
          creator: string | null
          description: string | null
          event_date: string
          event_location: string | null
          event_time: string
          event_url: string | null
          id: string
          type: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          event_date: string
          event_location?: string | null
          event_time: string
          event_url?: string | null
          id?: string
          type: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          event_date?: string
          event_location?: string | null
          event_time?: string
          event_url?: string | null
          id?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_messages: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          creator: string | null
          from_user_id: string | null
          id: string
          meeting_id: string | null
          parent_message_id: string | null
          task_id: string | null
          to_user_id: string | null
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          creator?: string | null
          from_user_id?: string | null
          id?: string
          meeting_id?: string | null
          parent_message_id?: string | null
          task_id?: string | null
          to_user_id?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          creator?: string | null
          from_user_id?: string | null
          id?: string
          meeting_id?: string | null
          parent_message_id?: string | null
          task_id?: string | null
          to_user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "ws_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "ws_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_notifications: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_object_tags: {
        Row: {
          created_at: string | null
          creator: string | null
          id: string
          object_id: string
          object_type: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          creator?: string | null
          id?: string
          object_id: string
          object_type: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          creator?: string | null
          id?: string
          object_id?: string
          object_type?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_object_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ws_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_object_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_projects: {
        Row: {
          app_id: string | null
          applications_count: number | null
          assigned_engineer_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          created_by: string
          description: string | null
          duration_weeks: number | null
          id: string
          location: string | null
          required_skills: string[] | null
          status: string | null
          title: string
          updated_at: string
          urgency: string | null
          work_style: string | null
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          applications_count?: number | null
          assigned_engineer_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          location?: string | null
          required_skills?: string[] | null
          status?: string | null
          title: string
          updated_at?: string
          urgency?: string | null
          work_style?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          applications_count?: number | null
          assigned_engineer_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          location?: string | null
          required_skills?: string[] | null
          status?: string | null
          title?: string
          updated_at?: string
          urgency?: string | null
          work_style?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_projects_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_projects_assigned_engineer_id_fkey"
            columns: ["assigned_engineer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_social_posts: {
        Row: {
          app_id: string | null
          content: string
          created_at: string | null
          id: string
          image_urls: string[] | null
          is_posted: boolean
          post_target: string | null
          posted_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_posted?: boolean
          post_target?: string | null
          posted_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_posted?: boolean
          post_target?: string | null
          posted_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_social_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_supabase_connections: {
        Row: {
          app_id: string | null
          created_at: string | null
          creator: string | null
          oauth_token: string
          status: string | null
          supabase_project_id: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          oauth_token: string
          status?: string | null
          supabase_project_id: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          creator?: string | null
          oauth_token?: string
          status?: string | null
          supabase_project_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_supabase_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_supabase_projects_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_supabase_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_tags: {
        Row: {
          app_id: string | null
          color: string | null
          created_at: string | null
          creator: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          color?: string | null
          created_at?: string | null
          creator?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          color?: string | null
          created_at?: string | null
          creator?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ws_tasks: {
        Row: {
          ai_prompt: string | null
          app_id: string | null
          assigned_from_user_id: string | null
          created_at: string | null
          creator: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          id: string
          is_ai_task: boolean
          is_completed: boolean
          is_in_progress: boolean
          is_private: boolean
          order_no: number
          parent_task_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_prompt?: string | null
          app_id?: string | null
          assigned_from_user_id?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          is_ai_task?: boolean
          is_completed?: boolean
          is_in_progress?: boolean
          is_private?: boolean
          order_no?: number
          parent_task_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string
          workspace_id: string
        }
        Update: {
          ai_prompt?: string | null
          app_id?: string | null
          assigned_from_user_id?: string | null
          created_at?: string | null
          creator?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          id?: string
          is_ai_task?: boolean
          is_completed?: boolean
          is_in_progress?: boolean
          is_private?: boolean
          order_no?: number
          parent_task_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ws_tasks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ws_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "ws_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ws_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_user_workspace_plans_v: {
        Row: {
          display_name: string | null
          email: string | null
          is_app_admin: boolean | null
          is_developer: boolean | null
          last_sign_in_at: string | null
          plan_key: string | null
          plan_name: string | null
          plan_price: number | null
          plan_type: string | null
          user_created_at: string | null
          user_id: string | null
          workspace_credits: number | null
          workspace_id: string | null
          workspace_is_active: boolean | null
          workspace_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_subscriptions_plan_key_fkey"
            columns: ["plan_key"]
            isOneToOne: false
            referencedRelation: "m_plans"
            referencedColumns: ["key"]
          },
        ]
      }
      app_schemas_latest_v: {
        Row: {
          app_id: string | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          id: string | null
          schema_type: string | null
          updated_at: string | null
          version: number | null
          version_comment: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_schemas_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_schemas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      backend_execute_sql: {
        Args:
          | { sql: string }
          | {
              sql_query: string
              user_id: string
              workspace_id: string
              app_id?: string
            }
        Returns: Json
      }
      backend_select_sql: {
        Args:
          | { sql: string }
          | {
              sql_query: string
              user_id: string
              workspace_id: string
              app_id?: string
            }
        Returns: Json
      }
      can_access_workspace: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      can_use_workspace_credits: {
        Args: { workspace_id_param: string; user_id_param: string }
        Returns: boolean
      }
      check_plan_limit: {
        Args: { plan_key: string; limit_type: string }
        Returns: Json
      }
      client_get_app_data_schema: {
        Args: { p_app_id: string }
        Returns: Json
      }
      client_get_app_tables: {
        Args: { p_app_id: string }
        Returns: {
          table_name: string
        }[]
      }
      cron_check_and_grant_credits: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          total_credits: number
          processing_date: string
          is_grant_day: boolean
        }[]
      }
      cron_monthly_credit_grants: {
        Args: Record<PropertyKey, never>
        Returns: {
          processed_count: number
          total_credits: number
          processing_date: string
        }[]
      }
      fn_check_app_trial_expiry: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fn_check_concurrent_trial_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      fn_is_workspace_admin: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      frontend_exec_sql: {
        Args: { sql: string }
        Returns: Json
      }
      frontend_select_sql: {
        Args: { sql: string }
        Returns: Json
      }
      get_active_coupon: {
        Args: { plan_key_param: string; is_test_env?: boolean }
        Returns: {
          coupon_code: string
          name: string
          description: string
          stripe_coupon_id: string
          stripe_coupon_id_yearly: string
          discount_type: string
          discount_value: number
          start_date: string
          end_date: string
          max_uses: number
          current_uses: number
        }[]
      }
      get_plan_price: {
        Args: {
          plan_key: string
          payment_type_param?: Database["public"]["Enums"]["payment_type"]
        }
        Returns: number
      }
      get_plugin_templates: {
        Args: { plugin_keys?: string[] }
        Returns: {
          plugin_key: string
          name: string
          description: string
          category: string
          schema_json: Json
        }[]
      }
      get_workspace_subscription: {
        Args: { workspace_id_param: string }
        Returns: {
          id: string
          workspace_id: string
          plan_key: string
          status: string
          payment_type: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          stripe_subscription_id: string
          stripe_customer_id: string
          stripe_price_id: string
          coupon_code: string
          stripe_coupon_id: string
          created_at: string
          updated_at: string
        }[]
      }
      is_app_admin: {
        Args: Record<PropertyKey, never> | { uid: string }
        Returns: boolean
      }
      is_developer: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tester: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { workspace_id: string }
        Returns: boolean
      }
      search_flow_execution_contexts: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          target_user_id?: string
          target_app_id?: string
          target_workspace_id?: string
        }
        Returns: {
          request_id: string
          context_summary: string
          similarity: number
          created_at: string
          flow_id: string
          app_id: string
          workspace_id: string
        }[]
      }
      trigger_monthly_credit_grant: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      workspace_consume_credits: {
        Args: {
          _workspace_id: string
          _user_id: string
          _amount: number
          _description?: string
          _feature_type?: string
          _metadata?: Json
        }
        Returns: undefined
      }
      workspace_grant_credits: {
        Args: {
          _workspace_id: string
          _grant_type: string
          _amount: number
          _expires_at?: string
          _description?: string
          _user_id?: string
          _metadata?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      contract_type: "monthly" | "yearly"
      payment_type: "monthly" | "yearly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  admin: {
    Enums: {},
  },
  public: {
    Enums: {
      contract_type: ["monthly", "yearly"],
      payment_type: ["monthly", "yearly"],
    },
  },
} as const
