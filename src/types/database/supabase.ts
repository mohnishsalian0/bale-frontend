export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
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
      barcode_batch_items: {
        Row: {
          batch_id: string
          id: string
          stock_unit_id: string
        }
        Insert: {
          batch_id: string
          id?: string
          stock_unit_id: string
        }
        Update: {
          batch_id?: string
          id?: string
          stock_unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcode_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "barcode_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcode_batch_items_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "goods_inward_stock_units"
            referencedColumns: ["stock_unit_id"]
          },
          {
            foreignKeyName: "barcode_batch_items_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
        ]
      }
      barcode_batches: {
        Row: {
          batch_name: string
          company_id: string
          created_at: string
          created_by: string
          fields_selected: string[] | null
          id: string
          modified_by: string | null
          pdf_url: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          batch_name: string
          company_id: string
          created_at?: string
          created_by: string
          fields_selected?: string[] | null
          id?: string
          modified_by?: string | null
          pdf_url?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          batch_name?: string
          company_id?: string
          created_at?: string
          created_by?: string
          fields_selected?: string[] | null
          id?: string
          modified_by?: string | null
          pdf_url?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcode_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcode_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "barcode_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcode_batches_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcode_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "barcode_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "barcode_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_configurations: {
        Row: {
          accepting_orders: boolean | null
          catalog_name: string | null
          company_id: string
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          domain_slug: string | null
          favicon_url: string | null
          filter_options: Json | null
          font_family: string | null
          id: string
          logo_url: string | null
          modified_by: string | null
          primary_color: string | null
          privacy_policy: string | null
          return_policy: string | null
          secondary_color: string | null
          show_fields: Json | null
          sort_options: Json | null
          terms_conditions: string | null
          updated_at: string
        }
        Insert: {
          accepting_orders?: boolean | null
          catalog_name?: string | null
          company_id: string
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          domain_slug?: string | null
          favicon_url?: string | null
          filter_options?: Json | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          primary_color?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          secondary_color?: string | null
          show_fields?: Json | null
          sort_options?: Json | null
          terms_conditions?: string | null
          updated_at?: string
        }
        Update: {
          accepting_orders?: boolean | null
          catalog_name?: string | null
          company_id?: string
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          domain_slug?: string | null
          favicon_url?: string | null
          filter_options?: Json | null
          font_family?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          primary_color?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          secondary_color?: string | null
          show_fields?: Json | null
          sort_options?: Json | null
          terms_conditions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "catalog_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_configurations_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          gst_number: string | null
          id: string
          logo_url: string | null
          modified_by: string | null
          name: string
          pan_number: string | null
          pin_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          name: string
          pan_number?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          name?: string
          pan_number?: string | null
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goods_inwards: {
        Row: {
          agent_id: string | null
          attachments: string[] | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          from_warehouse_id: string | null
          id: string
          invoice_amount: number | null
          invoice_number: string | null
          inward_date: string
          inward_number: string
          inward_type: string
          job_work_id: string | null
          modified_by: string | null
          notes: string | null
          other_reason: string | null
          partner_id: string | null
          sales_order_id: string | null
          transport_details: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          agent_id?: string | null
          attachments?: string[] | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          from_warehouse_id?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_number?: string | null
          inward_date?: string
          inward_number: string
          inward_type: string
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          partner_id?: string | null
          sales_order_id?: string | null
          transport_details?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          from_warehouse_id?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_number?: string | null
          inward_date?: string
          inward_number?: string
          inward_type?: string
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          partner_id?: string | null
          sales_order_id?: string | null
          transport_details?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_inwards_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "goods_inwards_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "goods_inwards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_inwards_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_inwards_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_progress"
            referencedColumns: ["job_work_id"]
          },
          {
            foreignKeyName: "goods_inwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "goods_inwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "comprehensive_order_fulfillment"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "goods_inwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_status"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "goods_inwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_inwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_inwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_outward_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          outward_id: string
          quantity: number
          stock_unit_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          outward_id: string
          quantity: number
          stock_unit_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          outward_id?: string
          quantity?: number
          stock_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_outward_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outward_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "goods_outward_items_outward_id_fkey"
            columns: ["outward_id"]
            isOneToOne: false
            referencedRelation: "goods_outwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outward_items_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "goods_inward_stock_units"
            referencedColumns: ["stock_unit_id"]
          },
          {
            foreignKeyName: "goods_outward_items_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_outwards: {
        Row: {
          agent_id: string | null
          attachments: string[] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          due_date: string | null
          id: string
          invoice_amount: number | null
          invoice_number: string | null
          is_cancelled: boolean | null
          job_work_id: string | null
          modified_by: string | null
          notes: string | null
          other_reason: string | null
          outward_date: string
          outward_number: string
          outward_type: string
          partner_id: string | null
          sales_order_id: string | null
          to_warehouse_id: string | null
          transport_details: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          agent_id?: string | null
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_number?: string | null
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          outward_date?: string
          outward_number: string
          outward_type: string
          partner_id?: string | null
          sales_order_id?: string | null
          to_warehouse_id?: string | null
          transport_details?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          agent_id?: string | null
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_number?: string | null
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          outward_date?: string
          outward_number?: string
          outward_type?: string
          partner_id?: string | null
          sales_order_id?: string | null
          to_warehouse_id?: string | null
          transport_details?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_outwards_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "goods_outwards_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "goods_outwards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_progress"
            referencedColumns: ["job_work_id"]
          },
          {
            foreignKeyName: "goods_outwards_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "goods_outwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "comprehensive_order_fulfillment"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "goods_outwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_status"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "goods_outwards_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_outwards_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_outwards_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_outwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_outwards_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          role: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          role: string
          token: string
          used_at?: string | null
          used_by_user_id?: string | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          role?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "invites_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "invites_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "invites_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_work_finished_goods: {
        Row: {
          company_id: string
          created_at: string
          expected_quantity: number
          id: string
          job_work_id: string
          pending_quantity: number | null
          product_id: string
          received_quantity: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expected_quantity: number
          id?: string
          job_work_id: string
          pending_quantity?: number | null
          product_id: string
          received_quantity?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expected_quantity?: number
          id?: string
          job_work_id?: string
          pending_quantity?: number | null
          product_id?: string
          received_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_work_finished_goods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_progress"
            referencedColumns: ["job_work_id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "job_work_finished_goods_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      job_work_raw_materials: {
        Row: {
          company_id: string
          created_at: string
          dispatched_quantity: number | null
          id: string
          job_work_id: string
          pending_quantity: number | null
          product_id: string
          required_quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          job_work_id: string
          pending_quantity?: number | null
          product_id: string
          required_quantity: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          job_work_id?: string
          pending_quantity?: number | null
          product_id?: string
          required_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_work_raw_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_work_progress"
            referencedColumns: ["job_work_id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_job_work_id_fkey"
            columns: ["job_work_id"]
            isOneToOne: false
            referencedRelation: "job_works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "job_work_raw_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      job_works: {
        Row: {
          agent_id: string | null
          attachments: string[] | null
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          due_date: string | null
          id: string
          job_number: string
          job_type: string
          modified_by: string | null
          notes: string | null
          sales_order_id: string | null
          start_date: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          updated_at: string
          vendor_id: string
          warehouse_id: string
        }
        Insert: {
          agent_id?: string | null
          attachments?: string[] | null
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          job_number: string
          job_type: string
          modified_by?: string | null
          notes?: string | null
          sales_order_id?: string | null
          start_date: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          updated_at?: string
          vendor_id: string
          warehouse_id: string
        }
        Update: {
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          job_number?: string
          job_type?: string
          modified_by?: string | null
          notes?: string | null
          sales_order_id?: string | null
          start_date?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          updated_at?: string
          vendor_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_works_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "job_works_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "job_works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "comprehensive_order_fulfillment"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_status"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "job_works_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          company_name: string | null
          country: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          email: string | null
          first_name: string
          gst_number: string | null
          id: string
          last_name: string
          modified_by: string | null
          notes: string | null
          pan_number: string | null
          partner_type: string
          phone_number: string
          pin_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          email?: string | null
          first_name: string
          gst_number?: string | null
          id?: string
          last_name: string
          modified_by?: string | null
          notes?: string | null
          pan_number?: string | null
          partner_type: string
          phone_number: string
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          gst_number?: string | null
          id?: string
          last_name?: string
          modified_by?: string | null
          notes?: string | null
          pan_number?: string | null
          partner_type?: string
          phone_number?: string
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_items: {
        Row: {
          display_order: number | null
          id: string
          product_id: string
          variant_id: string
          variant_value: string
        }
        Insert: {
          display_order?: number | null
          id?: string
          product_id: string
          variant_id: string
          variant_value: string
        }
        Update: {
          display_order?: number | null
          id?: string
          product_id?: string
          variant_id?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variant_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          company_id: string
          created_at: string
          display_order: number | null
          id: string
          updated_at: string
          variant_name: string
          variant_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          variant_name: string
          variant_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          updated_at?: string
          variant_name?: string
          variant_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      products: {
        Row: {
          color: string | null
          color_hex: string | null
          company_id: string
          cost_price_per_unit: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          gsm: number | null
          hsn_code: string | null
          id: string
          material: string | null
          measuring_unit: string
          min_stock_alert: boolean | null
          min_stock_threshold: number | null
          modified_by: string | null
          name: string
          notes: string | null
          product_images: string[] | null
          product_number: string
          selling_price_per_unit: number | null
          show_on_catalog: boolean | null
          tags: string[] | null
          thread_count_cm: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          company_id: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          gsm?: number | null
          hsn_code?: string | null
          id?: string
          material?: string | null
          measuring_unit: string
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name: string
          notes?: string | null
          product_images?: string[] | null
          product_number: string
          selling_price_per_unit?: number | null
          show_on_catalog?: boolean | null
          tags?: string[] | null
          thread_count_cm?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          company_id?: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          gsm?: number | null
          hsn_code?: string | null
          id?: string
          material?: string | null
          measuring_unit?: string
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name?: string
          notes?: string | null
          product_images?: string[] | null
          product_number?: string
          selling_price_per_unit?: number | null
          show_on_catalog?: boolean | null
          tags?: string[] | null
          thread_count_cm?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          company_id: string
          created_at: string
          dispatched_quantity: number | null
          id: string
          line_total: number | null
          notes: string | null
          pending_quantity: number | null
          product_id: string
          required_quantity: number
          sales_order_id: string
          unit_rate: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          pending_quantity?: number | null
          product_id: string
          required_quantity: number
          sales_order_id: string
          unit_rate?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          pending_quantity?: number | null
          product_id?: string
          required_quantity?: number
          sales_order_id?: string
          unit_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "comprehensive_order_fulfillment"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_status"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          advance_amount: number | null
          agent_id: string | null
          attachments: string[] | null
          company_id: string
          created_at: string
          created_by: string
          customer_id: string
          deleted_at: string | null
          discount_percentage: number | null
          expected_delivery_date: string | null
          fulfillment_warehouse_id: string | null
          id: string
          modified_by: string | null
          notes: string | null
          order_date: string
          order_number: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id: string
          created_at?: string
          created_by: string
          customer_id: string
          deleted_at?: string | null
          discount_percentage?: number | null
          expected_delivery_date?: string | null
          fulfillment_warehouse_id?: string | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          deleted_at?: string | null
          discount_percentage?: number | null
          expected_delivery_date?: string | null
          fulfillment_warehouse_id?: string | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sales_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_fulfillment_warehouse_id_fkey"
            columns: ["fulfillment_warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_orders_fulfillment_warehouse_id_fkey"
            columns: ["fulfillment_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_orders_fulfillment_warehouse_id_fkey"
            columns: ["fulfillment_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_units: {
        Row: {
          barcode_generated: boolean | null
          barcode_generated_at: string | null
          company_id: string
          created_at: string
          created_by: string
          created_from_inward_id: string | null
          deleted_at: string | null
          id: string
          initial_quantity: number
          location_description: string | null
          manufacturing_date: string | null
          modified_by: string | null
          notes: string | null
          product_id: string
          qr_code: string | null
          quality_grade: string | null
          remaining_quantity: number
          status: string
          supplier_number: string | null
          unit_number: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          barcode_generated?: boolean | null
          barcode_generated_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          id?: string
          initial_quantity: number
          location_description?: string | null
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id: string
          qr_code?: string | null
          quality_grade?: string | null
          remaining_quantity: number
          status?: string
          supplier_number?: string | null
          unit_number: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          barcode_generated?: boolean | null
          barcode_generated_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          id?: string
          initial_quantity?: number
          location_description?: string | null
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id?: string
          qr_code?: string | null
          quality_grade?: string | null
          remaining_quantity?: number
          status?: string
          supplier_number?: string | null
          unit_number?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_unit_inward"
            columns: ["created_from_inward_id"]
            isOneToOne: false
            referencedRelation: "goods_inward_stock_units"
            referencedColumns: ["inward_id"]
          },
          {
            foreignKeyName: "fk_stock_unit_inward"
            columns: ["created_from_inward_id"]
            isOneToOne: false
            referencedRelation: "goods_inwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "stock_units_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_units_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_units_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_units_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          additional_notes: string | null
          auth_user_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          modified_by: string | null
          phone_number: string | null
          profile_image_url: string | null
          role: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          auth_user_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          modified_by?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          role: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          auth_user_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          modified_by?: string | null
          phone_number?: string | null
          profile_image_url?: string | null
          role?: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "fk_user_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "fk_user_warehouse"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          modified_by: string | null
          name: string
          pin_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          modified_by?: string | null
          name: string
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          modified_by?: string | null
          name?: string
          pin_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "warehouses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_performance_metrics: {
        Row: {
          active_job_works: number | null
          catalog_status: string | null
          company_id: string | null
          company_name: string | null
          domain_slug: string | null
          inwards_last_30_days: number | null
          job_works_last_30_days: number | null
          last_activity_at: string | null
          outwards_last_30_days: number | null
          pending_orders: number | null
          sales_orders_last_30_days: number | null
          sales_value_last_30_days: number | null
          total_partners: number | null
          total_products: number | null
          total_stock_units: number | null
          total_users: number | null
          total_warehouses: number | null
        }
        Relationships: []
      }
      comprehensive_order_fulfillment: {
        Row: {
          active_dispatches: number | null
          advance_amount: number | null
          company_id: string | null
          completed_job_works: number | null
          customer_company: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_percentage: number | null
          expected_delivery_date: string | null
          fulfillment_percentage: number | null
          fulfillment_warehouse: string | null
          last_activity_at: string | null
          linked_job_works: number | null
          order_date: string | null
          order_number: string | null
          order_status: string | null
          sales_order_id: string | null
          total_amount: number | null
          total_dispatched_qty: number | null
          total_dispatches: number | null
          total_pending_qty: number | null
          total_required_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      goods_inward_stock_units: {
        Row: {
          barcode_generated: boolean | null
          color: string | null
          inward_date: string | null
          inward_id: string | null
          inward_number: string | null
          location_description: string | null
          manufacturing_date: string | null
          material: string | null
          measuring_unit: string | null
          product_name: string | null
          qr_code: string | null
          quality_grade: string | null
          remaining_quantity: number | null
          status: string | null
          stock_unit_id: string | null
          unit_number: string | null
        }
        Relationships: []
      }
      inventory_movement_audit_trail: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          direction: string | null
          invoice_amount: number | null
          inward_type: string | null
          items_count: number | null
          job_work_id: string | null
          movement_type: string | null
          other_reason: string | null
          partner_name: string | null
          partner_type: string | null
          sales_order_id: string | null
          total_quantity: number | null
          transaction_date: string | null
          transaction_id: string | null
          transaction_number: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      inventory_summary: {
        Row: {
          color: string | null
          company_id: string | null
          dispatched_units: number | null
          in_stock_quantity: number | null
          in_stock_units: number | null
          material: string | null
          measuring_unit: string | null
          product_id: string | null
          product_name: string | null
          product_number: string | null
          removed_units: number | null
          total_quantity: number | null
          total_units: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      job_work_details: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          attachments: string[] | null
          company_id: string | null
          completion_percentage: number | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          finished_goods_count: number | null
          id: string | null
          job_number: string | null
          job_type: string | null
          modified_by: string | null
          notes: string | null
          raw_materials_count: number | null
          sales_order_id: string | null
          start_date: string | null
          status: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          total_finished_expected: number | null
          total_finished_pending: number | null
          total_finished_received: number | null
          total_raw_dispatched: number | null
          total_raw_pending: number | null
          total_raw_required: number | null
          updated_at: string | null
          vendor_company: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_works_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "job_works_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "job_works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "comprehensive_order_fulfillment"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order_status"
            referencedColumns: ["sales_order_id"]
          },
          {
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partner_transaction_summary"
            referencedColumns: ["partner_id"]
          },
          {
            foreignKeyName: "job_works_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "inventory_summary"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouse_activity_dashboard"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "job_works_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      job_work_progress: {
        Row: {
          company_id: string | null
          completion_percentage: number | null
          due_date: string | null
          finished_expected_qty: number | null
          finished_pending_qty: number | null
          finished_received_qty: number | null
          job_number: string | null
          job_type: string | null
          job_work_id: string | null
          raw_dispatched_qty: number | null
          raw_pending_qty: number | null
          raw_required_qty: number | null
          start_date: string | null
          status: string | null
          vendor_company: string | null
          vendor_name: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_works_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      partner_transaction_summary: {
        Row: {
          company_id: string | null
          company_name: string | null
          completed_job_works: number | null
          completed_sales_orders: number | null
          days_since_last_activity: number | null
          email: string | null
          goods_inward_from: number | null
          goods_outward_to: number | null
          goods_outward_via_agent: number | null
          last_transaction_at: string | null
          partner_id: string | null
          partner_name: string | null
          partner_type: string | null
          phone_number: string | null
          total_job_works: number | null
          total_sales_orders: number | null
          total_sales_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      sales_order_status: {
        Row: {
          company_id: string | null
          completion_percentage: number | null
          customer_company: string | null
          customer_name: string | null
          expected_delivery_date: string | null
          order_date: string | null
          order_number: string | null
          sales_order_id: string | null
          status: string | null
          total_amount: number | null
          total_dispatched_qty: number | null
          total_items: number | null
          total_pending_qty: number | null
          total_required_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
      warehouse_activity_dashboard: {
        Row: {
          active_job_works: number | null
          assigned_staff_count: number | null
          available_units: number | null
          company_id: string | null
          dispatched_units: number | null
          inwards_last_30_days: number | null
          job_works_last_30_days: number | null
          last_activity_at: string | null
          outwards_last_30_days: number | null
          pending_sales_orders: number | null
          total_stock_units: number | null
          units_without_barcodes: number | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_performance_metrics"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_tokens: { Args: never; Returns: number }
      create_goods_inward_with_units: {
        Args: { p_inward_data: Json; p_stock_units: Json[] }
        Returns: Json
      }
      create_goods_outward_with_items: {
        Args: { p_outward_data: Json; p_stock_unit_items: Json[] }
        Returns: Json
      }
      generate_sequence_number: {
        Args: { company_uuid: string; prefix: string; table_name: string }
        Returns: string
      }
      get_job_type_suggestions: {
        Args: { company_id_param?: string; search_term?: string }
        Returns: {
          job_type: string
          usage_count: number
        }[]
      }
      get_quality_grade_suggestions: {
        Args: { company_id_param?: string; search_term?: string }
        Returns: {
          quality_grade: string
          usage_count: number
        }[]
      }
      get_tag_suggestions: {
        Args: { company_id_param?: string; search_term?: string }
        Returns: {
          tag: string
          usage_count: number
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      get_user_warehouse_id: { Args: never; Returns: string }
      is_company_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

