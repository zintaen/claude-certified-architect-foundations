export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      bug_reports: {
        Row: {
          browser_info: string | null;
          created_at: string | null;
          id: string;
          message: string;
          nickname: string | null;
          route: string | null;
          user_email: string | null;
        };
        Insert: {
          browser_info?: string | null;
          created_at?: string | null;
          id?: string;
          message: string;
          nickname?: string | null;
          route?: string | null;
          user_email?: string | null;
        };
        Update: {
          browser_info?: string | null;
          created_at?: string | null;
          id?: string;
          message?: string;
          nickname?: string | null;
          route?: string | null;
          user_email?: string | null;
        };
        Relationships: [];
      };
      mock_results: {
        Row: {
          created_at: string | null;
          id: string;
          score: number;
          time_taken_seconds: number | null;
          user_id: string | null;
          wrong_answers: Json | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          score: number;
          time_taken_seconds?: number | null;
          user_id?: string | null;
          wrong_answers?: Json | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          score?: number;
          time_taken_seconds?: number | null;
          user_id?: string | null;
          wrong_answers?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mock_results_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mock_users';
            referencedColumns: ['id'];
          },
        ];
      };
      mock_users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          nickname: string | null;
          pin_hash: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          nickname?: string | null;
          pin_hash: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          nickname?: string | null;
          pin_hash?: string;
        };
        Relationships: [];
      };
      question_comments: {
        Row: {
          comment: string;
          created_at: string;
          id: string;
          nickname: string;
          question_id: string;
          upvotes: number | null;
          user_email: string;
        };
        Insert: {
          comment: string;
          created_at?: string;
          id?: string;
          nickname: string;
          question_id: string;
          upvotes?: number | null;
          user_email: string;
        };
        Update: {
          comment?: string;
          created_at?: string;
          id?: string;
          nickname?: string;
          question_id?: string;
          upvotes?: number | null;
          user_email?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          created_at: string;
          group: string;
          id: string;
          options: Json;
          text: string;
        };
        Insert: {
          created_at?: string;
          group: string;
          id: string;
          options: Json;
          text: string;
        };
        Update: {
          created_at?: string;
          group?: string;
          id?: string;
          options?: Json;
          text?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          name?: string;
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          name: string;
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          name: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          name?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'certifications_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      exams: {
        Row: {
          beta_mix_ratio: number;
          blueprint_doc: string;
          certification_id: string;
          code: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          name: string;
          pass_threshold_pct: number;
          question_count: number;
          status: string;
          version: string;
        };
        Insert: {
          beta_mix_ratio?: number;
          blueprint_doc: string;
          certification_id: string;
          code: string;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          name: string;
          pass_threshold_pct: number;
          question_count: number;
          status: string;
          version: string;
        };
        Update: {
          beta_mix_ratio?: number;
          blueprint_doc?: string;
          certification_id?: string;
          code?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          pass_threshold_pct?: number;
          question_count?: number;
          status?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exams_certification_id_fkey';
            columns: ['certification_id'];
            isOneToOne: false;
            referencedRelation: 'certifications';
            referencedColumns: ['id'];
          },
        ];
      };
      domains: {
        Row: {
          exam_id: string;
          id: string;
          key: string;
          name: string;
          sort: number;
          weight_pct: number;
        };
        Insert: {
          exam_id: string;
          id?: string;
          key: string;
          name: string;
          sort: number;
          weight_pct: number;
        };
        Update: {
          exam_id?: string;
          id?: string;
          key?: string;
          name?: string;
          sort?: number;
          weight_pct?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'domains_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
        ];
      };
      objectives: {
        Row: {
          domain_id: string;
          id: string;
          sort: number;
          text: string;
        };
        Insert: {
          domain_id: string;
          id?: string;
          sort: number;
          text: string;
        };
        Update: {
          domain_id?: string;
          id?: string;
          sort?: number;
          text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'objectives_domain_id_fkey';
            columns: ['domain_id'];
            isOneToOne: false;
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          correct_key: string;
          created_at: string;
          domain_id: string;
          exam_id: string;
          explanations: Json | null;
          external_key: string;
          id: string;
          item_status: string;
          objective_id: string | null;
          options: Json;
          provenance: Json;
          stem: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          correct_key: string;
          created_at?: string;
          domain_id: string;
          exam_id: string;
          explanations?: Json | null;
          external_key: string;
          id?: string;
          item_status: string;
          objective_id?: string | null;
          options: Json;
          provenance: Json;
          stem: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          correct_key?: string;
          created_at?: string;
          domain_id?: string;
          exam_id?: string;
          explanations?: Json | null;
          external_key?: string;
          id?: string;
          item_status?: string;
          objective_id?: string | null;
          options?: Json;
          provenance?: Json;
          stem?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'items_domain_id_fkey';
            columns: ['domain_id'];
            isOneToOne: false;
            referencedRelation: 'domains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_objective_id_fkey';
            columns: ['objective_id'];
            isOneToOne: false;
            referencedRelation: 'objectives';
            referencedColumns: ['id'];
          },
        ];
      };
      item_reviews: {
        Row: {
          id: string;
          item_ref: string;
          notes: string | null;
          reviewer: string;
          signed_at: string;
          verdict: string;
        };
        Insert: {
          id?: string;
          item_ref: string;
          notes?: string | null;
          reviewer: string;
          signed_at?: string;
          verdict: string;
        };
        Update: {
          id?: string;
          item_ref?: string;
          notes?: string | null;
          reviewer?: string;
          signed_at?: string;
          verdict?: string;
        };
        Relationships: [];
      };
      item_stats: {
        Row: {
          computed_at: string;
          irt_a: number | null;
          irt_b: number | null;
          item_id: string;
          p_value: number | null;
          point_biserial: number | null;
          response_count: number;
        };
        Insert: {
          computed_at?: string;
          irt_a?: number | null;
          irt_b?: number | null;
          item_id: string;
          p_value?: number | null;
          point_biserial?: number | null;
          response_count: number;
        };
        Update: {
          computed_at?: string;
          irt_a?: number | null;
          irt_b?: number | null;
          item_id?: string;
          p_value?: number | null;
          point_biserial?: number | null;
          response_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'item_stats_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          pin_hash: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          pin_hash: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          pin_hash?: string;
        };
        Relationships: [];
      };
      sittings: {
        Row: {
          breakdown: Json | null;
          exam_id: string;
          id: string;
          mode: string;
          passed: boolean | null;
          question_set: Json;
          score_pct: number | null;
          started_at: string;
          submitted_at: string | null;
          user_id: string | null;
        };
        Insert: {
          breakdown?: Json | null;
          exam_id: string;
          id?: string;
          mode: string;
          passed?: boolean | null;
          question_set: Json;
          score_pct?: number | null;
          started_at?: string;
          submitted_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          breakdown?: Json | null;
          exam_id?: string;
          id?: string;
          mode?: string;
          passed?: boolean | null;
          question_set?: Json;
          score_pct?: number | null;
          started_at?: string;
          submitted_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sittings_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sittings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      item_responses: {
        Row: {
          answered_at: string;
          elapsed_ms: number | null;
          id: number;
          is_correct: boolean;
          item_id: string;
          item_version: number;
          selected_key: string | null;
          sitting_id: string;
        };
        Insert: {
          answered_at?: string;
          elapsed_ms?: number | null;
          id?: never;
          is_correct: boolean;
          item_id: string;
          item_version: number;
          selected_key?: string | null;
          sitting_id: string;
        };
        Update: {
          answered_at?: string;
          elapsed_ms?: number | null;
          id?: never;
          is_correct?: boolean;
          item_id?: string;
          item_version?: number;
          selected_key?: string | null;
          sitting_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_responses_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_responses_sitting_id_fkey';
            columns: ['sitting_id'];
            isOneToOne: false;
            referencedRelation: 'sittings';
            referencedColumns: ['id'];
          },
        ];
      };
      entitlements: {
        Row: {
          ends_at: string | null;
          exam_id: string | null;
          id: string;
          sku: string;
          source: string;
          starts_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          ends_at?: string | null;
          exam_id?: string | null;
          id?: string;
          sku: string;
          source: string;
          starts_at: string;
          status: string;
          user_id: string;
        };
        Update: {
          ends_at?: string | null;
          exam_id?: string | null;
          id?: string;
          sku?: string;
          source?: string;
          starts_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entitlements_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entitlements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      entitlement_events: {
        Row: {
          actor: string;
          created_at: string;
          exam_id: string | null;
          id: number;
          kind: string;
          metadata: Json | null;
          sku: string;
          source: string;
          user_id: string;
        };
        Insert: {
          actor: string;
          created_at?: string;
          exam_id?: string | null;
          id?: number;
          kind: string;
          metadata?: Json | null;
          sku: string;
          source: string;
          user_id: string;
        };
        Update: {
          actor?: string;
          created_at?: string;
          exam_id?: string | null;
          id?: number;
          kind?: string;
          metadata?: Json | null;
          sku?: string;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entitlement_events_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entitlement_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tutor_usage: {
        Row: {
          day: string;
          requests: number;
          tokens_in: number;
          tokens_out: number;
          user_id: string;
        };
        Insert: {
          day: string;
          requests?: number;
          tokens_in?: number;
          tokens_out?: number;
          user_id: string;
        };
        Update: {
          day?: string;
          requests?: number;
          tokens_in?: number;
          tokens_out?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tutor_usage_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tutor_cache: {
        Row: {
          answer: string;
          created_at: string;
          intent_key: string;
          item_id: string;
          item_version: number;
          model: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          intent_key: string;
          item_id: string;
          item_version: number;
          model: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          intent_key?: string;
          item_id?: string;
          item_version?: number;
          model?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          code: string;
          created_at: string;
          referrer_user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          referrer_user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          referrer_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'referrals_referrer_user_id_fkey';
            columns: ['referrer_user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      referral_events: {
        Row: {
          code: string;
          created_at: string;
          id: number;
          kind: string;
          metadata: Json | null;
          referred_user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: number;
          kind: string;
          metadata?: Json | null;
          referred_user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: number;
          kind?: string;
          metadata?: Json | null;
          referred_user_id?: string;
        };
        Relationships: [];
      };
      community_explanations: {
        Row: {
          id: string;
          item_id: string;
          item_version: number;
          author_user_id: string;
          body: string;
          status: string;
          moderation_note: string | null;
          flag_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          item_version?: number;
          author_user_id: string;
          body: string;
          status?: string;
          moderation_note?: string | null;
          flag_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          item_version?: number;
          author_user_id?: string;
          body?: string;
          status?: string;
          moderation_note?: string | null;
          flag_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      explanation_votes: {
        Row: {
          explanation_id: string;
          voter_user_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          explanation_id: string;
          voter_user_id: string;
          value?: number;
          created_at?: string;
        };
        Update: {
          explanation_id?: string;
          voter_user_id?: string;
          value?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      community_item_flags: {
        Row: {
          id: number;
          item_id: string;
          explanation_id: string | null;
          reason: string;
          aup_cite: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          item_id: string;
          explanation_id?: string | null;
          reason: string;
          aup_cite?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          item_id?: string;
          explanation_id?: string | null;
          reason?: string;
          aup_cite?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      email_suppressions: {
        Row: {
          email: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          email: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      email_sends: {
        Row: {
          id: number;
          recipient: string;
          recipient_hash: string;
          template: string;
          sequence: string;
          message_id: string | null;
          sent_at: string;
        };
        Insert: {
          id?: number;
          recipient: string;
          recipient_hash: string;
          template: string;
          sequence: string;
          message_id?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: number;
          recipient?: string;
          recipient_hash?: string;
          template?: string;
          sequence?: string;
          message_id?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      review_cards: {
        Row: {
          id: string;
          user_id: string;
          card_kind: string;
          card_ref: string;
          exam_code: string;
          stability: number;
          difficulty: number;
          state: string;
          due_at: string;
          last_review_at: string | null;
          suspended: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          card_kind: string;
          card_ref: string;
          exam_code?: string;
          stability?: number;
          difficulty?: number;
          state?: string;
          due_at?: string;
          last_review_at?: string | null;
          suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          card_kind?: string;
          card_ref?: string;
          exam_code?: string;
          stability?: number;
          difficulty?: number;
          state?: string;
          due_at?: string;
          last_review_at?: string | null;
          suspended?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prices: {
        Row: {
          active: boolean;
          amount_minor: number;
          currency: string;
          exam_id: string | null;
          id: string;
          sku: string;
          tier: string;
        };
        Insert: {
          active?: boolean;
          amount_minor: number;
          currency: string;
          exam_id?: string | null;
          id?: string;
          sku: string;
          tier: string;
        };
        Update: {
          active?: boolean;
          amount_minor?: number;
          currency?: string;
          exam_id?: string | null;
          id?: string;
          sku?: string;
          tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prices_exam_id_fkey';
            columns: ['exam_id'];
            isOneToOne: false;
            referencedRelation: 'exams';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      tutor_try_spend: {
        Args: {
          p_user_id: string;
          p_day: string;
          p_tokens_in: number;
          p_tokens_out: number;
          p_max_tokens: number;
          p_max_requests: number;
        };
        Returns: boolean;
      };
      get_global_stats: { Args: never; Returns: Json };
      get_user_history: {
        Args: { p_email: string; p_pin_hash: string };
        Returns: Json;
      };
      submit_exam_result:
        | {
            Args: {
              p_email?: string;
              p_nickname?: string;
              p_pin_hash?: string;
              p_score?: number;
              p_time_taken?: number;
              p_wrong_answers?: number[];
            };
            Returns: Json;
          }
        | {
            Args: {
              p_email?: string;
              p_pin_hash?: string;
              p_score?: number;
              p_time_taken?: number;
              p_wrong_answers?: Json;
            };
            Returns: Json;
          };
      verify_mock_user:
        | { Args: { p_email: string; p_pin_hash: string }; Returns: Json }
        | {
            Args: { p_email: string; p_nickname?: string; p_pin_hash: string };
            Returns: Json;
          };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
