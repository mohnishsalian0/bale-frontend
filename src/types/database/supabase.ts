export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
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
  public: {
    Tables: {
      catalog_configurations: {
        Row: {
          accepting_orders: boolean | null;
          catalog_name: string | null;
          company_id: string;
          contact_address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          created_by: string | null;
          domain_slug: string | null;
          favicon_url: string | null;
          filter_options: Json | null;
          font_family: string | null;
          id: string;
          logo_url: string | null;
          modified_by: string | null;
          primary_color: string | null;
          privacy_policy: string | null;
          return_policy: string | null;
          secondary_color: string | null;
          show_fields: Json | null;
          sort_options: Json | null;
          terms_conditions: string | null;
          updated_at: string;
        };
        Insert: {
          accepting_orders?: boolean | null;
          catalog_name?: string | null;
          company_id?: string;
          contact_address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          domain_slug?: string | null;
          favicon_url?: string | null;
          filter_options?: Json | null;
          font_family?: string | null;
          id?: string;
          logo_url?: string | null;
          modified_by?: string | null;
          primary_color?: string | null;
          privacy_policy?: string | null;
          return_policy?: string | null;
          secondary_color?: string | null;
          show_fields?: Json | null;
          sort_options?: Json | null;
          terms_conditions?: string | null;
          updated_at?: string;
        };
        Update: {
          accepting_orders?: boolean | null;
          catalog_name?: string | null;
          company_id?: string;
          contact_address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          domain_slug?: string | null;
          favicon_url?: string | null;
          filter_options?: Json | null;
          font_family?: string | null;
          id?: string;
          logo_url?: string | null;
          modified_by?: string | null;
          primary_color?: string | null;
          privacy_policy?: string | null;
          return_policy?: string | null;
          secondary_color?: string | null;
          show_fields?: Json | null;
          sort_options?: Json | null;
          terms_conditions?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_configurations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          business_type: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          gst_number: string | null;
          id: string;
          logo_url: string | null;
          modified_by: string | null;
          name: string;
          pan_number: string | null;
          phone_number: string | null;
          pin_code: string | null;
          slug: string;
          state: string | null;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          business_type?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          gst_number?: string | null;
          id?: string;
          logo_url?: string | null;
          modified_by?: string | null;
          name: string;
          pan_number?: string | null;
          phone_number?: string | null;
          pin_code?: string | null;
          slug: string;
          state?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          business_type?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          gst_number?: string | null;
          id?: string;
          logo_url?: string | null;
          modified_by?: string | null;
          name?: string;
          pan_number?: string | null;
          phone_number?: string | null;
          pin_code?: string | null;
          slug?: string;
          state?: string | null;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      goods_inwards: {
        Row: {
          agent_id: string | null;
          attachments: string[] | null;
          company_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expected_delivery_date: string | null;
          from_warehouse_id: string | null;
          id: string;
          inward_date: string;
          inward_type: string;
          job_work_id: string | null;
          modified_by: string | null;
          notes: string | null;
          other_reason: string | null;
          partner_id: string | null;
          purchase_order_id: string | null;
          sales_order_id: string | null;
          search_vector: unknown;
          sequence_number: number;
          transport_details: string | null;
          transport_reference_number: string | null;
          transport_type: string | null;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          expected_delivery_date?: string | null;
          from_warehouse_id?: string | null;
          id?: string;
          inward_date?: string;
          inward_type: string;
          job_work_id?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          other_reason?: string | null;
          partner_id?: string | null;
          purchase_order_id?: string | null;
          sales_order_id?: string | null;
          search_vector?: unknown;
          sequence_number: number;
          transport_details?: string | null;
          transport_reference_number?: string | null;
          transport_type?: string | null;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          expected_delivery_date?: string | null;
          from_warehouse_id?: string | null;
          id?: string;
          inward_date?: string;
          inward_type?: string;
          job_work_id?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          other_reason?: string | null;
          partner_id?: string | null;
          purchase_order_id?: string | null;
          sales_order_id?: string | null;
          search_vector?: unknown;
          sequence_number?: number;
          transport_details?: string | null;
          transport_reference_number?: string | null;
          transport_type?: string | null;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goods_inwards_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_from_warehouse_id_fkey";
            columns: ["from_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_sales_order_id_fkey";
            columns: ["sales_order_id"];
            isOneToOne: false;
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_inwards_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      goods_outward_items: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          outward_id: string;
          quantity_dispatched: number;
          stock_unit_id: string;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          outward_id: string;
          quantity_dispatched: number;
          stock_unit_id: string;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          outward_id?: string;
          quantity_dispatched?: number;
          stock_unit_id?: string;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goods_outward_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outward_items_outward_id_fkey";
            columns: ["outward_id"];
            isOneToOne: false;
            referencedRelation: "goods_outwards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outward_items_stock_unit_id_fkey";
            columns: ["stock_unit_id"];
            isOneToOne: false;
            referencedRelation: "stock_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outward_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      goods_outwards: {
        Row: {
          agent_id: string | null;
          attachments: string[] | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          company_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          expected_delivery_date: string | null;
          id: string;
          is_cancelled: boolean | null;
          job_work_id: string | null;
          modified_by: string | null;
          notes: string | null;
          other_reason: string | null;
          outward_date: string;
          outward_type: string;
          partner_id: string | null;
          purchase_order_id: string | null;
          sales_order_id: string | null;
          search_vector: unknown;
          sequence_number: number;
          to_warehouse_id: string | null;
          transport_details: string | null;
          transport_reference_number: string | null;
          transport_type: string | null;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          agent_id?: string | null;
          attachments?: string[] | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          company_id?: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          is_cancelled?: boolean | null;
          job_work_id?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          other_reason?: string | null;
          outward_date?: string;
          outward_type: string;
          partner_id?: string | null;
          purchase_order_id?: string | null;
          sales_order_id?: string | null;
          search_vector?: unknown;
          sequence_number: number;
          to_warehouse_id?: string | null;
          transport_details?: string | null;
          transport_reference_number?: string | null;
          transport_type?: string | null;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          agent_id?: string | null;
          attachments?: string[] | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          expected_delivery_date?: string | null;
          id?: string;
          is_cancelled?: boolean | null;
          job_work_id?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          other_reason?: string | null;
          outward_date?: string;
          outward_type?: string;
          partner_id?: string | null;
          purchase_order_id?: string | null;
          sales_order_id?: string | null;
          search_vector?: unknown;
          sequence_number?: number;
          to_warehouse_id?: string | null;
          transport_details?: string | null;
          transport_reference_number?: string | null;
          transport_type?: string | null;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goods_outwards_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_sales_order_id_fkey";
            columns: ["sales_order_id"];
            isOneToOne: false;
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_to_warehouse_id_fkey";
            columns: ["to_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goods_outwards_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_warehouses: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          invite_id: string;
          warehouse_id: string;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          id?: string;
          invite_id: string;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          invite_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invite_warehouses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_warehouses_invite_id_fkey";
            columns: ["invite_id"];
            isOneToOne: false;
            referencedRelation: "invites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_warehouses_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          all_warehouses_access: boolean;
          company_id: string;
          company_name: string;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          role: string;
          token: string;
          used_at: string | null;
          used_by_user_id: string | null;
        };
        Insert: {
          all_warehouses_access?: boolean;
          company_id?: string;
          company_name: string;
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          role: string;
          token: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
        };
        Update: {
          all_warehouses_access?: boolean;
          company_id?: string;
          company_name?: string;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          role?: string;
          token?: string;
          used_at?: string | null;
          used_by_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      job_work_finished_goods: {
        Row: {
          company_id: string;
          created_at: string;
          expected_quantity: number;
          id: string;
          job_work_id: string;
          pending_quantity: number | null;
          product_id: string;
          received_quantity: number | null;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          expected_quantity: number;
          id?: string;
          job_work_id: string;
          pending_quantity?: number | null;
          product_id: string;
          received_quantity?: number | null;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          expected_quantity?: number;
          id?: string;
          job_work_id?: string;
          pending_quantity?: number | null;
          product_id?: string;
          received_quantity?: number | null;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_work_finished_goods_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_finished_goods_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_finished_goods_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_finished_goods_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      job_work_raw_materials: {
        Row: {
          company_id: string;
          created_at: string;
          dispatched_quantity: number | null;
          id: string;
          job_work_id: string;
          pending_quantity: number | null;
          product_id: string;
          required_quantity: number;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          dispatched_quantity?: number | null;
          id?: string;
          job_work_id: string;
          pending_quantity?: number | null;
          product_id: string;
          required_quantity: number;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          dispatched_quantity?: number | null;
          id?: string;
          job_work_id?: string;
          pending_quantity?: number | null;
          product_id?: string;
          required_quantity?: number;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_work_raw_materials_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_raw_materials_job_work_id_fkey";
            columns: ["job_work_id"];
            isOneToOne: false;
            referencedRelation: "job_works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_raw_materials_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_work_raw_materials_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      job_works: {
        Row: {
          agent_id: string | null;
          attachments: string[] | null;
          company_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          due_date: string | null;
          id: string;
          job_type: string;
          modified_by: string | null;
          notes: string | null;
          sales_order_id: string | null;
          sequence_number: number;
          start_date: string;
          status: string;
          status_changed_at: string | null;
          status_changed_by: string | null;
          status_notes: string | null;
          updated_at: string;
          vendor_id: string;
          warehouse_id: string;
        };
        Insert: {
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          due_date?: string | null;
          id?: string;
          job_type: string;
          modified_by?: string | null;
          notes?: string | null;
          sales_order_id?: string | null;
          sequence_number: number;
          start_date: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          updated_at?: string;
          vendor_id: string;
          warehouse_id: string;
        };
        Update: {
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          due_date?: string | null;
          id?: string;
          job_type?: string;
          modified_by?: string | null;
          notes?: string | null;
          sales_order_id?: string | null;
          sequence_number?: number;
          start_date?: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          updated_at?: string;
          vendor_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_works_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_works_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey";
            columns: ["sales_order_id"];
            isOneToOne: false;
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_works_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_order_aggregates: {
        Row: {
          approval_pending_count: number | null;
          approval_pending_value: number | null;
          cancelled_count: number | null;
          cancelled_value: number | null;
          company_id: string;
          completed_count: number | null;
          completed_value: number | null;
          created_at: string | null;
          first_order_date: string | null;
          id: string;
          in_progress_count: number | null;
          in_progress_value: number | null;
          last_order_date: string | null;
          last_updated_at: string | null;
          lifetime_order_value: number | null;
          partner_id: string;
          total_orders: number | null;
        };
        Insert: {
          approval_pending_count?: number | null;
          approval_pending_value?: number | null;
          cancelled_count?: number | null;
          cancelled_value?: number | null;
          company_id: string;
          completed_count?: number | null;
          completed_value?: number | null;
          created_at?: string | null;
          first_order_date?: string | null;
          id?: string;
          in_progress_count?: number | null;
          in_progress_value?: number | null;
          last_order_date?: string | null;
          last_updated_at?: string | null;
          lifetime_order_value?: number | null;
          partner_id: string;
          total_orders?: number | null;
        };
        Update: {
          approval_pending_count?: number | null;
          approval_pending_value?: number | null;
          cancelled_count?: number | null;
          cancelled_value?: number | null;
          company_id?: string;
          completed_count?: number | null;
          completed_value?: number | null;
          created_at?: string | null;
          first_order_date?: string | null;
          id?: string;
          in_progress_count?: number | null;
          in_progress_value?: number | null;
          last_order_date?: string | null;
          last_updated_at?: string | null;
          lifetime_order_value?: number | null;
          partner_id?: string;
          total_orders?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "partner_order_aggregates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_order_aggregates_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: true;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          company_id: string;
          company_name: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          gst_number: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_guest: boolean | null;
          last_interaction_at: string | null;
          last_name: string;
          modified_by: string | null;
          notes: string | null;
          pan_number: string | null;
          partner_type: string;
          phone_number: string;
          pin_code: string | null;
          registered_at: string | null;
          search_vector: unknown;
          source: string;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          company_id?: string;
          company_name?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          gst_number?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_guest?: boolean | null;
          last_interaction_at?: string | null;
          last_name: string;
          modified_by?: string | null;
          notes?: string | null;
          pan_number?: string | null;
          partner_type: string;
          phone_number: string;
          pin_code?: string | null;
          registered_at?: string | null;
          search_vector?: unknown;
          source?: string;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          company_id?: string;
          company_name?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          gst_number?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_guest?: boolean | null;
          last_interaction_at?: string | null;
          last_name?: string;
          modified_by?: string | null;
          notes?: string | null;
          pan_number?: string | null;
          partner_type?: string;
          phone_number?: string;
          pin_code?: string | null;
          registered_at?: string | null;
          search_vector?: unknown;
          source?: string;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      permissions: {
        Row: {
          category: string | null;
          created_at: string;
          description: string | null;
          display_name: string | null;
          id: string;
          permission_path: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          permission_path: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          permission_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_attribute_assignments: {
        Row: {
          attribute_id: string;
          product_id: string;
        };
        Insert: {
          attribute_id: string;
          product_id: string;
        };
        Update: {
          attribute_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_attribute_assignments_attribute_id_fkey";
            columns: ["attribute_id"];
            isOneToOne: false;
            referencedRelation: "product_attributes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_attribute_assignments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_attributes: {
        Row: {
          color_hex: string | null;
          company_id: string;
          created_at: string;
          group_name: string;
          id: string;
          name: string;
        };
        Insert: {
          color_hex?: string | null;
          company_id?: string;
          created_at?: string;
          group_name: string;
          id?: string;
          name: string;
        };
        Update: {
          color_hex?: string | null;
          company_id?: string;
          created_at?: string;
          group_name?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_attributes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      product_inventory_aggregates: {
        Row: {
          company_id: string;
          created_at: string | null;
          dispatched_quantity: number | null;
          dispatched_units: number | null;
          dispatched_value: number | null;
          id: string;
          in_stock_quantity: number | null;
          in_stock_units: number | null;
          in_stock_value: number | null;
          last_updated_at: string | null;
          pending_qr_units: number | null;
          product_id: string;
          removed_quantity: number | null;
          removed_units: number | null;
          removed_value: number | null;
          total_quantity_received: number | null;
          total_units_received: number | null;
          warehouse_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          dispatched_quantity?: number | null;
          dispatched_units?: number | null;
          dispatched_value?: number | null;
          id?: string;
          in_stock_quantity?: number | null;
          in_stock_units?: number | null;
          in_stock_value?: number | null;
          last_updated_at?: string | null;
          pending_qr_units?: number | null;
          product_id: string;
          removed_quantity?: number | null;
          removed_units?: number | null;
          removed_value?: number | null;
          total_quantity_received?: number | null;
          total_units_received?: number | null;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          dispatched_quantity?: number | null;
          dispatched_units?: number | null;
          dispatched_value?: number | null;
          id?: string;
          in_stock_quantity?: number | null;
          in_stock_units?: number | null;
          in_stock_value?: number | null;
          last_updated_at?: string | null;
          pending_qr_units?: number | null;
          product_id?: string;
          removed_quantity?: number | null;
          removed_units?: number | null;
          removed_value?: number | null;
          total_quantity_received?: number | null;
          total_units_received?: number | null;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_inventory_aggregates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_inventory_aggregates_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_inventory_aggregates_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variant_items: {
        Row: {
          company_id: string;
          display_order: number | null;
          id: string;
          product_id: string;
          variant_id: string;
          variant_value: string;
        };
        Insert: {
          company_id?: string;
          display_order?: number | null;
          id?: string;
          product_id: string;
          variant_id: string;
          variant_value: string;
        };
        Update: {
          company_id?: string;
          display_order?: number | null;
          id?: string;
          product_id?: string;
          variant_id?: string;
          variant_value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variant_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variant_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          company_id: string;
          created_at: string;
          display_order: number | null;
          id: string;
          updated_at: string;
          variant_name: string;
          variant_type: string | null;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          display_order?: number | null;
          id?: string;
          updated_at?: string;
          variant_name: string;
          variant_type?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          display_order?: number | null;
          id?: string;
          updated_at?: string;
          variant_name?: string;
          variant_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          company_id: string;
          cost_price_per_unit: number | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          gsm: number | null;
          hsn_code: string | null;
          id: string;
          is_active: boolean;
          measuring_unit: string | null;
          min_stock_alert: boolean | null;
          min_stock_threshold: number | null;
          modified_by: string | null;
          name: string;
          notes: string | null;
          product_images: string[] | null;
          search_vector: unknown;
          selling_price_per_unit: number | null;
          sequence_number: number;
          show_on_catalog: boolean | null;
          stock_type: string;
          thread_count_cm: number | null;
          updated_at: string;
        };
        Insert: {
          company_id?: string;
          cost_price_per_unit?: number | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          gsm?: number | null;
          hsn_code?: string | null;
          id?: string;
          is_active?: boolean;
          measuring_unit?: string | null;
          min_stock_alert?: boolean | null;
          min_stock_threshold?: number | null;
          modified_by?: string | null;
          name: string;
          notes?: string | null;
          product_images?: string[] | null;
          search_vector?: unknown;
          selling_price_per_unit?: number | null;
          sequence_number: number;
          show_on_catalog?: boolean | null;
          stock_type: string;
          thread_count_cm?: number | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          cost_price_per_unit?: number | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          gsm?: number | null;
          hsn_code?: string | null;
          id?: string;
          is_active?: boolean;
          measuring_unit?: string | null;
          min_stock_alert?: boolean | null;
          min_stock_threshold?: number | null;
          modified_by?: string | null;
          name?: string;
          notes?: string | null;
          product_images?: string[] | null;
          search_vector?: unknown;
          selling_price_per_unit?: number | null;
          sequence_number?: number;
          show_on_catalog?: boolean | null;
          stock_type?: string;
          thread_count_cm?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          line_total: number | null;
          notes: string | null;
          pending_quantity: number | null;
          product_id: string;
          purchase_order_id: string;
          received_quantity: number | null;
          required_quantity: number;
          unit_rate: number | null;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          id?: string;
          line_total?: number | null;
          notes?: string | null;
          pending_quantity?: number | null;
          product_id: string;
          purchase_order_id: string;
          received_quantity?: number | null;
          required_quantity: number;
          unit_rate?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          line_total?: number | null;
          notes?: string | null;
          pending_quantity?: number | null;
          product_id?: string;
          purchase_order_id?: string;
          received_quantity?: number | null;
          required_quantity?: number;
          unit_rate?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey";
            columns: ["purchase_order_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          advance_amount: number | null;
          agent_id: string | null;
          attachments: string[] | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          discount_type: Database["public"]["Enums"]["discount_type_enum"];
          discount_value: number | null;
          expected_delivery_date: string | null;
          gst_amount: number | null;
          gst_rate: number | null;
          has_inward: boolean | null;
          id: string;
          modified_by: string | null;
          notes: string | null;
          order_date: string;
          payment_terms: string | null;
          search_vector: unknown;
          sequence_number: number;
          source: string;
          status: string;
          status_changed_at: string | null;
          status_changed_by: string | null;
          status_notes: string | null;
          supplier_id: string;
          supplier_invoice_number: string | null;
          total_amount: number | null;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          advance_amount?: number | null;
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type_enum"];
          discount_value?: number | null;
          expected_delivery_date?: string | null;
          gst_amount?: number | null;
          gst_rate?: number | null;
          has_inward?: boolean | null;
          id?: string;
          modified_by?: string | null;
          notes?: string | null;
          order_date?: string;
          payment_terms?: string | null;
          search_vector?: unknown;
          sequence_number: number;
          source?: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          supplier_id: string;
          supplier_invoice_number?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          advance_amount?: number | null;
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type_enum"];
          discount_value?: number | null;
          expected_delivery_date?: string | null;
          gst_amount?: number | null;
          gst_rate?: number | null;
          has_inward?: boolean | null;
          id?: string;
          modified_by?: string | null;
          notes?: string | null;
          order_date?: string;
          payment_terms?: string | null;
          search_vector?: unknown;
          sequence_number?: number;
          source?: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          supplier_id?: string;
          supplier_invoice_number?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_batch_items: {
        Row: {
          batch_id: string;
          company_id: string;
          id: string;
          stock_unit_id: string;
          warehouse_id: string;
        };
        Insert: {
          batch_id: string;
          company_id?: string;
          id?: string;
          stock_unit_id: string;
          warehouse_id: string;
        };
        Update: {
          batch_id?: string;
          company_id?: string;
          id?: string;
          stock_unit_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_batch_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "qr_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_batch_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_batch_items_stock_unit_id_fkey";
            columns: ["stock_unit_id"];
            isOneToOne: false;
            referencedRelation: "stock_units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_batch_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_batches: {
        Row: {
          batch_name: string;
          company_id: string;
          created_at: string;
          created_by: string;
          fields_selected: string[] | null;
          id: string;
          image_url: string | null;
          modified_by: string | null;
          pdf_url: string | null;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          batch_name: string;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          fields_selected?: string[] | null;
          id?: string;
          image_url?: string | null;
          modified_by?: string | null;
          pdf_url?: string | null;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          batch_name?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          fields_selected?: string[] | null;
          id?: string;
          image_url?: string | null;
          modified_by?: string | null;
          pdf_url?: string | null;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_batches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_batches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          created_at: string;
          id: string;
          permission_id: string;
          role_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          permission_id: string;
          role_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          permission_id?: string;
          role_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          display_name: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales_order_items: {
        Row: {
          company_id: string;
          created_at: string;
          dispatched_quantity: number | null;
          id: string;
          line_total: number | null;
          notes: string | null;
          pending_quantity: number | null;
          product_id: string;
          required_quantity: number;
          sales_order_id: string;
          unit_rate: number | null;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          dispatched_quantity?: number | null;
          id?: string;
          line_total?: number | null;
          notes?: string | null;
          pending_quantity?: number | null;
          product_id: string;
          required_quantity: number;
          sales_order_id: string;
          unit_rate?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          dispatched_quantity?: number | null;
          id?: string;
          line_total?: number | null;
          notes?: string | null;
          pending_quantity?: number | null;
          product_id?: string;
          required_quantity?: number;
          sales_order_id?: string;
          unit_rate?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_order_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey";
            columns: ["sales_order_id"];
            isOneToOne: false;
            referencedRelation: "sales_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sales_orders: {
        Row: {
          advance_amount: number | null;
          agent_id: string | null;
          attachments: string[] | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          deleted_at: string | null;
          discount_type: Database["public"]["Enums"]["discount_type_enum"];
          discount_value: number | null;
          expected_delivery_date: string | null;
          gst_amount: number | null;
          gst_rate: number | null;
          has_outward: boolean | null;
          id: string;
          invoice_number: string | null;
          modified_by: string | null;
          notes: string | null;
          order_date: string;
          payment_terms: string | null;
          search_vector: unknown;
          sequence_number: number;
          source: string;
          status: string;
          status_changed_at: string | null;
          status_changed_by: string | null;
          status_notes: string | null;
          total_amount: number | null;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          advance_amount?: number | null;
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          deleted_at?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type_enum"];
          discount_value?: number | null;
          expected_delivery_date?: string | null;
          gst_amount?: number | null;
          gst_rate?: number | null;
          has_outward?: boolean | null;
          id?: string;
          invoice_number?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          order_date?: string;
          payment_terms?: string | null;
          search_vector?: unknown;
          sequence_number: number;
          source?: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          advance_amount?: number | null;
          agent_id?: string | null;
          attachments?: string[] | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string;
          deleted_at?: string | null;
          discount_type?: Database["public"]["Enums"]["discount_type_enum"];
          discount_value?: number | null;
          expected_delivery_date?: string | null;
          gst_amount?: number | null;
          gst_rate?: number | null;
          has_outward?: boolean | null;
          id?: string;
          invoice_number?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          order_date?: string;
          payment_terms?: string | null;
          search_vector?: unknown;
          sequence_number?: number;
          source?: string;
          status?: string;
          status_changed_at?: string | null;
          status_changed_by?: string | null;
          status_notes?: string | null;
          total_amount?: number | null;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_orders_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sequence_counters: {
        Row: {
          company_id: string;
          created_at: string;
          current_value: number;
          id: string;
          table_name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          current_value?: number;
          id?: string;
          table_name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          current_value?: number;
          id?: string;
          table_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sequence_counters_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_units: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string;
          created_from_inward_id: string | null;
          deleted_at: string | null;
          id: string;
          initial_quantity: number;
          manufacturing_date: string | null;
          modified_by: string | null;
          notes: string | null;
          product_id: string;
          qr_generated_at: string | null;
          quality_grade: string | null;
          remaining_quantity: number;
          sequence_number: number;
          status: string;
          supplier_number: string | null;
          updated_at: string;
          warehouse_id: string;
          warehouse_location: string | null;
        };
        Insert: {
          company_id?: string;
          created_at?: string;
          created_by?: string;
          created_from_inward_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          initial_quantity: number;
          manufacturing_date?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          product_id: string;
          qr_generated_at?: string | null;
          quality_grade?: string | null;
          remaining_quantity: number;
          sequence_number: number;
          status?: string;
          supplier_number?: string | null;
          updated_at?: string;
          warehouse_id: string;
          warehouse_location?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string;
          created_from_inward_id?: string | null;
          deleted_at?: string | null;
          id?: string;
          initial_quantity?: number;
          manufacturing_date?: string | null;
          modified_by?: string | null;
          notes?: string | null;
          product_id?: string;
          qr_generated_at?: string | null;
          quality_grade?: string | null;
          remaining_quantity?: number;
          sequence_number?: number;
          status?: string;
          supplier_number?: string | null;
          updated_at?: string;
          warehouse_id?: string;
          warehouse_location?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_stock_unit_inward";
            columns: ["created_from_inward_id"];
            isOneToOne: false;
            referencedRelation: "goods_inwards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_units_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_units_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_units_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_warehouses: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          user_id: string;
          warehouse_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          user_id: string;
          warehouse_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          user_id?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_warehouses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_warehouses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          additional_notes: string | null;
          all_warehouses_access: boolean | null;
          auth_user_id: string | null;
          company_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          is_active: boolean | null;
          last_name: string;
          modified_by: string | null;
          phone_number: string | null;
          profile_image_url: string | null;
          role: string;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          additional_notes?: string | null;
          all_warehouses_access?: boolean | null;
          auth_user_id?: string | null;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          is_active?: boolean | null;
          last_name: string;
          modified_by?: string | null;
          phone_number?: string | null;
          profile_image_url?: string | null;
          role: string;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          additional_notes?: string | null;
          all_warehouses_access?: boolean | null;
          auth_user_id?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_active?: boolean | null;
          last_name?: string;
          modified_by?: string | null;
          phone_number?: string | null;
          profile_image_url?: string | null;
          role?: string;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_users_role";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouses: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          company_id: string;
          contact_name: string | null;
          contact_number: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          modified_by: string | null;
          name: string;
          pin_code: string | null;
          slug: string;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          company_id?: string;
          contact_name?: string | null;
          contact_number?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          modified_by?: string | null;
          name: string;
          pin_code?: string | null;
          slug: string;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          company_id?: string;
          contact_name?: string | null;
          contact_number?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          modified_by?: string | null;
          name?: string;
          pin_code?: string | null;
          slug?: string;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_purchase_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string };
        Returns: undefined;
      };
      approve_sales_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string };
        Returns: undefined;
      };
      authorize: { Args: { required_permission: string }; Returns: boolean };
      cleanup_expired_tokens: { Args: never; Returns: number };
      create_goods_inward_with_units: {
        Args: { p_inward_data: Json; p_stock_units: Json[] };
        Returns: string;
      };
      create_goods_outward_with_items: {
        Args: { p_outward_data: Json; p_stock_unit_items: Json[] };
        Returns: string;
      };
      create_purchase_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json };
        Returns: number;
      };
      create_qr_batch_with_items: {
        Args: { p_batch_data: Json; p_stock_unit_ids: string[] };
        Returns: string;
      };
      create_sales_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json };
        Returns: number;
      };
      create_staff_invite: {
        Args: {
          p_all_warehouses_access: boolean;
          p_company_id: string;
          p_company_name: string;
          p_expires_at: string;
          p_role: string;
          p_warehouse_ids: string[];
        };
        Returns: string;
      };
      create_user_from_invite: {
        Args: {
          p_auth_user_id: string;
          p_first_name: string;
          p_invite_token: string;
          p_last_name: string;
          p_profile_image_url?: string;
        };
        Returns: string;
      };
      custom_access_auth_hook: { Args: { event: Json }; Returns: Json };
      dispatch_pieces_fifo: {
        Args: {
          p_company_id: string;
          p_outward_id: string;
          p_product_id: string;
          p_quantity_to_dispatch: number;
        };
        Returns: {
          quantity_dispatched: number;
          stock_unit_id: string;
        }[];
      };
      generate_company_slug: {
        Args: { company_name: string };
        Returns: string;
      };
      generate_warehouse_slug: {
        Args: { warehouse_name: string };
        Returns: string;
      };
      get_available_pieces_quantity: {
        Args: { p_company_id: string; p_product_id: string };
        Returns: number;
      };
      get_current_user_id: { Args: never; Returns: string };
      get_job_type_suggestions: {
        Args: { company_id_param?: string; search_term?: string };
        Returns: {
          job_type: string;
          usage_count: number;
        }[];
      };
      get_jwt_all_warehouses_access: { Args: never; Returns: boolean };
      get_jwt_company_id: { Args: never; Returns: string };
      get_jwt_user_id: { Args: never; Returns: string };
      get_jwt_user_role: { Args: never; Returns: string };
      get_low_stock_products: {
        Args: { p_limit?: number; p_warehouse_id: string };
        Returns: Json[];
      };
      get_next_sequence: {
        Args: { p_company_id?: string; p_table_name: string };
        Returns: number;
      };
      get_quality_grade_suggestions: {
        Args: { company_id_param?: string; search_term?: string };
        Returns: {
          quality_grade: string;
          usage_count: number;
        }[];
      };
      get_tag_suggestions: {
        Args: { company_id_param?: string; search_term?: string };
        Returns: {
          tag: string;
          usage_count: number;
        }[];
      };
      get_user_company_id: { Args: never; Returns: string };
      has_warehouse_access: {
        Args: { warehouse_id_to_check: string };
        Returns: boolean;
      };
      quick_order_with_outward: {
        Args: {
          p_order_data: Json;
          p_order_items: Json[];
          p_stock_unit_items: Json[];
        };
        Returns: number;
      };
      recalculate_partner_order_aggregates: {
        Args: { p_partner_id: string };
        Returns: undefined;
      };
      recalculate_product_inventory_aggregates: {
        Args: { p_product_id: string; p_warehouse_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      discount_type_enum: "none" | "percentage" | "flat_amount";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      discount_type_enum: ["none", "percentage", "flat_amount"],
    },
  },
} as const;
