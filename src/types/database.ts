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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
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
            referencedRelation: "partners"
            referencedColumns: ["id"]
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
          quantity_dispatched: number
          stock_unit_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          outward_id: string
          quantity_dispatched: number
          stock_unit_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          outward_id?: string
          quantity_dispatched?: number
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
            referencedRelation: "partners"
            referencedColumns: ["id"]
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
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
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
          company_name: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          role: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          role: string
          token: string
          used_at?: string | null
          used_by_user_id?: string | null
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          role?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
          warehouse_id?: string | null
          warehouse_name?: string | null
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
            referencedRelation: "partners"
            referencedColumns: ["id"]
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
          image_url: string | null
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
          image_url?: string | null
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
          image_url?: string | null
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
        ]
      }
      products: {
        Row: {
          color_hex: string | null
          color_name: string | null
          company_id: string
          cost_price_per_unit: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          gsm: number | null
          hsn_code: string | null
          id: string
          material: string | null
          measuring_unit: string | null
          min_stock_alert: boolean | null
          min_stock_threshold: number | null
          modified_by: string | null
          name: string
          notes: string | null
          product_images: string[] | null
          product_number: string
          selling_price_per_unit: number | null
          show_on_catalog: boolean | null
          stock_type: string
          tags: string[] | null
          thread_count_cm: number | null
          updated_at: string
        }
        Insert: {
          color_hex?: string | null
          color_name?: string | null
          company_id: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          gsm?: number | null
          hsn_code?: string | null
          id?: string
          material?: string | null
          measuring_unit?: string | null
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name: string
          notes?: string | null
          product_images?: string[] | null
          product_number: string
          selling_price_per_unit?: number | null
          show_on_catalog?: boolean | null
          stock_type: string
          tags?: string[] | null
          thread_count_cm?: number | null
          updated_at?: string
        }
        Update: {
          color_hex?: string | null
          color_name?: string | null
          company_id?: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          gsm?: number | null
          hsn_code?: string | null
          id?: string
          material?: string | null
          measuring_unit?: string | null
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name?: string
          notes?: string | null
          product_images?: string[] | null
          product_number?: string
          selling_price_per_unit?: number | null
          show_on_catalog?: boolean | null
          stock_type?: string
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
            referencedRelation: "partners"
            referencedColumns: ["id"]
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
          barcode_generated_at: string | null
          company_id: string
          created_at: string
          created_by: string
          created_from_inward_id: string | null
          deleted_at: string | null
          id: string
          initial_quantity: number
          manufacturing_date: string | null
          modified_by: string | null
          notes: string | null
          product_id: string
          quality_grade: string | null
          remaining_quantity: number
          status: string
          supplier_number: string | null
          unit_number: string
          updated_at: string
          warehouse_id: string
          warehouse_location: string | null
        }
        Insert: {
          barcode_generated_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          id?: string
          initial_quantity: number
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id: string
          quality_grade?: string | null
          remaining_quantity: number
          status?: string
          supplier_number?: string | null
          unit_number: string
          updated_at?: string
          warehouse_id: string
          warehouse_location?: string | null
        }
        Update: {
          barcode_generated_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          id?: string
          initial_quantity?: number
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id?: string
          quality_grade?: string | null
          remaining_quantity?: number
          status?: string
          supplier_number?: string | null
          unit_number?: string
          updated_at?: string
          warehouse_id?: string
          warehouse_location?: string | null
        }
        Relationships: [
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
            referencedRelation: "products"
            referencedColumns: ["id"]
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
        ]
      }
      warehouses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_id: string
          contact_name: string | null
          contact_number: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          image_url: string | null
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
          contact_name?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
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
          contact_name?: string | null
          contact_number?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          image_url?: string | null
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
      [_ in never]: never
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
      create_qr_batch_with_items: {
        Args: { p_batch_data: Json; p_stock_unit_ids: string[] }
        Returns: Json
      }
      dispatch_pieces_fifo: {
        Args: {
          p_company_id: string
          p_outward_id: string
          p_product_id: string
          p_quantity_to_dispatch: number
        }
        Returns: {
          quantity_dispatched: number
          stock_unit_id: string
        }[]
      }
      generate_sequence_number: {
        Args: { company_uuid: string; prefix: string; table_name: string }
        Returns: string
      }
      get_available_pieces_quantity: {
        Args: { p_company_id: string; p_product_id: string }
        Returns: number
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

