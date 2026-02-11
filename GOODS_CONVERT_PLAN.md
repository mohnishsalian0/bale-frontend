Goods Convert Feature - Implementation Plan

Overview

Implementing goods convert feature for fabric conversion/processing tracking (dyeing,
embroidery, printing, etc.) with full CRUD operations, completion workflow, and proper
status management.

---

Phase 1: Database Schema & Functions ✅ COMPLETED

1.1 Update Goods Convert Schema (0038_goods_converts.sql) ✅

Changes:

- Rename conversion_type → service_type_attribute_id UUID NOT NULL REFERENCES
  attributes(id)
- Add output_product_id UUID NOT NULL REFERENCES products(id)
- Update foreign key from invoices (already has placeholder comment)
- Group name for service types: 'service_type'

Fields in final schema:
CREATE TABLE goods_converts (
id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT
get_jwt_company_id(),
warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
sequence_number INTEGER NOT NULL,

-- Convert details
service_type_attribute_id UUID NOT NULL REFERENCES attributes(id), -- ✅ Changed
output_product_id UUID NOT NULL REFERENCES products(id), -- ✅ Added
vendor_id UUID REFERENCES partners(id),
agent_id UUID REFERENCES partners(id),
invoice_id UUID, -- FK added in 0058_invoices.sql
reference_number VARCHAR(50),
job_work_id UUID REFERENCES job_works(id),

-- Timeline
start_date DATE NOT NULL,
completion_date DATE,

-- Status tracking
status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
CHECK (status IN ('in_progress', 'completed', 'cancelled')),
completed_at TIMESTAMPTZ,
completed_by UUID,
cancelled_at TIMESTAMPTZ,
cancelled_by UUID,
cancellation_reason TEXT,

-- Additional
notes TEXT,
attachments TEXT[],

-- Audit fields
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
modified_by UUID,
deleted_at TIMESTAMPTZ,
search_vector tsvector,

UNIQUE(company_id, sequence_number)
);

Update search vector function to include service_type attribute name and output product
name.

---

1.2 Update RPC Functions (0039_goods_convert_functions.sql) ✅

Update create_goods_convert_with_items: ✅

CREATE OR REPLACE FUNCTION create_goods_convert_with_items(
p_convert_data JSONB,
p_input_stock_units JSONB[]
)
Changes:

- Accept service_type_attribute_id instead of conversion_type
- Accept output_product_id (required)
- No manual status updates - trigger reconciliation

Update complete_goods_convert: ✅

CREATE OR REPLACE FUNCTION complete_goods_convert(
p_convert_id UUID,
p_completion_date DATE,
p_output_stock_units JSONB[]
)
Changes:

- Remove product_id from output stock units JSONB ✅
- Use v_convert.output_product_id for all output stock units ✅
- Accept p_completion_date as separate parameter ✅
- Handle lot_number attribute creation/lookup ✅
- Create wastage adjustments if wastage_quantity > 0 ✅
- Trigger reconciliation (touch updated_at) ✅

Add update_goods_convert_with_items: ✅

CREATE OR REPLACE FUNCTION update_goods_convert_with_items(
p_convert_id UUID,
p_convert_data JSONB,
p_input_stock_units JSONB[]
)
RETURNS VOID
Logic:

1. Validate status = 'in_progress' (cannot edit completed/cancelled)
2. Lock convert row (FOR UPDATE)
3. Collect old input stock unit IDs
4. Delete old goods_convert_input_items records
5. Update convert header fields:

- service_type_attribute_id
- vendor_id
- agent_id
- reference_number
- start_date (with chronological validation)
- notes
- NOT editable: warehouse_id, output_product_id

6. Insert new input items with validation:

- Warehouse match
- Status = 'available'
- Quantity validation
- Chronological check

7. Trigger reconciliation on old input units (touch updated_at)
8. Trigger reconciliation on new input units (touch updated_at)

Dependencies: Reconciliation function handles status updates automatically.

---

Phase 2: TypeScript Types & Validations ✅ COMPLETED

2.1 Create Type Definitions (src/types/goods-converts.types.ts) ✅

import type { QueryData } from "@supabase/supabase-js";
import type { buildGoodsConvertsQuery, buildGoodsConvertDetailQuery } from
"@/lib/queries/goods-converts";

// List view for goods convert list page
export interface GoodsConvertListView extends Pick<
GoodsConvert,
"id" | "sequence_number" | "start_date" | "status"

> {
> vendor: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
> warehouse: Pick<Warehouse, "name">;
> service_type: Pick<Attribute, "name">;
> output_product: Pick<Product, "name">;
> input_items: Array<{
> stock_unit: {

    product: Pick<Product, "name" | "measuring_unit">;

};
quantity_consumed: number;
}>;
}

// Detail view for goods convert details page
export interface GoodsConvertDetailView extends Pick<
GoodsConvert,
| "id"
| "sequence_number"
| "start_date"
| "completion_date"
| "reference_number"
| "notes"
| "status"

> {
> vendor: Pick<Partner, "id" | "first_name" | "last_name" | "company_name" |
> "phone_number"> | null;
> agent: Pick<Partner, "id" | "first_name" | "last_name" | "company_name"> | null;
> warehouse: Pick<Warehouse, "id" | "name" | "address_line_1" | "address_line_2" |
> "city" | "state">;
> service_type: Pick<Attribute, "id" | "name">;
> output_product: Pick<Product, "id" | "name" | "measuring_unit">;
> input_items: Array<{
> id: string;
> quantity_consumed: number;
> stock_unit: {

    id: string;
    stock_number: string;
    remaining_quantity: number;
    product: Pick<Product, "id" | "name" | "measuring_unit" | "stock_type" |

"product_images">;
warehouse: Pick<Warehouse, "name">;
};
}>;
output_stock_units: Array<{
id: string;
stock_number: string;
initial_quantity: number;
remaining_quantity: number;
quality_grade: string | null;
warehouse_location: string | null;
product: Pick<Product, "id" | "name" | "measuring_unit" | "stock_type" |
"product_images">;
warehouse: Pick<Warehouse, "name">;
}>;
}

// Create types
export interface CreateConvertData {
warehouse_id: string;
service_type_attribute_id: string;
output_product_id: string;
vendor_id?: string;
agent_id?: string;
reference_number?: string;
job_work_id?: string;
start_date: string; // ISO date
notes?: string;
}

export interface CreateConvertInputItem {
stock_unit_id: string;
quantity_consumed: number;
}

export interface CreateConvertOutputUnit {
initial_quantity: number;
quality_grade?: string;
stock_number?: string;
warehouse_location?: string;
manufacturing_date?: string; // ISO date
notes?: string;
wastage_quantity?: number;
wastage_reason?: string;
}

// Update types
export interface UpdateConvertData {
service_type_attribute_id: string;
vendor_id?: string;
agent_id?: string;
reference_number?: string;
start_date: string; // ISO date
notes?: string;
}

// Inferred types from queries
export type GoodsConvert = QueryData<ReturnType<typeof
buildGoodsConvertsQuery>>[number];
export type GoodsConvertDetail = QueryData<ReturnType<typeof
buildGoodsConvertDetailQuery>>;

---

2.2 Create Validations (src/lib/validations/goods-convert.ts) ✅

import { z } from "zod";
import { requiredString, optionalString, positiveDecimal, isoDateString } from
"./common";

// Create convert validation
export const createConvertSchema = z.object({
warehouse_id: requiredString(),
service_type_attribute_id: requiredString(),
output_product_id: requiredString(),
vendor_id: optionalString(),
agent_id: optionalString(),
reference_number: optionalString(),
start_date: isoDateString(),
notes: optionalString(),
});

export type CreateConvertFormData = z.infer<typeof createConvertSchema>;

// Complete convert validation
export const completeConvertSchema = z.object({
completion_date: isoDateString(),
});

export type CompleteConvertFormData = z.infer<typeof completeConvertSchema>;

// Update convert validation
export const updateConvertSchema = z.object({
service_type_attribute_id: requiredString(),
vendor_id: optionalString(),
agent_id: optionalString(),
reference_number: optionalString(),
start_date: isoDateString(),
notes: optionalString(),
});

export type UpdateConvertFormData = z.infer<typeof updateConvertSchema>;

// Output stock unit with wastage (extends existing stock unit schema)
export const convertOutputUnitSchema = z.object({
quantity: positiveDecimal(),
stock_number: optionalString(),
lot_number: optionalString(),
grade: optionalString(),
manufactured_on: z.date().optional(),
location: optionalString(),
notes: optionalString(),
wastage_quantity: z.number().min(0).optional(),
wastage_reason: optionalString(),
count: z.number().int().min(1).default(1),
});

export type ConvertOutputUnitFormData = z.infer<typeof convertOutputUnitSchema>;

---

Phase 3: Database Queries & Hooks ✅ COMPLETED

3.1 Create Queries (src/lib/queries/goods-converts.ts) ✅

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Query builder for list view
export const buildGoodsConvertsQuery = (
supabase: SupabaseClient<Database>,
warehouseId: string,
filters: {
status?: string;
vendor_id?: string;
product_id?: string; // Filter by input product
search_term?: string;
date_from?: string;
date_to?: string;
},
page: number,
pageSize: number,
) => {
let query = supabase
.from("goods_converts")
.select(`     id,
    sequence_number,
    start_date,
    status,
    vendor:vendor_id(first_name, last_name, company_name),
    warehouse:warehouse_id(name),
    service_type:service_type_attribute_id(name),
    output_product:output_product_id(name),
    input_items:goods_convert_input_items(
      quantity_consumed,
      stock_unit:stock_unit_id(
        product:product_id(name, measuring_unit)
      )
    )
  `)
.eq("warehouse_id", warehouseId)
.is("deleted_at", null)
.order("start_date", { ascending: false })
.order("sequence_number", { ascending: false });

// Apply filters
if (filters.status && filters.status !== "all") {
query = query.eq("status", filters.status);
}
if (filters.vendor_id) {
query = query.eq("vendor_id", filters.vendor_id);
}
if (filters.product_id) {
// Filter by input product - needs join through input_items
query = query.contains("input_items", [{ stock_unit: { product_id:
filters.product_id } }]);
}
if (filters.search_term) {
query = query.textSearch("search_vector", filters.search_term);
}
if (filters.date_from) {
query = query.gte("start_date", filters.date_from);
}
if (filters.date_to) {
query = query.lte("start_date", filters.date_to);
}

// Pagination
const from = (page - 1) \* pageSize;
const to = from + pageSize - 1;
query = query.range(from, to);

return query;
};

// Query builder for detail view
export const buildGoodsConvertDetailQuery = (
supabase: SupabaseClient<Database>,
sequenceNumber: string,
) => {
return supabase
.from("goods_converts")
.select(`     id,
    sequence_number,
    start_date,
    completion_date,
    reference_number,
    notes,
    status,
    vendor:vendor_id(id, first_name, last_name, company_name, phone_number),
    agent:agent_id(id, first_name, last_name, company_name),
    warehouse:warehouse_id(id, name, address_line_1, address_line_2, city, state),
    service_type:service_type_attribute_id(id, name),
    output_product:output_product_id(id, name, measuring_unit),
    input_items:goods_convert_input_items(
      id,
      quantity_consumed,
      stock_unit:stock_unit_id(
        id,
        stock_number,
        remaining_quantity,
        product:product_id(id, name, measuring_unit, stock_type, product_images),
        warehouse:current_warehouse_id(name)
      )
    ),
    output_stock_units:stock_units!origin_convert_id(
      id,
      stock_number,
      initial_quantity,
      remaining_quantity,
      quality_grade,
      warehouse_location,
      product:product_id(id, name, measuring_unit, stock_type, product_images),
      warehouse:current_warehouse_id(name)
    )
  `)
.eq("sequence_number", sequenceNumber)
.is("deleted_at", null)
.single();
};

// Get convert by ID
export const getGoodsConvertById = async (
supabase: SupabaseClient<Database>,
convertId: string,
) => {
const { data, error } = await supabase
.from("goods_converts")
.select("\*")
.eq("id", convertId)
.is("deleted_at", null)
.single();

if (error) throw error;
return data;
};

---

3.2 Create Query Keys (src/lib/query/keys.ts) ✅

// Add to existing keys file:
export const goodsConvertsKeys = {
all: ["goods-converts"] as const,
lists: () => [...goodsConvertsKeys.all, "list"] as const,
list: (warehouseId: string, filters: object, page: number) =>
[...goodsConvertsKeys.lists(), warehouseId, filters, page] as const,
details: () => [...goodsConvertsKeys.all, "detail"] as const,
detail: (sequenceNumber: string) =>
[...goodsConvertsKeys.details(), sequenceNumber] as const,
byId: (convertId: string) =>
[...goodsConvertsKeys.all, "byId", convertId] as const,
};

---

3.3 Create React Query Hooks (src/lib/query/hooks/goods-converts.ts) ✅

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase/client";
import { goodsConvertsKeys } from "../keys";
import {
buildGoodsConvertsQuery,
buildGoodsConvertDetailQuery,
getGoodsConvertById,
} from "@/lib/queries/goods-converts";
import type {
CreateConvertData,
CreateConvertInputItem,
CreateConvertOutputUnit,
UpdateConvertData,
} from "@/types/goods-converts.types";

// List hook
export const useGoodsConverts = (
warehouseId: string,
filters: {
status?: string;
vendor_id?: string;
product_id?: string;
search_term?: string;
date_from?: string;
date_to?: string;
},
page: number,
pageSize: number,
) => {
const supabase = useSupabase();

return useQuery({
queryKey: goodsConvertsKeys.list(warehouseId, filters, page),
queryFn: async () => {
const query = buildGoodsConvertsQuery(supabase, warehouseId, filters, page,
pageSize);
const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      totalCount: count || 0,
    };

},
});
};

// Detail hook by sequence number
export const useGoodsConvertBySequenceNumber = (sequenceNumber: string) => {
const supabase = useSupabase();

return useQuery({
queryKey: goodsConvertsKeys.detail(sequenceNumber),
queryFn: async () => {
const query = buildGoodsConvertDetailQuery(supabase, sequenceNumber);
const { data, error } = await query;

    if (error) throw error;
    return data;

},
});
};

// Get convert by ID (for edit)
export const useGoodsConvertById = (convertId: string) => {
const supabase = useSupabase();

return useQuery({
queryKey: goodsConvertsKeys.byId(convertId),
queryFn: () => getGoodsConvertById(supabase, convertId),
enabled: !!convertId,
});
};

// Mutations hook
export const useGoodsConvertMutations = (warehouseId: string) => {
const supabase = useSupabase();
const queryClient = useQueryClient();

const createConvertWithItems = useMutation({
mutationFn: async ({
convertData,
inputItems,
}: {
convertData: CreateConvertData;
inputItems: CreateConvertInputItem[];
}) => {
const { data, error } = await supabase.rpc("create_goods_convert_with_items", {
p_convert_data: convertData,
p_input_stock_units: inputItems,
});

    if (error) throw error;
    return data;

},
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: goodsConvertsKeys.lists() });
queryClient.invalidateQueries({ queryKey: stockUnitsKeys.all });
},
});

const updateConvertWithItems = useMutation({
mutationFn: async ({
convertId,
convertData,
inputItems,
}: {
convertId: string;
convertData: UpdateConvertData;
inputItems: CreateConvertInputItem[];
}) => {
const { error } = await supabase.rpc("update_goods_convert_with_items", {
p_convert_id: convertId,
p_convert_data: convertData,
p_input_stock_units: inputItems,
});

    if (error) throw error;

},
onSuccess: (\_, variables) => {
queryClient.invalidateQueries({ queryKey: goodsConvertsKeys.all });
queryClient.invalidateQueries({ queryKey: stockUnitsKeys.all });
},
});

const completeConvert = useMutation({
mutationFn: async ({
convertId,
completionDate,
outputUnits,
}: {
convertId: string;
completionDate: string;
outputUnits: CreateConvertOutputUnit[];
}) => {
const { error } = await supabase.rpc("complete_goods_convert", {
p_convert_id: convertId,
p_completion_date: completionDate,
p_output_stock_units: outputUnits,
});

    if (error) throw error;

},
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: goodsConvertsKeys.all });
queryClient.invalidateQueries({ queryKey: stockUnitsKeys.all });
},
});

const cancelConvert = useMutation({
mutationFn: async ({
convertId,
reason,
}: {
convertId: string;
reason: string;
}) => {
const { error } = await supabase.rpc("cancel_goods_convert", {
p_convert_id: convertId,
p_cancellation_reason: reason,
});

    if (error) throw error;

},
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: goodsConvertsKeys.all });
queryClient.invalidateQueries({ queryKey: stockUnitsKeys.all });
},
});

const deleteConvert = useMutation({
mutationFn: async (convertId: string) => {
const { error } = await supabase
.from("goods_converts")
.delete()
.eq("id", convertId);

    if (error) throw error;

},
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: goodsConvertsKeys.all });
queryClient.invalidateQueries({ queryKey: stockUnitsKeys.all });
},
});

return {
createConvertWithItems,
updateConvertWithItems,
completeConvert,
cancelConvert,
deleteConvert,
};
};

---

Phase 4: UI Components - Shared/Generalized ✅ COMPLETED

4.1 Generalize StockUnitFormSheet ✅

Move:
src/app/(protected)/warehouse/[warehouse_slug]/goods-inward/StockUnitFormSheet.tsxTo:
src/components/layouts/stock-unit-form-sheet.tsx

New Props:
interface StockUnitFormSheetProps {
open: boolean;
onOpenChange: (open: boolean) => void;
product: ProductListView | null;
initialUnit?: Partial<StockUnitSpec>;
onConfirm: (unit: Omit<StockUnitSpec, "id">) => void;
enableWastage?: boolean; // Show wastage fields (for convert output)
}

Add Wastage Fields (when enableWastage=true):
// Add to schema
wastage_quantity: z.number().min(0).optional(),
wastage_reason: z.string().optional(),

// Add UI after quantity section
{enableWastage && (
<Collapsible>
<CollapsibleTrigger>Wastage</CollapsibleTrigger>
<CollapsibleContent>
<InputWrapper
type="number"
label="Wastage quantity"
rightText={unitAbbreviation}
{...register("wastage_quantity", { valueAsNumber: true })}
/>
<Textarea
placeholder="Wastage reason"
{...register("wastage_reason")}
/>
</CollapsibleContent>
</Collapsible>
)}

---

4.2 Create Output Product Selection Step ✅

File: src/components/layouts/output-product-selection-step.tsx

Design: Hybrid of product-selection-step layout + partner-selection-step checkmark

interface OutputProductSelectionStepProps {
selectedProductId: string | null;
onSelectProduct: (productId: string) => void;
prefilledProductId?: string; // From job work
}

// Layout:
// - Header: "Select output product" + "New product" button
// - Search bar (full-width)
// - Filter dropdowns (material, color, tags)
// - Product list with checkmark selection (like partner selection)
// - On click: Single selection with checkmark
// - Auto-advance after selection (optional)

---

Phase 5: Create Flow Pages ✅ COMPLETED

5.1 Create Goods Convert Page ✅

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/create/page.tsx

5-Step Flow:

type FormStep = "vendor" | "jobWork" | "outputProduct" | "inputUnits" | "details";

const steps = [
{ step: "vendor", label: "Vendor", number: 1 },
{ step: "jobWork", label: "Job Work", number: 2 },
{ step: "outputProduct", label: "Output Product", number: 3 },
{ step: "inputUnits", label: "Input Units", number: 4 },
{ step: "details", label: "Details", number: 5 },
];

Step 1: Vendor Selection

- Use <PartnerSelectionStep partnerType="vendor" />
- Auto-advance on selection

Step 2: Job Work Selection (NEW - Dummy Data)

- Component: <JobWorkLinkToStep> (similar to OutwardLinkToStep)
- Show dummy job work list with:
  const dummyJobWorks = [
  {
  id: "dummy-1",
  sequence_number: 1,
  job_type: "Dyeing",
  vendor_name: "ABC Dyeing House",
  output_product: { id: "prod-1", name: "Red Cotton Roll" },
  status: "in_progress",
  },
  // ... more dummy data
  ];
- Optional selection (can skip)
- If selected: Auto-fill output_product_id in next step
- Button: "Skip" (if none selected) or "Continue" (if selected)

Step 3: Output Product Selection

- Use <OutputProductSelectionStep>
- Pre-fill from job work if linked
- Required selection
- Auto-advance on selection

Step 4: Input Units Selection

- Use existing <StockUnitScannerStep>
- Filter: status: ["available"] (not "full"/"partial")
- No order validation (don't pass orderProducts)
- Can scan/select multiple stock units

Step 5: Details

- Component: New <ConvertDetailsStep>
- Fields:
- Service Type (dropdown from attributes with group_name='service_type')
- Start Date (DatePicker, default: today)
- Reference Number (optional)
- Notes (textarea)
- Layout: Similar to InwardDetailsStep / OutwardDetailsStep

Form State Management:
const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
const [selectedJobWorkId, setSelectedJobWorkId] = useState<string | null>(null);
const [selectedOutputProductId, setSelectedOutputProductId] = useState<string |
null>(null);
const [scannedInputUnits, setScannedInputUnits] = useState<ScannedStockUnit[]>([]);
const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
serviceTypeAttributeId: "",
startDate: dateToISOString(new Date()),
referenceNumber: "",
notes: "",
});

Validation:
const canProceedFromVendor = selectedVendorId !== null;
const canProceedFromJobWork = true; // Optional step
const canProceedFromOutputProduct = selectedOutputProductId !== null;
const canProceedFromInputUnits = scannedInputUnits.length > 0;
const canSubmit = canProceedFromVendor && canProceedFromOutputProduct &&
canProceedFromInputUnits && detailsFormData.serviceTypeAttributeId;

Submission:
const handleSubmit = async () => {
const convertData: CreateConvertData = {
warehouse_id: warehouse.id,
service_type_attribute_id: detailsFormData.serviceTypeAttributeId,
output_product_id: selectedOutputProductId!,
vendor_id: selectedVendorId || undefined,
job_work_id: selectedJobWorkId || undefined,
reference_number: detailsFormData.referenceNumber || undefined,
start_date: detailsFormData.startDate,
notes: detailsFormData.notes || undefined,
};

const inputItems: CreateConvertInputItem[] = scannedInputUnits.map((item) => ({
stock_unit_id: item.stockUnit.id,
quantity_consumed: item.quantity,
}));

await createConvertWithItems.mutateAsync({ convertData, inputItems });

toast.success("Goods convert created successfully");
router.push(`/warehouse/${warehouse.slug}/goods-convert`);
};

---

5.2 Create ConvertDetailsStep Component ✅

File:
src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/ConvertDetailsStep.tsx

interface ConvertDetailsStepProps {
formData: {
serviceTypeAttributeId: string;
startDate: string;
referenceNumber: string;
notes: string;
};
onChange: (data: Partial<ConvertDetailsStepProps["formData"]>) => void;
}

// Layout:
// - Service Type dropdown (with MultipleSelector for create/search)
// - Start Date picker
// - Reference Number input
// - Notes textarea (collapsible "Additional Details")

---

5.3 Create JobWorkLinkToStep Component (Dummy Data) ✅

File:
src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/JobWorkLinkToStep.tsx

interface JobWorkLinkToStepProps {
selectedJobWorkId: string | null;
onSelectJobWork: (jobWorkId: string, outputProductId: string) => void;
}

// Show list of dummy job works
// Each item: JW-{number} • {job_type} • {vendor_name} • {output_product_name}
// Checkmark selection like partner-selection-step
// Returns: jobWorkId + outputProductId for pre-filling

---

Phase 6: Complete Flow Pages ✅ COMPLETED

6.1 Complete Goods Convert Page ✅

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/com
plete/page.tsx

2-Step Flow:

type CompleteStep = "outputUnits" | "details";

const steps = [
{ step: "outputUnits", label: "Output Units", number: 1 },
{ step: "details", label: "Details", number: 2 },
];

Step 1: Output Stock Units Creation

Component: <OutputStockUnitCreationStep>

State:
const [outputUnits, setOutputUnits] = useState<StockUnitSpec[]>([]);
const [showUnitFormSheet, setShowUnitFormSheet] = useState(true); // Auto-open on first
land

Layout:
┌─────────────────────────────────────┐
│ Add output stock units │
│ {output_product_name} │ Header
├─────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────┐ │
│ │ 50m • A Grade • LOT-123 [-][2][+][🗑️] │
│ └─────────────────────────────────┘ │
│ │ Scrollable
│ ┌─────────────────────────────────┐ │ list
│ │ 100m • B Grade [-][1][+][🗑️] │
│ └─────────────────────────────────┘ │
│ │
├─────────────────────────────────────┤
│ [+ Add new roll] │ Footer
└─────────────────────────────────────┘

Component Code (similar to AllSpecificationsSheet):
interface OutputStockUnitCreationStepProps {
outputProduct: Product;
outputUnits: StockUnitSpec[];
onOutputUnitsChange: (units: StockUnitSpec[]) => void;
}

// Functionality:
// - Auto-open StockUnitFormSheet on first land
// - Show grouped units with count controls
// - Add button opens form sheet
// - Form includes wastage fields (enableWastage=true)

Step 2: Completion Details

Component: <CompletionDetailsStep>

Simple form:
interface CompletionDetailsStepProps {
formData: {
completionDate: string;
};
onChange: (data: { completionDate: string }) => void;
}

// Layout: Just completion date picker, default to today

Submission:
const handleSubmit = async () => {
const outputStockUnits: CreateConvertOutputUnit[] = [];

for (const unit of outputUnits) {
for (let i = 0; i < unit.count; i++) {
outputStockUnits.push({
initial_quantity: unit.quantity,
quality_grade: unit.grade || undefined,
stock_number: unit.stock_number || undefined,
warehouse_location: unit.location || undefined,
manufacturing_date: unit.manufactured_on ?
dateToISOString(unit.manufactured_on) : undefined,
notes: unit.notes || undefined,
wastage_quantity: unit.wastage_quantity || undefined,
wastage_reason: unit.wastage_reason || undefined,
});
}
}

await completeConvert.mutateAsync({
convertId: convert.id,
completionDate: completionFormData.completionDate,
outputUnits: outputStockUnits,
});

toast.success("Goods convert completed successfully");
router.push(`/warehouse/${warehouse.slug}/goods-convert/${convert.sequence_number}`);
};

6.2 Add Goods Convert Quick Action to Inventory Page ✅

File: src/app/(protected)/warehouse/[warehouse_slug]/inventory/page.tsx

Location: In the quickActions array (around line 183)

Code to add:
const quickActions: QuickAction[] = [
{
icon: IconShirt,
label: "Create product",
href: `/warehouse/${warehouse.slug}/products`,
},
{
icon: IconTransferIn,
label: "Goods inward",
href: `/warehouse/${warehouse.slug}/goods-inward/create`,
},
{
icon: IconTransferOut,
label: "Goods outward",
href: `/warehouse/${warehouse.slug}/goods-outward/create`,
},
{
icon: IconTruckDelivery,
label: "Goods transfer",
href: `/warehouse/${warehouse.slug}/goods-transfer/create`,
},
// ✅ ADD THIS
{
icon: IconRecycle, // Import from @tabler/icons-react
label: "Goods convert",
href: `/warehouse/${warehouse.slug}/goods-convert/create`,
},
{
icon: IconQrcode,
label: "QR code batch",
href: `/warehouse/${warehouse.slug}/qr-codes/create`,
},
];

Import to add:
import { IconRecycle } from "@tabler/icons-react";

6.3 Add Goods Convert to Sidebar Navigation ✅

File: src/components/layouts/app-sidebar.tsx

Location: In the "Inventory" section of NAV_GROUPS array (after "Goods Transfer", around line 80)

Code to add:
{
title: "Inventory",
nav_items: [
{
label: "Products",
path: `/warehouse/${warehouse.slug}/products`,
icon: IconShirt,
permission: "business.products.read",
},
{
label: "Goods In & Out",
path: `/warehouse/${warehouse.slug}/goods-movement`,
icon: IconTransfer,
permission: "inventory.goods_inward.read",
},
{
label: "Goods Transfer",
path: `/warehouse/${warehouse.slug}/goods-transfer`,
icon: IconTruckDelivery,
permission: "inventory.goods_transfers.read",
},
// ✅ ADD THIS
{
label: "Goods Convert",
path: `/warehouse/${warehouse.slug}/goods-convert`,
icon: IconRecycle, // Import from @tabler/icons-react
permission: "inventory.converts.read",
},
{
label: "QR codes",
path: `/warehouse/${warehouse.slug}/qr-codes`,
icon: IconQrcode,
permission: "inventory.qr_batches.read",
},
],
},

Import to add:
import { IconRecycle } from "@tabler/icons-react";

Permission: Uses inventory.converts.read which should already be seeded in the database from the RLS policies.

---

Phase 7: Edit Flow Pages ✅ COMPLETED

7.1 Edit Goods Convert Page ✅

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/edi
t/page.tsx

Same 5-step flow as create, but:

- Fetch convert data and pre-fill all fields
- Vendor selection: Pre-filled + disable change (add disablePartnerChange prop)
- Job work: Pre-filled if exists
- Output product: Pre-filled + disabled (cannot change after creation)
- Input units: Pre-filled from goods_convert_input_items
- Details: Pre-filled from convert record

Pre-fill Logic:
useEffect(() => {
if (!convert) return;

setSelectedVendorId(convert.vendor_id);
setSelectedJobWorkId(convert.job_work_id);
setSelectedOutputProductId(convert.output_product_id);

// Transform input items to ScannedStockUnit format
const prefilledInputUnits: ScannedStockUnit[] = convert.input_items.map((item) => ({
stockUnit: item.stock_unit, // Already has product nested
quantity: item.quantity_consumed,
}));
setScannedInputUnits(prefilledInputUnits);

setDetailsFormData({
serviceTypeAttributeId: convert.service_type.id,
startDate: convert.start_date,
referenceNumber: convert.reference_number || "",
notes: convert.notes || "",
});
}, [convert]);

Submission:
const handleSubmit = async () => {
const convertData: UpdateConvertData = {
service_type_attribute_id: detailsFormData.serviceTypeAttributeId,
vendor_id: selectedVendorId || undefined,
reference_number: detailsFormData.referenceNumber || undefined,
start_date: detailsFormData.startDate,
notes: detailsFormData.notes || undefined,
};

const inputItems: CreateConvertInputItem[] = scannedInputUnits.map((item) => ({
stock_unit_id: item.stockUnit.id,
quantity_consumed: item.quantity,
}));

await updateConvertWithItems.mutateAsync({
convertId: convert.id,
convertData,
inputItems,
});

toast.success("Goods convert updated successfully");
router.push(`/warehouse/${warehouse.slug}/goods-convert/${convert.sequence_number}`);
};

---

Phase 8: List Page

8.1 Goods Convert List Page

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/page.tsx

Reference: goods-transfer/page.tsx

Layout:
┌─────────────────────────────────────────┐
│ Goods Convert [Illustration]│ Header
│ [Search by bill number___________🔍] │
├─────────────────────────────────────────┤
│ [Status▾][Vendor▾][Product▾][Date📅] │ Filters
├─────────────────────────────────────────┤
│ ┌─ January 2026 ────────────────────┐ │
│ │ │ │
│ │ ┌────────────────────────────────┐ │ │
│ │ │ [Badge] Dyeing │ │ │ List
│ │ │ Red Cotton Roll from ABC Dyeing│ │ │ (grouped
│ │ │ 2 Cotton Rolls • 150m │ │ │ by month)
│ │ │ GC-5 • Jan 15th │ │ │
│ │ │ 145m Out ──┤ │ │
│ │ └────────────────────────────────┘ │ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
│ [1] [2] [3] ... [10] │ Pagination
├─────────────────────────────────────────┤
│ [+] │ FAB
└─────────────────────────────────────────┘

Features:

- Title: "Goods Convert" (no "from vendor" as it's optional)
- Subtitle: Show input products summary (e.g., "2 Cotton Rolls, 1 Silk Roll")
- Right side: Output quantity (0m if in_progress)
- Status badge next to title
- Filters: Status (All/In Progress/Completed/Cancelled), Vendor, Input Product, Date
  Range
- Empty state: Same as goods movement
- FAB: Navigate to create page

Summary Stats (Header card):

<div className="grid grid-cols-1 gap-3 px-4 pb-4">
<Card>
  <Icon: IconRecycle />
  <Label>Active conversions</Label>
  <Value>{inProgressCount} conversions</Value>
</Card>
</div>

---

Phase 9: Details Page

9.1 Goods Convert Details Page

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/(de
tail)/page.tsx

Layout (Reference: partner layout with tabs):

┌─────────────────────────────────────────┐
│ GC-{number} [Badge] │ Header
│ {service_type} • {start_date} │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ Metrics
│ │Input │ │Output │ │Wastage │ │ (cards)
│ │150m │ │145m │ │5m │ │
│ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────┤
│ [Details] [Input Units] [Output Units] │ Tabs
├─────────────────────────────────────────┤
│ │
│ Tab Content │ Content
│ │
├─────────────────────────────────────────┤
│ [Actions▾] │ Footer
└─────────────────────────────────────────┘

Header Metrics (conditional on status):
{convert.status === 'completed' ? (

<div className="grid grid-cols-3 gap-3 px-4 pb-4">
  <Card>
    <Label>Total Input</Label>
    <Value>{totalInput} {unit}</Value>
  </Card>
  <Card>
    <Label>Total Output</Label>
    <Value>{totalOutput} {unit}</Value>
  </Card>
  <Card>
    <Label>Wastage</Label>
    <Value>{wastageTotal} {unit}</Value>
  </Card>
</div>
) : (
<div className="grid grid-cols-1 gap-3 px-4 pb-4">
  <Card>
    <Label>Total Input</Label>
    <Value>{totalInput} {unit}</Value>
  </Card>
</div>
)}

Tabs:

Details Tab:

Conversion Info

- Service Type: {service_type}
- Start Date: {start_date}
- Completion Date: {completion_date} (if completed)

Vendor (if assigned)

- Name: {vendor_name}
- Phone: {phone}

Processing Warehouse

- Name: {warehouse_name}
- Address: {full_address}

Reference

- Reference Number: {reference_number}

Notes

- {notes}

Status

- [Badge with color]

Input Units Tab:

- Similar to goods-outward/.../stock-units/page.tsx
- Show: Product image, name, stock number, quantity consumed
- Click → StockUnitDetailsModal

Output Units Tab:

- Similar to goods-inward/.../stock-units/page.tsx
- Show: Product image, name, stock number, initial quantity, wastage (if any)
- Click → StockUnitDetailsModal
- If in_progress: Show "No output units created yet" empty state

Actions Menu:
const actions = [
convert.status === 'in_progress' && { label: "Complete", onClick: handleComplete },
convert.status === 'in_progress' && { label: "Edit", onClick: handleEdit },
convert.status === 'in_progress' && { label: "Cancel", onClick: handleCancel },
convert.status === 'in_progress' && { label: "Delete", onClick: handleDelete },
].filter(Boolean);

---

9.2 Create Tab Pages

Details Tab Page

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/(de
tail)/page.tsx

Input Units Tab Page

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/(de
tail)/input-units/page.tsx

Output Units Tab Page

File: src/app/(protected)/warehouse/[warehouse_slug]/goods-convert/[convert_number]/(de
tail)/output-units/page.tsx

---

Phase 10: Utility Functions & Components

10.1 Create Utility Functions

File: src/lib/utils/goods-convert.ts

import type { GoodsConvertListView } from "@/types/goods-converts.types";
import type { MeasuringUnit } from "@/types/database/enums";

// Get input products summary for list card
export const getInputProductsSummary = (
convert: GoodsConvertListView
): string => {
const productCounts = new Map<string, number>();

convert.input_items.forEach((item) => {
const productName = item.stock_unit.product.name;
productCounts.set(productName, (productCounts.get(productName) || 0) + 1);
});

const summary = Array.from(productCounts.entries())
.map(([name, count]) => `${count} ${name}`)
.join(", ");

return summary;
};

// Get input products with quantities by unit
export const getInputQuantitiesByUnit = (
convert: GoodsConvertListView
): Map<MeasuringUnit, number> => {
const quantities = new Map<MeasuringUnit, number>();

convert.input_items.forEach((item) => {
const unit = item.stock_unit.product.measuring_unit;
const qty = item.quantity_consumed;
quantities.set(unit, (quantities.get(unit) || 0) + qty);
});

return quantities;
};

// Calculate total wastage from output units (for completed converts)
export const calculateTotalWastage = (
outputUnits: Array<{ adjustments: Array<{ quantity_adjusted: number }> }>
): number => {
return outputUnits.reduce((total, unit) => {
const unitWastage = unit.adjustments
.filter((adj) => adj.quantity_adjusted < 0) // Negative = wastage
.reduce((sum, adj) => sum + Math.abs(adj.quantity_adjusted), 0);
return total + unitWastage;
}, 0);
};

---

10.2 Create Status Badge Component

File: src/components/ui/convert-status-badge.tsx

import type { ConvertStatus } from "@/types/database/enums";

export const ConvertStatusBadge = ({ status }: { status: ConvertStatus }) => {
const variants = {
in_progress: { text: "In Progress", color: "primary" },
completed: { text: "Completed", color: "success" },
cancelled: { text: "Cancelled", color: "gray" },
};

const variant = variants[status];

return (
<Badge color={variant.color}>
{variant.text}
</Badge>
);
};

---

Phase 11: Enums & Constants

11.1 Add to Database Enums

File: src/types/database/enums.ts

export type ConvertStatus = "in_progress" | "completed" | "cancelled";

---

Implementation Order

Priority 1: Foundation (Database & Types)

1. ✅ Update schema migration (0038)
2. ✅ Update RPC functions (0039)
3. ✅ Create type definitions
4. ✅ Create validations
5. ✅ Create queries
6. ✅ Create hooks

Priority 2: Shared Components

7. ✅ Generalize StockUnitFormSheet
8. ✅ Create OutputProductSelectionStep
9. ✅ Create ConvertStatusBadge
10. ✅ Create utility functions

Priority 3: Create Flow

11. ✅ Create ConvertDetailsStep
12. ✅ Create JobWorkLinkToStep (dummy)
13. ✅ Create main create page

Priority 4: List & Details

14. ✅ Create list page
15. ✅ Create detail page layout
16. ✅ Create tab pages (details, input, output)

Priority 5: Complete & Edit

17. ✅ Create OutputStockUnitCreationStep
18. ✅ Create CompletionDetailsStep
19. ✅ Create complete page
20. ✅ Create edit page

Priority 6: Actions & Polish

21. ✅ Add cancel dialog
22. ✅ Add delete confirmation
23. ✅ Add action menu integration
24. ✅ Add routing and navigation
25. ✅ Add permissions integration
26. ✅ Add quick action to inventory page
27. ✅ Add goods convert to sidebar

---

Testing Checklist

Create Flow

- Can select vendor (optional)
- Can skip job work selection
- Can select output product (required)
- Can scan/select input stock units (status='available')
- Can select service type from attributes
- Can set start date
- Can add reference and notes
- Creates convert with status='in_progress'
- Input stock units status → 'processing'

Complete Flow

- Auto-opens stock unit form on first land
- Can add multiple output units with different specs
- Can add wastage per output unit
- Can set completion date
- Completion creates output stock units with origin_type='convert'
- Wastage creates negative adjustments
- Input stock units status → 'available'
- Convert status → 'completed'

Edit Flow

- Pre-fills all fields correctly
- Cannot edit warehouse or output product
- Can change vendor, service type, start date
- Can change input items (delete old + add new)
- Reconciliation updates stock unit status correctly

List Page

- Shows input products summary
- Shows output quantity (0 if in_progress)
- Filters work (status, vendor, product, date)
- Grouped by month correctly
- Pagination works
- Status badge displays correctly

Details Page

- Header metrics show conditionally (only input for in_progress)
- Tabs switch correctly
- Input units tab shows all inputs with quantities
- Output units tab shows outputs with wastage
- Actions menu shows correct options based on status
- Complete action navigates to complete flow
- Edit action navigates to edit flow
- Cancel action shows dialog and updates status
- Delete action works for in_progress only
