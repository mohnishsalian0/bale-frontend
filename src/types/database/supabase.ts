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
      adjustment_note_items: {
        Row: {
          adjustment_note_id: string
          amount: number | null
          cgst_amount: number | null
          cgst_rate: number | null
          company_id: string
          created_at: string
          gst_rate: number | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          notes: string | null
          product_hsn_code: string | null
          product_id: string
          product_measuring_unit: string | null
          product_name: string | null
          product_stock_type: string | null
          quantity: number
          rate: number
          sgst_amount: number | null
          sgst_rate: number | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"]
          total_tax_amount: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          adjustment_note_id: string
          amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          company_id?: string
          created_at?: string
          gst_rate?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          notes?: string | null
          product_hsn_code?: string | null
          product_id: string
          product_measuring_unit?: string | null
          product_name?: string | null
          product_stock_type?: string | null
          quantity: number
          rate: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"]
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          adjustment_note_id?: string
          amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          company_id?: string
          created_at?: string
          gst_rate?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          notes?: string | null
          product_hsn_code?: string | null
          product_id?: string
          product_measuring_unit?: string | null
          product_name?: string | null
          product_stock_type?: string | null
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"]
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_note_items_adjustment_note_id_fkey"
            columns: ["adjustment_note_id"]
            isOneToOne: false
            referencedRelation: "adjustment_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_note_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      adjustment_notes: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type: Database["public"]["Enums"]["adjustment_type_enum"]
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_address_line1: string | null
          company_address_line2: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_gst_number: string | null
          company_id: string
          company_name: string | null
          company_pan_number: string | null
          company_phone: string | null
          company_pincode: string | null
          company_state: string | null
          counter_ledger_id: string
          counter_ledger_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          exported_to_tally_at: string | null
          id: string
          invoice_id: string
          is_cancelled: boolean
          modified_by: string | null
          notes: string | null
          party_address_line1: string | null
          party_address_line2: string | null
          party_city: string | null
          party_country: string | null
          party_display_name: string | null
          party_email: string | null
          party_gst_number: string | null
          party_ledger_id: string
          party_ledger_name: string | null
          party_name: string | null
          party_pan_number: string | null
          party_phone: string | null
          party_pincode: string | null
          party_state: string | null
          reason: string
          round_off_amount: number | null
          search_vector: unknown
          sequence_number: number
          slug: string
          subtotal_amount: number | null
          tally_guid: string | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount: number | null
          total_cgst_amount: number | null
          total_igst_amount: number | null
          total_sgst_amount: number | null
          total_tax_amount: number | null
          updated_at: string
          warehouse_address_line1: string | null
          warehouse_address_line2: string | null
          warehouse_city: string | null
          warehouse_country: string | null
          warehouse_id: string
          warehouse_name: string | null
          warehouse_pincode: string | null
          warehouse_state: string | null
        }
        Insert: {
          adjustment_date?: string
          adjustment_number: string
          adjustment_type: Database["public"]["Enums"]["adjustment_type_enum"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gst_number?: string | null
          company_id?: string
          company_name?: string | null
          company_pan_number?: string | null
          company_phone?: string | null
          company_pincode?: string | null
          company_state?: string | null
          counter_ledger_id: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exported_to_tally_at?: string | null
          id?: string
          invoice_id: string
          is_cancelled?: boolean
          modified_by?: string | null
          notes?: string | null
          party_address_line1?: string | null
          party_address_line2?: string | null
          party_city?: string | null
          party_country?: string | null
          party_display_name?: string | null
          party_email?: string | null
          party_gst_number?: string | null
          party_ledger_id: string
          party_ledger_name?: string | null
          party_name?: string | null
          party_pan_number?: string | null
          party_phone?: string | null
          party_pincode?: string | null
          party_state?: string | null
          reason: string
          round_off_amount?: number | null
          search_vector?: unknown
          sequence_number: number
          slug: string
          subtotal_amount?: number | null
          tally_guid?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_address_line1?: string | null
          warehouse_address_line2?: string | null
          warehouse_city?: string | null
          warehouse_country?: string | null
          warehouse_id: string
          warehouse_name?: string | null
          warehouse_pincode?: string | null
          warehouse_state?: string | null
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          adjustment_type?: Database["public"]["Enums"]["adjustment_type_enum"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gst_number?: string | null
          company_id?: string
          company_name?: string | null
          company_pan_number?: string | null
          company_phone?: string | null
          company_pincode?: string | null
          company_state?: string | null
          counter_ledger_id?: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exported_to_tally_at?: string | null
          id?: string
          invoice_id?: string
          is_cancelled?: boolean
          modified_by?: string | null
          notes?: string | null
          party_address_line1?: string | null
          party_address_line2?: string | null
          party_city?: string | null
          party_country?: string | null
          party_display_name?: string | null
          party_email?: string | null
          party_gst_number?: string | null
          party_ledger_id?: string
          party_ledger_name?: string | null
          party_name?: string | null
          party_pan_number?: string | null
          party_phone?: string | null
          party_pincode?: string | null
          party_state?: string | null
          reason?: string
          round_off_amount?: number | null
          search_vector?: unknown
          sequence_number?: number
          slug?: string
          subtotal_amount?: number | null
          tally_guid?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_address_line1?: string | null
          warehouse_address_line2?: string | null
          warehouse_city?: string | null
          warehouse_country?: string | null
          warehouse_id?: string
          warehouse_name?: string | null
          warehouse_pincode?: string | null
          warehouse_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_counter_ledger_id_fkey"
            columns: ["counter_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_party_ledger_id_fkey"
            columns: ["party_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_notes_warehouse_id_fkey"
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
          created_by: string | null
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
          company_id?: string
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
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
          created_by?: string | null
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
          email: string | null
          gst_number: string | null
          id: string
          logo_url: string | null
          modified_by: string | null
          name: string
          pan_number: string | null
          phone_number: string | null
          pin_code: string | null
          slug: string
          state: string | null
          updated_at: string
          website_url: string | null
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
          email?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          name: string
          pan_number?: string | null
          phone_number?: string | null
          pin_code?: string | null
          slug: string
          state?: string | null
          updated_at?: string
          website_url?: string | null
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
          email?: string | null
          gst_number?: string | null
          id?: string
          logo_url?: string | null
          modified_by?: string | null
          name?: string
          pan_number?: string | null
          phone_number?: string | null
          pin_code?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      goods_inwards: {
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
          expected_delivery_date: string | null
          from_warehouse_id: string | null
          has_invoice: boolean | null
          id: string
          inward_date: string
          inward_type: string
          is_cancelled: boolean | null
          job_work_id: string | null
          modified_by: string | null
          notes: string | null
          other_reason: string | null
          partner_id: string | null
          purchase_order_id: string | null
          sales_order_id: string | null
          search_vector: unknown
          sequence_number: number
          transport_reference_number: string | null
          transport_type: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          agent_id?: string | null
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          expected_delivery_date?: string | null
          from_warehouse_id?: string | null
          has_invoice?: boolean | null
          id?: string
          inward_date?: string
          inward_type: string
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          partner_id?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          search_vector?: unknown
          sequence_number: number
          transport_reference_number?: string | null
          transport_type?: string | null
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
          expected_delivery_date?: string | null
          from_warehouse_id?: string | null
          has_invoice?: boolean | null
          id?: string
          inward_date?: string
          inward_type?: string
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          partner_id?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          search_vector?: unknown
          sequence_number?: number
          transport_reference_number?: string | null
          transport_type?: string | null
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
            foreignKeyName: "goods_inwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_inwards_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
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
          cancelled_at: string | null
          company_id: string
          created_at: string
          id: string
          is_cancelled: boolean
          outward_id: string
          quantity_dispatched: number
          stock_unit_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_cancelled?: boolean
          outward_id: string
          quantity_dispatched: number
          stock_unit_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_cancelled?: boolean
          outward_id?: string
          quantity_dispatched?: number
          stock_unit_id?: string
          updated_at?: string
          warehouse_id?: string
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
          {
            foreignKeyName: "goods_outward_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          expected_delivery_date: string | null
          has_invoice: boolean | null
          id: string
          is_cancelled: boolean | null
          job_work_id: string | null
          modified_by: string | null
          notes: string | null
          other_reason: string | null
          outward_date: string
          outward_type: string
          partner_id: string | null
          purchase_order_id: string | null
          sales_order_id: string | null
          search_vector: unknown
          sequence_number: number
          to_warehouse_id: string | null
          transport_reference_number: string | null
          transport_type: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          agent_id?: string | null
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_id?: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          expected_delivery_date?: string | null
          has_invoice?: boolean | null
          id?: string
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          outward_date?: string
          outward_type: string
          partner_id?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          search_vector?: unknown
          sequence_number: number
          to_warehouse_id?: string | null
          transport_reference_number?: string | null
          transport_type?: string | null
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
          expected_delivery_date?: string | null
          has_invoice?: boolean | null
          id?: string
          is_cancelled?: boolean | null
          job_work_id?: string | null
          modified_by?: string | null
          notes?: string | null
          other_reason?: string | null
          outward_date?: string
          outward_type?: string
          partner_id?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          search_vector?: unknown
          sequence_number?: number
          to_warehouse_id?: string | null
          transport_reference_number?: string | null
          transport_type?: string | null
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
            foreignKeyName: "goods_outwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "goods_outwards_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_outwards_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
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
      invite_warehouses: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invite_id: string
          warehouse_id: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          invite_id: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invite_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_warehouses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          all_warehouses_access: boolean
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
        }
        Insert: {
          all_warehouses_access?: boolean
          company_id?: string
          company_name: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          role: string
          token: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          all_warehouses_access?: boolean
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
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_inwards: {
        Row: {
          company_id: string
          created_at: string
          goods_inward_id: string
          id: string
          invoice_id: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          goods_inward_id: string
          id?: string
          invoice_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          goods_inward_id?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_inwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_inwards_goods_inward_id_fkey"
            columns: ["goods_inward_id"]
            isOneToOne: false
            referencedRelation: "goods_inwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_inwards_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number | null
          cgst_amount: number | null
          cgst_rate: number | null
          company_id: string
          created_at: string
          discount_amount: number | null
          discount_type: Database["public"]["Enums"]["discount_type_enum"]
          discount_value: number | null
          gst_rate: number | null
          id: string
          igst_amount: number | null
          igst_rate: number | null
          invoice_id: string
          notes: string | null
          product_hsn_code: string | null
          product_id: string
          product_measuring_unit: string | null
          product_name: string | null
          product_stock_type: string | null
          quantity: number
          rate: number
          sgst_amount: number | null
          sgst_rate: number | null
          tax_type: Database["public"]["Enums"]["product_tax_applicability_enum"]
          taxable_amount: number | null
          total_tax_amount: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          company_id?: string
          created_at?: string
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_rate?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_id: string
          notes?: string | null
          product_hsn_code?: string | null
          product_id: string
          product_measuring_unit?: string | null
          product_name?: string | null
          product_stock_type?: string | null
          quantity: number
          rate: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          tax_type: Database["public"]["Enums"]["product_tax_applicability_enum"]
          taxable_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          amount?: number | null
          cgst_amount?: number | null
          cgst_rate?: number | null
          company_id?: string
          created_at?: string
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_rate?: number | null
          id?: string
          igst_amount?: number | null
          igst_rate?: number | null
          invoice_id?: string
          notes?: string | null
          product_hsn_code?: string | null
          product_id?: string
          product_measuring_unit?: string | null
          product_name?: string | null
          product_stock_type?: string | null
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          sgst_rate?: number | null
          tax_type?: Database["public"]["Enums"]["product_tax_applicability_enum"]
          taxable_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_outwards: {
        Row: {
          company_id: string
          created_at: string
          goods_outward_id: string
          id: string
          invoice_id: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          goods_outward_id: string
          id?: string
          invoice_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          goods_outward_id?: string
          id?: string
          invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_outwards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_outwards_goods_outward_id_fkey"
            columns: ["goods_outward_id"]
            isOneToOne: false
            referencedRelation: "goods_outwards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_outwards_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          attachments: string[] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          company_address_line1: string | null
          company_address_line2: string | null
          company_city: string | null
          company_country: string | null
          company_email: string | null
          company_gst_number: string | null
          company_id: string
          company_logo_url: string | null
          company_name: string | null
          company_pan_number: string | null
          company_phone: string | null
          company_pincode: string | null
          company_state: string | null
          company_website_url: string | null
          counter_ledger_id: string
          counter_ledger_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          direct_tax_amount: number | null
          direct_tax_rate: number | null
          direct_tax_type: Database["public"]["Enums"]["direct_tax_type_enum"]
          discount_amount: number | null
          discount_type: Database["public"]["Enums"]["discount_type_enum"]
          discount_value: number | null
          due_date: string | null
          exported_to_tally_at: string | null
          has_adjustment: boolean
          has_payment: boolean | null
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
          is_cancelled: boolean
          modified_by: string | null
          notes: string | null
          outstanding_amount: number | null
          party_billing_address_line1: string | null
          party_billing_address_line2: string | null
          party_billing_city: string | null
          party_billing_country: string | null
          party_billing_pincode: string | null
          party_billing_state: string | null
          party_display_name: string | null
          party_email: string | null
          party_gst_number: string | null
          party_ledger_id: string
          party_ledger_name: string | null
          party_name: string | null
          party_pan_number: string | null
          party_phone: string | null
          party_shipping_address_line1: string | null
          party_shipping_address_line2: string | null
          party_shipping_city: string | null
          party_shipping_country: string | null
          party_shipping_pincode: string | null
          party_shipping_state: string | null
          payment_terms: string | null
          round_off_amount: number | null
          search_vector: unknown
          sequence_number: number
          slug: string
          source: string
          source_purchase_order_id: string | null
          source_sales_order_id: string | null
          status: string
          subtotal_amount: number | null
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          tally_export_error: string | null
          tally_export_status: string | null
          tally_guid: string | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"] | null
          taxable_amount: number | null
          total_amount: number | null
          total_cgst_amount: number | null
          total_igst_amount: number | null
          total_sgst_amount: number | null
          total_tax_amount: number | null
          updated_at: string
          warehouse_address_line1: string | null
          warehouse_address_line2: string | null
          warehouse_city: string | null
          warehouse_country: string | null
          warehouse_id: string
          warehouse_name: string | null
          warehouse_pincode: string | null
          warehouse_state: string | null
        }
        Insert: {
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gst_number?: string | null
          company_id?: string
          company_logo_url?: string | null
          company_name?: string | null
          company_pan_number?: string | null
          company_phone?: string | null
          company_pincode?: string | null
          company_state?: string | null
          company_website_url?: string | null
          counter_ledger_id: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direct_tax_amount?: number | null
          direct_tax_rate?: number | null
          direct_tax_type?: Database["public"]["Enums"]["direct_tax_type_enum"]
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          due_date?: string | null
          exported_to_tally_at?: string | null
          has_adjustment?: boolean
          has_payment?: boolean | null
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type_enum"]
          is_cancelled?: boolean
          modified_by?: string | null
          notes?: string | null
          outstanding_amount?: number | null
          party_billing_address_line1?: string | null
          party_billing_address_line2?: string | null
          party_billing_city?: string | null
          party_billing_country?: string | null
          party_billing_pincode?: string | null
          party_billing_state?: string | null
          party_display_name?: string | null
          party_email?: string | null
          party_gst_number?: string | null
          party_ledger_id: string
          party_ledger_name?: string | null
          party_name?: string | null
          party_pan_number?: string | null
          party_phone?: string | null
          party_shipping_address_line1?: string | null
          party_shipping_address_line2?: string | null
          party_shipping_city?: string | null
          party_shipping_country?: string | null
          party_shipping_pincode?: string | null
          party_shipping_state?: string | null
          payment_terms?: string | null
          round_off_amount?: number | null
          search_vector?: unknown
          sequence_number: number
          slug: string
          source?: string
          source_purchase_order_id?: string | null
          source_sales_order_id?: string | null
          status?: string
          subtotal_amount?: number | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          tally_export_error?: string | null
          tally_export_status?: string | null
          tally_guid?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_address_line1?: string | null
          warehouse_address_line2?: string | null
          warehouse_city?: string | null
          warehouse_country?: string | null
          warehouse_id: string
          warehouse_name?: string | null
          warehouse_pincode?: string | null
          warehouse_state?: string | null
        }
        Update: {
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          company_address_line1?: string | null
          company_address_line2?: string | null
          company_city?: string | null
          company_country?: string | null
          company_email?: string | null
          company_gst_number?: string | null
          company_id?: string
          company_logo_url?: string | null
          company_name?: string | null
          company_pan_number?: string | null
          company_phone?: string | null
          company_pincode?: string | null
          company_state?: string | null
          company_website_url?: string | null
          counter_ledger_id?: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          direct_tax_amount?: number | null
          direct_tax_rate?: number | null
          direct_tax_type?: Database["public"]["Enums"]["direct_tax_type_enum"]
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          due_date?: string | null
          exported_to_tally_at?: string | null
          has_adjustment?: boolean
          has_payment?: boolean | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type_enum"]
          is_cancelled?: boolean
          modified_by?: string | null
          notes?: string | null
          outstanding_amount?: number | null
          party_billing_address_line1?: string | null
          party_billing_address_line2?: string | null
          party_billing_city?: string | null
          party_billing_country?: string | null
          party_billing_pincode?: string | null
          party_billing_state?: string | null
          party_display_name?: string | null
          party_email?: string | null
          party_gst_number?: string | null
          party_ledger_id?: string
          party_ledger_name?: string | null
          party_name?: string | null
          party_pan_number?: string | null
          party_phone?: string | null
          party_shipping_address_line1?: string | null
          party_shipping_address_line2?: string | null
          party_shipping_city?: string | null
          party_shipping_country?: string | null
          party_shipping_pincode?: string | null
          party_shipping_state?: string | null
          payment_terms?: string | null
          round_off_amount?: number | null
          search_vector?: unknown
          sequence_number?: number
          slug?: string
          source?: string
          source_purchase_order_id?: string | null
          source_sales_order_id?: string | null
          status?: string
          subtotal_amount?: number | null
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          tally_export_error?: string | null
          tally_export_status?: string | null
          tally_guid?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          taxable_amount?: number | null
          total_amount?: number | null
          total_cgst_amount?: number | null
          total_igst_amount?: number | null
          total_sgst_amount?: number | null
          total_tax_amount?: number | null
          updated_at?: string
          warehouse_address_line1?: string | null
          warehouse_address_line2?: string | null
          warehouse_city?: string | null
          warehouse_country?: string | null
          warehouse_id?: string
          warehouse_name?: string | null
          warehouse_pincode?: string | null
          warehouse_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_counter_ledger_id_fkey"
            columns: ["counter_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_party_ledger_id_fkey"
            columns: ["party_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_purchase_order_id_fkey"
            columns: ["source_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_sales_order_id_fkey"
            columns: ["source_sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_warehouse_id_fkey"
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
          warehouse_id: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          expected_quantity: number
          id?: string
          job_work_id: string
          pending_quantity?: number | null
          product_id: string
          received_quantity?: number | null
          updated_at?: string
          warehouse_id: string
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
          warehouse_id?: string
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
          {
            foreignKeyName: "job_work_finished_goods_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          warehouse_id: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          job_work_id: string
          pending_quantity?: number | null
          product_id: string
          required_quantity: number
          updated_at?: string
          warehouse_id: string
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
          warehouse_id?: string
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
          {
            foreignKeyName: "job_work_raw_materials_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          job_type: string
          modified_by: string | null
          notes: string | null
          sales_order_id: string | null
          sequence_number: number
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
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          job_type: string
          modified_by?: string | null
          notes?: string | null
          sales_order_id?: string | null
          sequence_number: number
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
          job_type?: string
          modified_by?: string | null
          notes?: string | null
          sales_order_id?: string | null
          sequence_number?: number
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
            foreignKeyName: "job_works_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
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
      ledgers: {
        Row: {
          account_number: string | null
          bank_name: string | null
          branch_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dr_cr: Database["public"]["Enums"]["dr_cr_enum"] | null
          exported_to_tally_at: string | null
          gst_applicable: boolean | null
          gst_rate: number | null
          gst_type: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_bill_wise: boolean | null
          is_default: boolean | null
          ledger_type: Database["public"]["Enums"]["ledger_type_enum"]
          modified_by: string | null
          name: string
          opening_balance: number | null
          parent_group_id: string
          partner_id: string | null
          system_name: string | null
          tally_guid: string | null
          tds_applicable: boolean | null
          tds_rate: number | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dr_cr?: Database["public"]["Enums"]["dr_cr_enum"] | null
          exported_to_tally_at?: string | null
          gst_applicable?: boolean | null
          gst_rate?: number | null
          gst_type?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_bill_wise?: boolean | null
          is_default?: boolean | null
          ledger_type: Database["public"]["Enums"]["ledger_type_enum"]
          modified_by?: string | null
          name: string
          opening_balance?: number | null
          parent_group_id: string
          partner_id?: string | null
          system_name?: string | null
          tally_guid?: string | null
          tds_applicable?: boolean | null
          tds_rate?: number | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dr_cr?: Database["public"]["Enums"]["dr_cr_enum"] | null
          exported_to_tally_at?: string | null
          gst_applicable?: boolean | null
          gst_rate?: number | null
          gst_type?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_bill_wise?: boolean | null
          is_default?: boolean | null
          ledger_type?: Database["public"]["Enums"]["ledger_type_enum"]
          modified_by?: string | null
          name?: string
          opening_balance?: number | null
          parent_group_id?: string
          partner_id?: string | null
          system_name?: string | null
          tally_guid?: string | null
          tds_applicable?: boolean | null
          tds_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledgers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "parent_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledgers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_groups: {
        Row: {
          category: Database["public"]["Enums"]["parent_group_category_enum"]
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          parent_group_id: string | null
          reserved_name: string | null
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["parent_group_category_enum"]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          parent_group_id?: string | null
          reserved_name?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["parent_group_category_enum"]
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          parent_group_id?: string | null
          reserved_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "parent_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payables_aggregates: {
        Row: {
          company_id: string
          created_at: string | null
          first_invoice_date: string | null
          id: string
          invoice_count: number | null
          last_invoice_date: string | null
          last_payment_date: string | null
          last_updated_at: string | null
          partner_id: string
          total_credit_notes: number | null
          total_debit_notes: number | null
          total_invoice_amount: number | null
          total_outstanding_amount: number | null
          total_paid_amount: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          first_invoice_date?: string | null
          id?: string
          invoice_count?: number | null
          last_invoice_date?: string | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          partner_id: string
          total_credit_notes?: number | null
          total_debit_notes?: number | null
          total_invoice_amount?: number | null
          total_outstanding_amount?: number | null
          total_paid_amount?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          first_invoice_date?: string | null
          id?: string
          invoice_count?: number | null
          last_invoice_date?: string | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          partner_id?: string
          total_credit_notes?: number | null
          total_debit_notes?: number | null
          total_invoice_amount?: number | null
          total_outstanding_amount?: number | null
          total_paid_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payables_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payables_aggregates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_purchase_aggregates: {
        Row: {
          approval_pending_count: number | null
          approval_pending_value: number | null
          cancelled_count: number | null
          cancelled_value: number | null
          company_id: string
          completed_count: number | null
          completed_value: number | null
          created_at: string | null
          deleted_at: string | null
          first_order_date: string | null
          id: string
          in_progress_count: number | null
          in_progress_value: number | null
          last_order_date: string | null
          last_updated_at: string | null
          lifetime_order_value: number | null
          partner_id: string
          total_orders: number | null
        }
        Insert: {
          approval_pending_count?: number | null
          approval_pending_value?: number | null
          cancelled_count?: number | null
          cancelled_value?: number | null
          company_id: string
          completed_count?: number | null
          completed_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          lifetime_order_value?: number | null
          partner_id: string
          total_orders?: number | null
        }
        Update: {
          approval_pending_count?: number | null
          approval_pending_value?: number | null
          cancelled_count?: number | null
          cancelled_value?: number | null
          company_id?: string
          completed_count?: number | null
          completed_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          lifetime_order_value?: number | null
          partner_id?: string
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_purchase_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_purchase_aggregates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_receivables_aggregates: {
        Row: {
          company_id: string
          created_at: string | null
          first_invoice_date: string | null
          id: string
          invoice_count: number | null
          last_invoice_date: string | null
          last_payment_date: string | null
          last_updated_at: string | null
          partner_id: string
          total_credit_notes: number | null
          total_debit_notes: number | null
          total_invoice_amount: number | null
          total_outstanding_amount: number | null
          total_paid_amount: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          first_invoice_date?: string | null
          id?: string
          invoice_count?: number | null
          last_invoice_date?: string | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          partner_id: string
          total_credit_notes?: number | null
          total_debit_notes?: number | null
          total_invoice_amount?: number | null
          total_outstanding_amount?: number | null
          total_paid_amount?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          first_invoice_date?: string | null
          id?: string
          invoice_count?: number | null
          last_invoice_date?: string | null
          last_payment_date?: string | null
          last_updated_at?: string | null
          partner_id?: string
          total_credit_notes?: number | null
          total_debit_notes?: number | null
          total_invoice_amount?: number | null
          total_outstanding_amount?: number | null
          total_paid_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_receivables_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_receivables_aggregates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_sales_aggregates: {
        Row: {
          approval_pending_count: number | null
          approval_pending_value: number | null
          cancelled_count: number | null
          cancelled_value: number | null
          company_id: string
          completed_count: number | null
          completed_value: number | null
          created_at: string | null
          deleted_at: string | null
          first_order_date: string | null
          id: string
          in_progress_count: number | null
          in_progress_value: number | null
          last_order_date: string | null
          last_updated_at: string | null
          lifetime_order_value: number | null
          partner_id: string
          total_orders: number | null
        }
        Insert: {
          approval_pending_count?: number | null
          approval_pending_value?: number | null
          cancelled_count?: number | null
          cancelled_value?: number | null
          company_id: string
          completed_count?: number | null
          completed_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          lifetime_order_value?: number | null
          partner_id: string
          total_orders?: number | null
        }
        Update: {
          approval_pending_count?: number | null
          approval_pending_value?: number | null
          cancelled_count?: number | null
          cancelled_value?: number | null
          company_id?: string
          completed_count?: number | null
          completed_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          lifetime_order_value?: number | null
          partner_id?: string
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_sales_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_sales_aggregates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_pin_code: string | null
          billing_state: string | null
          company_id: string
          company_name: string
          created_at: string
          created_by: string | null
          credit_limit: number | null
          credit_limit_enabled: boolean | null
          deleted_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          gst_number: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_guest: boolean | null
          last_interaction_at: string | null
          last_name: string | null
          modified_by: string | null
          notes: string | null
          pan_number: string | null
          partner_type: string
          phone_number: string | null
          registered_at: string | null
          search_vector: unknown
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_pin_code: string | null
          shipping_same_as_billing: boolean
          shipping_state: string | null
          source: string
          updated_at: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_pin_code?: string | null
          billing_state?: string | null
          company_id?: string
          company_name: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          credit_limit_enabled?: boolean | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_guest?: boolean | null
          last_interaction_at?: string | null
          last_name?: string | null
          modified_by?: string | null
          notes?: string | null
          pan_number?: string | null
          partner_type: string
          phone_number?: string | null
          registered_at?: string | null
          search_vector?: unknown
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_pin_code?: string | null
          shipping_same_as_billing?: boolean
          shipping_state?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_pin_code?: string | null
          billing_state?: string | null
          company_id?: string
          company_name?: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          credit_limit_enabled?: boolean | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_guest?: boolean | null
          last_interaction_at?: string | null
          last_name?: string | null
          modified_by?: string | null
          notes?: string | null
          pan_number?: string | null
          partner_type?: string
          phone_number?: string | null
          registered_at?: string | null
          search_vector?: unknown
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_pin_code?: string | null
          shipping_same_as_billing?: boolean
          shipping_state?: string | null
          source?: string
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
        ]
      }
      payment_allocations: {
        Row: {
          allocation_type: Database["public"]["Enums"]["allocation_type_enum"]
          amount_applied: number
          cancelled_at: string | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          is_cancelled: boolean
          payment_id: string
          updated_at: string
        }
        Insert: {
          allocation_type: Database["public"]["Enums"]["allocation_type_enum"]
          amount_applied: number
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          is_cancelled?: boolean
          payment_id: string
          updated_at?: string
        }
        Update: {
          allocation_type?: Database["public"]["Enums"]["allocation_type_enum"]
          amount_applied?: number
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          is_cancelled?: boolean
          payment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          attachments: string[] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          card_last_four: string | null
          company_id: string
          counter_ledger_id: string
          counter_ledger_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          exported_to_tally_at: string | null
          id: string
          instrument_bank: string | null
          instrument_branch: string | null
          instrument_date: string | null
          instrument_ifsc: string | null
          instrument_number: string | null
          is_cancelled: boolean
          modified_by: string | null
          net_amount: number | null
          notes: string | null
          party_display_name: string | null
          party_gst_number: string | null
          party_ledger_id: string
          party_name: string | null
          party_pan_number: string | null
          payment_date: string
          payment_mode: Database["public"]["Enums"]["payment_mode_enum"]
          payment_number: string
          search_vector: unknown
          sequence_number: number
          slug: string
          tally_guid: string | null
          tds_amount: number | null
          tds_applicable: boolean | null
          tds_ledger_id: string | null
          tds_rate: number | null
          total_amount: number
          transaction_id: string | null
          updated_at: string
          voucher_type: Database["public"]["Enums"]["voucher_type_enum"]
          vpa: string | null
        }
        Insert: {
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_last_four?: string | null
          company_id?: string
          counter_ledger_id: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exported_to_tally_at?: string | null
          id?: string
          instrument_bank?: string | null
          instrument_branch?: string | null
          instrument_date?: string | null
          instrument_ifsc?: string | null
          instrument_number?: string | null
          is_cancelled?: boolean
          modified_by?: string | null
          net_amount?: number | null
          notes?: string | null
          party_display_name?: string | null
          party_gst_number?: string | null
          party_ledger_id: string
          party_name?: string | null
          party_pan_number?: string | null
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode_enum"]
          payment_number: string
          search_vector?: unknown
          sequence_number: number
          slug: string
          tally_guid?: string | null
          tds_amount?: number | null
          tds_applicable?: boolean | null
          tds_ledger_id?: string | null
          tds_rate?: number | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string
          voucher_type: Database["public"]["Enums"]["voucher_type_enum"]
          vpa?: string | null
        }
        Update: {
          attachments?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_last_four?: string | null
          company_id?: string
          counter_ledger_id?: string
          counter_ledger_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exported_to_tally_at?: string | null
          id?: string
          instrument_bank?: string | null
          instrument_branch?: string | null
          instrument_date?: string | null
          instrument_ifsc?: string | null
          instrument_number?: string | null
          is_cancelled?: boolean
          modified_by?: string | null
          net_amount?: number | null
          notes?: string | null
          party_display_name?: string | null
          party_gst_number?: string | null
          party_ledger_id?: string
          party_name?: string | null
          party_pan_number?: string | null
          payment_date?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode_enum"]
          payment_number?: string
          search_vector?: unknown
          sequence_number?: number
          slug?: string
          tally_guid?: string | null
          tds_amount?: number | null
          tds_applicable?: boolean | null
          tds_ledger_id?: string | null
          tds_rate?: number | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          voucher_type?: Database["public"]["Enums"]["voucher_type_enum"]
          vpa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_counter_ledger_id_fkey"
            columns: ["counter_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_party_ledger_id_fkey"
            columns: ["party_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tds_ledger_id_fkey"
            columns: ["tds_ledger_id"]
            isOneToOne: false
            referencedRelation: "ledgers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          permission_path: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          permission_path: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          permission_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_attribute_assignments: {
        Row: {
          attribute_id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_assignments_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          color_hex: string | null
          company_id: string
          created_at: string
          group_name: string
          id: string
          name: string
        }
        Insert: {
          color_hex?: string | null
          company_id?: string
          created_at?: string
          group_name: string
          id?: string
          name: string
        }
        Update: {
          color_hex?: string | null
          company_id?: string
          created_at?: string
          group_name?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory_aggregates: {
        Row: {
          company_id: string
          created_at: string | null
          deleted_at: string | null
          dispatched_quantity: number | null
          dispatched_units: number | null
          dispatched_value: number | null
          id: string
          in_stock_quantity: number | null
          in_stock_units: number | null
          in_stock_value: number | null
          is_low_stock: boolean | null
          last_updated_at: string | null
          pending_qr_units: number | null
          product_id: string
          removed_quantity: number | null
          removed_units: number | null
          removed_value: number | null
          total_quantity_received: number | null
          total_units_received: number | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          dispatched_quantity?: number | null
          dispatched_units?: number | null
          dispatched_value?: number | null
          id?: string
          in_stock_quantity?: number | null
          in_stock_units?: number | null
          in_stock_value?: number | null
          is_low_stock?: boolean | null
          last_updated_at?: string | null
          pending_qr_units?: number | null
          product_id: string
          removed_quantity?: number | null
          removed_units?: number | null
          removed_value?: number | null
          total_quantity_received?: number | null
          total_units_received?: number | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          dispatched_quantity?: number | null
          dispatched_units?: number | null
          dispatched_value?: number | null
          id?: string
          in_stock_quantity?: number | null
          in_stock_units?: number | null
          in_stock_value?: number | null
          is_low_stock?: boolean | null
          last_updated_at?: string | null
          pending_qr_units?: number | null
          product_id?: string
          removed_quantity?: number | null
          removed_units?: number | null
          removed_value?: number | null
          total_quantity_received?: number | null
          total_units_received?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_aggregates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_aggregates_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_purchase_order_aggregates: {
        Row: {
          active_pending_quantity: number | null
          active_pending_value: number | null
          active_received_quantity: number | null
          active_received_value: number | null
          active_required_quantity: number | null
          active_required_value: number | null
          approval_pending_count: number | null
          approval_pending_pending_quantity: number | null
          approval_pending_pending_value: number | null
          approval_pending_received_quantity: number | null
          approval_pending_received_value: number | null
          approval_pending_required_quantity: number | null
          approval_pending_required_value: number | null
          cancelled_count: number | null
          cancelled_pending_quantity: number | null
          cancelled_pending_value: number | null
          cancelled_received_quantity: number | null
          cancelled_received_value: number | null
          cancelled_required_quantity: number | null
          cancelled_required_value: number | null
          company_id: string
          completed_count: number | null
          completed_pending_quantity: number | null
          completed_pending_value: number | null
          completed_received_quantity: number | null
          completed_received_value: number | null
          completed_required_quantity: number | null
          completed_required_value: number | null
          created_at: string | null
          deleted_at: string | null
          first_order_date: string | null
          id: string
          in_progress_count: number | null
          in_progress_pending_quantity: number | null
          in_progress_pending_value: number | null
          in_progress_received_quantity: number | null
          in_progress_received_value: number | null
          in_progress_required_quantity: number | null
          in_progress_required_value: number | null
          last_order_date: string | null
          last_updated_at: string | null
          product_id: string
          total_orders: number | null
        }
        Insert: {
          active_pending_quantity?: number | null
          active_pending_value?: number | null
          active_received_quantity?: number | null
          active_received_value?: number | null
          active_required_quantity?: number | null
          active_required_value?: number | null
          approval_pending_count?: number | null
          approval_pending_pending_quantity?: number | null
          approval_pending_pending_value?: number | null
          approval_pending_received_quantity?: number | null
          approval_pending_received_value?: number | null
          approval_pending_required_quantity?: number | null
          approval_pending_required_value?: number | null
          cancelled_count?: number | null
          cancelled_pending_quantity?: number | null
          cancelled_pending_value?: number | null
          cancelled_received_quantity?: number | null
          cancelled_received_value?: number | null
          cancelled_required_quantity?: number | null
          cancelled_required_value?: number | null
          company_id: string
          completed_count?: number | null
          completed_pending_quantity?: number | null
          completed_pending_value?: number | null
          completed_received_quantity?: number | null
          completed_received_value?: number | null
          completed_required_quantity?: number | null
          completed_required_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_pending_quantity?: number | null
          in_progress_pending_value?: number | null
          in_progress_received_quantity?: number | null
          in_progress_received_value?: number | null
          in_progress_required_quantity?: number | null
          in_progress_required_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          product_id: string
          total_orders?: number | null
        }
        Update: {
          active_pending_quantity?: number | null
          active_pending_value?: number | null
          active_received_quantity?: number | null
          active_received_value?: number | null
          active_required_quantity?: number | null
          active_required_value?: number | null
          approval_pending_count?: number | null
          approval_pending_pending_quantity?: number | null
          approval_pending_pending_value?: number | null
          approval_pending_received_quantity?: number | null
          approval_pending_received_value?: number | null
          approval_pending_required_quantity?: number | null
          approval_pending_required_value?: number | null
          cancelled_count?: number | null
          cancelled_pending_quantity?: number | null
          cancelled_pending_value?: number | null
          cancelled_received_quantity?: number | null
          cancelled_received_value?: number | null
          cancelled_required_quantity?: number | null
          cancelled_required_value?: number | null
          company_id?: string
          completed_count?: number | null
          completed_pending_quantity?: number | null
          completed_pending_value?: number | null
          completed_received_quantity?: number | null
          completed_received_value?: number | null
          completed_required_quantity?: number | null
          completed_required_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_pending_quantity?: number | null
          in_progress_pending_value?: number | null
          in_progress_received_quantity?: number | null
          in_progress_received_value?: number | null
          in_progress_required_quantity?: number | null
          in_progress_required_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          product_id?: string
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_purchase_order_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_purchase_order_aggregates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sales_order_aggregates: {
        Row: {
          active_dispatched_quantity: number | null
          active_dispatched_value: number | null
          active_pending_quantity: number | null
          active_pending_value: number | null
          active_required_quantity: number | null
          active_required_value: number | null
          approval_pending_count: number | null
          approval_pending_dispatched_quantity: number | null
          approval_pending_dispatched_value: number | null
          approval_pending_pending_quantity: number | null
          approval_pending_pending_value: number | null
          approval_pending_required_quantity: number | null
          approval_pending_required_value: number | null
          cancelled_count: number | null
          cancelled_dispatched_quantity: number | null
          cancelled_dispatched_value: number | null
          cancelled_pending_quantity: number | null
          cancelled_pending_value: number | null
          cancelled_required_quantity: number | null
          cancelled_required_value: number | null
          company_id: string
          completed_count: number | null
          completed_dispatched_quantity: number | null
          completed_dispatched_value: number | null
          completed_pending_quantity: number | null
          completed_pending_value: number | null
          completed_required_quantity: number | null
          completed_required_value: number | null
          created_at: string | null
          deleted_at: string | null
          first_order_date: string | null
          id: string
          in_progress_count: number | null
          in_progress_dispatched_quantity: number | null
          in_progress_dispatched_value: number | null
          in_progress_pending_quantity: number | null
          in_progress_pending_value: number | null
          in_progress_required_quantity: number | null
          in_progress_required_value: number | null
          last_order_date: string | null
          last_updated_at: string | null
          product_id: string
          total_orders: number | null
        }
        Insert: {
          active_dispatched_quantity?: number | null
          active_dispatched_value?: number | null
          active_pending_quantity?: number | null
          active_pending_value?: number | null
          active_required_quantity?: number | null
          active_required_value?: number | null
          approval_pending_count?: number | null
          approval_pending_dispatched_quantity?: number | null
          approval_pending_dispatched_value?: number | null
          approval_pending_pending_quantity?: number | null
          approval_pending_pending_value?: number | null
          approval_pending_required_quantity?: number | null
          approval_pending_required_value?: number | null
          cancelled_count?: number | null
          cancelled_dispatched_quantity?: number | null
          cancelled_dispatched_value?: number | null
          cancelled_pending_quantity?: number | null
          cancelled_pending_value?: number | null
          cancelled_required_quantity?: number | null
          cancelled_required_value?: number | null
          company_id: string
          completed_count?: number | null
          completed_dispatched_quantity?: number | null
          completed_dispatched_value?: number | null
          completed_pending_quantity?: number | null
          completed_pending_value?: number | null
          completed_required_quantity?: number | null
          completed_required_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_dispatched_quantity?: number | null
          in_progress_dispatched_value?: number | null
          in_progress_pending_quantity?: number | null
          in_progress_pending_value?: number | null
          in_progress_required_quantity?: number | null
          in_progress_required_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          product_id: string
          total_orders?: number | null
        }
        Update: {
          active_dispatched_quantity?: number | null
          active_dispatched_value?: number | null
          active_pending_quantity?: number | null
          active_pending_value?: number | null
          active_required_quantity?: number | null
          active_required_value?: number | null
          approval_pending_count?: number | null
          approval_pending_dispatched_quantity?: number | null
          approval_pending_dispatched_value?: number | null
          approval_pending_pending_quantity?: number | null
          approval_pending_pending_value?: number | null
          approval_pending_required_quantity?: number | null
          approval_pending_required_value?: number | null
          cancelled_count?: number | null
          cancelled_dispatched_quantity?: number | null
          cancelled_dispatched_value?: number | null
          cancelled_pending_quantity?: number | null
          cancelled_pending_value?: number | null
          cancelled_required_quantity?: number | null
          cancelled_required_value?: number | null
          company_id?: string
          completed_count?: number | null
          completed_dispatched_quantity?: number | null
          completed_dispatched_value?: number | null
          completed_pending_quantity?: number | null
          completed_pending_value?: number | null
          completed_required_quantity?: number | null
          completed_required_value?: number | null
          created_at?: string | null
          deleted_at?: string | null
          first_order_date?: string | null
          id?: string
          in_progress_count?: number | null
          in_progress_dispatched_quantity?: number | null
          in_progress_dispatched_value?: number | null
          in_progress_pending_quantity?: number | null
          in_progress_pending_value?: number | null
          in_progress_required_quantity?: number | null
          in_progress_required_value?: number | null
          last_order_date?: string | null
          last_updated_at?: string | null
          product_id?: string
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_order_aggregates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_order_aggregates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_items: {
        Row: {
          company_id: string
          display_order: number | null
          id: string
          product_id: string
          variant_id: string
          variant_value: string
        }
        Insert: {
          company_id?: string
          display_order?: number | null
          id?: string
          product_id: string
          variant_id: string
          variant_value: string
        }
        Update: {
          company_id?: string
          display_order?: number | null
          id?: string
          product_id?: string
          variant_id?: string
          variant_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
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
          company_id?: string
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
          company_id: string
          cost_price_per_unit: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          gsm: number | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          is_active: boolean
          measuring_unit: string
          min_stock_alert: boolean | null
          min_stock_threshold: number | null
          modified_by: string | null
          name: string
          notes: string | null
          product_code: string | null
          product_images: string[] | null
          search_vector: unknown
          selling_price_per_unit: number | null
          sequence_number: number
          show_on_catalog: boolean | null
          stock_type: string
          tax_type: string
          thread_count_cm: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          gsm?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          measuring_unit: string
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name: string
          notes?: string | null
          product_code?: string | null
          product_images?: string[] | null
          search_vector?: unknown
          selling_price_per_unit?: number | null
          sequence_number: number
          show_on_catalog?: boolean | null
          stock_type: string
          tax_type?: string
          thread_count_cm?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost_price_per_unit?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          gsm?: number | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          measuring_unit?: string
          min_stock_alert?: boolean | null
          min_stock_threshold?: number | null
          modified_by?: string | null
          name?: string
          notes?: string | null
          product_code?: string | null
          product_images?: string[] | null
          search_vector?: unknown
          selling_price_per_unit?: number | null
          sequence_number?: number
          show_on_catalog?: boolean | null
          stock_type?: string
          tax_type?: string
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
        ]
      }
      purchase_order_items: {
        Row: {
          company_id: string
          created_at: string
          id: string
          line_total: number | null
          notes: string | null
          pending_quantity: number | null
          product_id: string
          purchase_order_id: string
          received_quantity: number | null
          required_quantity: number
          unit_rate: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          pending_quantity?: number | null
          product_id: string
          purchase_order_id: string
          received_quantity?: number | null
          required_quantity: number
          unit_rate: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          pending_quantity?: number | null
          product_id?: string
          purchase_order_id?: string
          received_quantity?: number | null
          required_quantity?: number
          unit_rate?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          advance_amount: number | null
          agent_id: string | null
          attachments: string[] | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_due_date: string | null
          discount_amount: number | null
          discount_type: Database["public"]["Enums"]["discount_type_enum"]
          discount_value: number | null
          gst_amount: number | null
          has_inward: boolean | null
          id: string
          modified_by: string | null
          notes: string | null
          order_date: string
          payment_terms: string | null
          search_vector: unknown
          sequence_number: number
          source: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          supplier_id: string
          supplier_invoice_date: string | null
          supplier_invoice_number: string | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount: number | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_due_date?: string | null
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_amount?: number | null
          has_inward?: boolean | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          search_vector?: unknown
          sequence_number: number
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          supplier_id: string
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_due_date?: string | null
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_amount?: number | null
          has_inward?: boolean | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          search_vector?: unknown
          sequence_number?: number
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          supplier_id?: string
          supplier_invoice_date?: string | null
          supplier_invoice_number?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_batch_items: {
        Row: {
          batch_id: string
          company_id: string
          id: string
          stock_unit_id: string
          warehouse_id: string
        }
        Insert: {
          batch_id: string
          company_id?: string
          id?: string
          stock_unit_id: string
          warehouse_id: string
        }
        Update: {
          batch_id?: string
          company_id?: string
          id?: string
          stock_unit_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "qr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batch_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batch_items_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batch_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_batches: {
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
          company_id?: string
          created_at?: string
          created_by?: string
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
            foreignKeyName: "qr_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          unit_rate: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          dispatched_quantity?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          pending_quantity?: number | null
          product_id: string
          required_quantity: number
          sales_order_id: string
          unit_rate: number
          updated_at?: string
          warehouse_id?: string | null
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
          unit_rate?: number
          updated_at?: string
          warehouse_id?: string | null
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
          {
            foreignKeyName: "sales_order_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          delivery_due_date: string | null
          discount_amount: number | null
          discount_type: Database["public"]["Enums"]["discount_type_enum"]
          discount_value: number | null
          gst_amount: number | null
          has_outward: boolean | null
          id: string
          modified_by: string | null
          notes: string | null
          order_date: string
          payment_terms: string | null
          search_vector: unknown
          sequence_number: number
          source: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          tax_type: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount: number | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          delivery_due_date?: string | null
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_amount?: number | null
          has_outward?: boolean | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          search_vector?: unknown
          sequence_number: number
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          advance_amount?: number | null
          agent_id?: string | null
          attachments?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          delivery_due_date?: string | null
          discount_amount?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type_enum"]
          discount_value?: number | null
          gst_amount?: number | null
          has_outward?: boolean | null
          id?: string
          modified_by?: string | null
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          search_vector?: unknown
          sequence_number?: number
          source?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type_enum"] | null
          total_amount?: number | null
          updated_at?: string
          warehouse_id?: string | null
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
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_unit_adjustments: {
        Row: {
          adjustment_date: string
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          modified_by: string | null
          quantity_adjusted: number
          reason: string
          stock_unit_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          adjustment_date: string
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          modified_by?: string | null
          quantity_adjusted: number
          reason: string
          stock_unit_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          adjustment_date?: string
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          modified_by?: string | null
          quantity_adjusted?: number
          reason?: string
          stock_unit_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_unit_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_unit_adjustments_stock_unit_id_fkey"
            columns: ["stock_unit_id"]
            isOneToOne: false
            referencedRelation: "stock_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_unit_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_units: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          created_from_inward_id: string | null
          deleted_at: string | null
          has_outward: boolean | null
          id: string
          initial_quantity: number
          manufacturing_date: string | null
          modified_by: string | null
          notes: string | null
          product_id: string
          qr_generated_at: string | null
          quality_grade: string | null
          remaining_quantity: number
          sequence_number: number
          status: string
          supplier_number: string | null
          updated_at: string
          warehouse_id: string
          warehouse_location: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          created_by?: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          has_outward?: boolean | null
          id?: string
          initial_quantity: number
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id: string
          qr_generated_at?: string | null
          quality_grade?: string | null
          remaining_quantity: number
          sequence_number: number
          status?: string
          supplier_number?: string | null
          updated_at?: string
          warehouse_id: string
          warehouse_location?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          created_from_inward_id?: string | null
          deleted_at?: string | null
          has_outward?: boolean | null
          id?: string
          initial_quantity?: number
          manufacturing_date?: string | null
          modified_by?: string | null
          notes?: string | null
          product_id?: string
          qr_generated_at?: string | null
          quality_grade?: string | null
          remaining_quantity?: number
          sequence_number?: number
          status?: string
          supplier_number?: string | null
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
      user_warehouses: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          user_id: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          user_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warehouses_warehouse_id_fkey"
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
          all_warehouses_access: boolean | null
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
          all_warehouses_access?: boolean | null
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
          all_warehouses_access?: boolean | null
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
            foreignKeyName: "fk_users_role"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          modified_by: string | null
          name: string
          pin_code: string | null
          slug: string
          state: string | null
          updated_at: string
        }
        Insert: {
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
          modified_by?: string | null
          name: string
          pin_code?: string | null
          slug: string
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
          modified_by?: string | null
          name?: string
          pin_code?: string | null
          slug?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_purchase_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string }
        Returns: undefined
      }
      approve_sales_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string }
        Returns: undefined
      }
      authorize: { Args: { required_permission: string }; Returns: boolean }
      cleanup_expired_tokens: { Args: never; Returns: number }
      create_adjustment_note_with_items: {
        Args: {
          p_adjustment_date: string
          p_adjustment_type: string
          p_attachments?: string[]
          p_company_id?: string
          p_counter_ledger_id: string
          p_invoice_id: string
          p_items?: Json
          p_notes?: string
          p_reason?: string
          p_warehouse_id: string
        }
        Returns: string
      }
      create_goods_inward_with_units: {
        Args: { p_inward_data: Json; p_stock_units: Json[] }
        Returns: string
      }
      create_goods_outward_with_items: {
        Args: { p_outward_data: Json; p_stock_unit_items: Json[] }
        Returns: string
      }
      create_invoice_with_items: {
        Args: {
          p_attachments?: string[]
          p_company_id?: string
          p_counter_ledger_id: string
          p_discount_type: string
          p_discount_value?: number
          p_due_date?: string
          p_goods_movement_ids?: string[]
          p_invoice_date: string
          p_invoice_type: string
          p_items: Json
          p_notes?: string
          p_party_ledger_id: string
          p_payment_terms?: string
          p_source_purchase_order_id?: string
          p_source_sales_order_id?: string
          p_supplier_invoice_date?: string
          p_supplier_invoice_number?: string
          p_tax_type: string
          p_warehouse_id: string
        }
        Returns: string
      }
      create_payment_with_allocations: {
        Args: {
          p_allocations: Json
          p_attachments?: string[]
          p_card_last_four?: string
          p_company_id?: string
          p_counter_ledger_id: string
          p_instrument_bank?: string
          p_instrument_branch?: string
          p_instrument_date?: string
          p_instrument_ifsc?: string
          p_instrument_number?: string
          p_notes?: string
          p_party_ledger_id: string
          p_payment_date: string
          p_payment_mode: string
          p_tds_applicable: boolean
          p_tds_ledger_id?: string
          p_tds_rate?: number
          p_total_amount: number
          p_transaction_id?: string
          p_voucher_type: string
          p_vpa?: string
        }
        Returns: string
      }
      create_purchase_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json }
        Returns: number
      }
      create_qr_batch_with_items: {
        Args: { p_batch_data: Json; p_stock_unit_ids: string[] }
        Returns: string
      }
      create_sales_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json }
        Returns: number
      }
      create_staff_invite: {
        Args: {
          p_all_warehouses_access: boolean
          p_company_id: string
          p_company_name: string
          p_expires_at: string
          p_role: string
          p_warehouse_ids: string[]
        }
        Returns: string
      }
      create_user_from_invite: {
        Args: {
          p_auth_user_id: string
          p_first_name: string
          p_invite_token: string
          p_last_name: string
          p_profile_image_url?: string
        }
        Returns: string
      }
      custom_access_auth_hook: { Args: { event: Json }; Returns: Json }
      generate_company_slug: { Args: { company_name: string }; Returns: string }
      generate_warehouse_slug: {
        Args: { warehouse_name: string }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: string }
      get_inventory_aggregates: {
        Args: { p_warehouse_id: string }
        Returns: {
          product_count: number
          total_quantities: Json
        }[]
      }
      get_invoice_aggregates: {
        Args: { p_invoice_type: string; p_warehouse_id: string }
        Returns: {
          invoice_count: number
          total_outstanding: number
        }[]
      }
      get_job_type_suggestions: {
        Args: { company_id_param?: string; search_term?: string }
        Returns: {
          job_type: string
          usage_count: number
        }[]
      }
      get_jwt_all_warehouses_access: { Args: never; Returns: boolean }
      get_jwt_company_id: { Args: never; Returns: string }
      get_jwt_user_id: { Args: never; Returns: string }
      get_jwt_user_role: { Args: never; Returns: string }
      get_low_stock_products: {
        Args: { p_limit?: number; p_warehouse_id: string }
        Returns: Json[]
      }
      get_next_sequence: {
        Args: { p_company_id?: string; p_table_name: string }
        Returns: number
      }
      get_purchase_order_aggregates: {
        Args: { p_warehouse_id: string }
        Returns: {
          order_count: number
          pending_quantities: Json
        }[]
      }
      get_quality_grade_suggestions: {
        Args: { company_id_param?: string; search_term?: string }
        Returns: {
          quality_grade: string
          usage_count: number
        }[]
      }
      get_sales_order_aggregates: {
        Args: { p_warehouse_id: string }
        Returns: {
          order_count: number
          pending_quantities: Json
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
      has_warehouse_access: {
        Args: { warehouse_id_to_check: string }
        Returns: boolean
      }
      quick_order_with_outward: {
        Args: {
          p_order_data: Json
          p_order_items: Json[]
          p_stock_unit_items: Json[]
        }
        Returns: number
      }
      recalculate_partner_payables_aggregates: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      recalculate_partner_purchase_aggregates: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      recalculate_partner_receivables_aggregates: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      recalculate_partner_sales_aggregates: {
        Args: { p_partner_id: string }
        Returns: undefined
      }
      recalculate_product_inventory_aggregates: {
        Args: { p_product_id: string; p_warehouse_id: string }
        Returns: undefined
      }
      recalculate_product_purchase_order_aggregates: {
        Args: { p_company_id: string; p_product_id: string }
        Returns: undefined
      }
      recalculate_product_sales_order_aggregates: {
        Args: { p_company_id: string; p_product_id: string }
        Returns: undefined
      }
      update_adjustment_note_with_items: {
        Args: {
          p_adjustment_date: string
          p_adjustment_note_id: string
          p_attachments?: string[]
          p_counter_ledger_id: string
          p_invoice_id: string
          p_items?: Json
          p_notes?: string
          p_reason?: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      update_invoice_with_items: {
        Args: {
          p_attachments?: string[]
          p_counter_ledger_id: string
          p_discount_type: string
          p_discount_value?: number
          p_due_date?: string
          p_invoice_date: string
          p_invoice_id: string
          p_items: Json
          p_notes?: string
          p_party_ledger_id: string
          p_payment_terms?: string
          p_supplier_invoice_date?: string
          p_supplier_invoice_number?: string
          p_tax_type: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      update_payment_with_allocations: {
        Args: {
          p_allocations: Json
          p_attachments?: string[]
          p_card_last_four?: string
          p_counter_ledger_id: string
          p_instrument_bank?: string
          p_instrument_branch?: string
          p_instrument_date?: string
          p_instrument_ifsc?: string
          p_instrument_number?: string
          p_notes?: string
          p_party_ledger_id: string
          p_payment_date: string
          p_payment_id: string
          p_payment_mode: string
          p_tds_applicable: boolean
          p_tds_ledger_id?: string
          p_tds_rate?: number
          p_total_amount: number
          p_transaction_id?: string
          p_vpa?: string
        }
        Returns: undefined
      }
      update_purchase_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string }
        Returns: undefined
      }
      update_sales_order_with_items: {
        Args: { p_line_items: Json[]; p_order_data: Json; p_order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      adjustment_type_enum: "credit" | "debit"
      allocation_type_enum: "against_ref" | "advance"
      direct_tax_type_enum: "none" | "tds" | "tcs"
      discount_type_enum: "none" | "percentage" | "flat_amount"
      dr_cr_enum: "debit" | "credit"
      invoice_type_enum: "sales" | "purchase"
      ledger_type_enum:
        | "party"
        | "sales"
        | "purchase"
        | "tax"
        | "bank"
        | "cash"
        | "asset"
        | "liability"
        | "income"
        | "expense"
      parent_group_category_enum: "asset" | "liability" | "income" | "expense"
      payment_mode_enum:
        | "cash"
        | "cheque"
        | "demand_draft"
        | "neft"
        | "rtgs"
        | "imps"
        | "upi"
        | "card"
      product_tax_applicability_enum: "no_tax" | "gst"
      tax_type_enum: "no_tax" | "gst" | "igst"
      voucher_type_enum: "payment" | "receipt"
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
    Enums: {
      adjustment_type_enum: ["credit", "debit"],
      allocation_type_enum: ["against_ref", "advance"],
      direct_tax_type_enum: ["none", "tds", "tcs"],
      discount_type_enum: ["none", "percentage", "flat_amount"],
      dr_cr_enum: ["debit", "credit"],
      invoice_type_enum: ["sales", "purchase"],
      ledger_type_enum: [
        "party",
        "sales",
        "purchase",
        "tax",
        "bank",
        "cash",
        "asset",
        "liability",
        "income",
        "expense",
      ],
      parent_group_category_enum: ["asset", "liability", "income", "expense"],
      payment_mode_enum: [
        "cash",
        "cheque",
        "demand_draft",
        "neft",
        "rtgs",
        "imps",
        "upi",
        "card",
      ],
      product_tax_applicability_enum: ["no_tax", "gst"],
      tax_type_enum: ["no_tax", "gst", "igst"],
      voucher_type_enum: ["payment", "receipt"],
    },
  },
} as const

