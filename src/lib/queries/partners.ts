import { createClient } from "@/lib/supabase/client";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";
import { uploadPartnerImage } from "@/lib/storage";

type Partner = Tables<"partners">;
export type PartnerInsert = TablesInsert<"partners">;
export type PartnerUpdate = TablesUpdate<"partners">;

/**
 * Fetch all partners (for filters, dropdowns, etc.)
 */
export async function getPartners(): Promise<Partner[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch customers (for filters, dropdowns, etc.)
 */
export async function getCustomers(): Promise<Partner[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("partner_type", "customer")
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch suppliers/vendors (for filters, dropdowns, etc.)
 */
export async function getSuppliers(): Promise<Partner[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .in("partner_type", ["supplier", "vendor"])
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch agents (for filters, dropdowns, etc.)
 */
export async function getAgents(): Promise<Partner[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("partner_type", "agent")
    .is("deleted_at", null)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single partner by ID
 */
export async function getPartnerById(
  partnerId: string,
): Promise<Partner | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Error fetching partner:", error);
    return null;
  }
  return data;
}

/**
 * Create a new partner
 */
export async function createPartner({
  partner,
  image,
  companyId,
}: {
  partner: Omit<PartnerInsert, "image_url">;
  image: File | null;
  companyId: string;
}): Promise<Partner> {
  const supabase = createClient();

  const { data: newPartner, error: insertError } = await supabase
    .from("partners")
    .insert(partner)
    .select()
    .single();

  if (insertError) throw insertError;
  if (!newPartner) throw new Error("Failed to create partner");

  if (image) {
    try {
      const { publicUrl } = await uploadPartnerImage(
        companyId,
        newPartner.id,
        image,
      );

      const { data: updatedPartner, error: imageUpdateError } = await supabase
        .from("partners")
        .update({ image_url: publicUrl })
        .eq("id", newPartner.id)
        .select()
        .single();

      if (imageUpdateError) throw imageUpdateError;
      return updatedPartner!;
    } catch (uploadError) {
      console.error("Image upload failed:", uploadError);
      // Don't re-throw, return partner data without image
    }
  }

  return newPartner;
}

/**
 * Update an existing partner
 */
export async function updatePartner({
  partnerId,
  updates,
  image,
  companyId,
}: {
  partnerId: string;
  updates: PartnerUpdate;
  image: File | null;
  companyId: string;
}): Promise<Partner> {
  const supabase = createClient();

  if (image) {
    try {
      const { publicUrl } = await uploadPartnerImage(
        companyId,
        partnerId,
        image,
      );
      updates.image_url = publicUrl;
    } catch (uploadError) {
      console.error("Image upload failed:", uploadError);
      // Don't re-throw, proceed with other updates
    }
  }

  const { data: updatedPartner, error: updateError } = await supabase
    .from("partners")
    .update(updates)
    .eq("id", partnerId)
    .select()
    .single();

  if (updateError) throw updateError;
  if (!updatedPartner) throw new Error("Failed to update partner");

  return updatedPartner;
}

/**
 * Delete a partner (soft delete)
 */
export async function deletePartner(partnerId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("partners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", partnerId);

  if (error) throw error;
}
