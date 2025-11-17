# Sales Order View/Edit/Delete - Pending Tasks

## Completed ✅

- [x] Update sales orders list page with navigation and StatusBadge
- [x] Create sales order view page with header and tabs
- [x] Build Order Details tab sections (view-only)
- [x] Create all edit sheets with discount type support:
  - InstructionsEditSheet
  - CustomerEditSheet
  - AgentEditSheet
  - WarehouseEditSheet (with has_outward validation)
  - PaymentTermsEditSheet (with discount type RadioGroupPills)
  - ShipmentEditSheet
  - LineItemsEditSheet (full-screen editor with ProductSelectionStep)

## Pending Tasks

### 1. Build Outwards Tab
Currently shows placeholder text. Need to:
- Fetch and display linked goods outward records for the order
- Show outward details (outward number, date, items dispatched, status)
- Display dispatch progress per line item
- Add links to outward detail pages
- Show "No outwards" state when has_outward is false

**Files to modify:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/page.tsx`

---

### 2. Create OrderActionsMenu and DeleteOrderDialog
The three-dot menu button currently just logs. Need to:
- Create dropdown menu component with actions based on order status
- Implement delete dialog with validation:
  - Can delete if: `status === 'approval_pending' OR !has_outward`
  - Show warning message explaining why delete is blocked (if applicable)
  - Soft delete using `deleted_at` field
- Add contextual menu actions:
  - **All statuses:** Delete order, Duplicate order, Export PDF
  - **Approval pending:** Approve order, Cancel order
  - **In progress/Overdue:** Mark as completed, Cancel order
  - **Completed:** Mark as incomplete (reopen)

**Files to create:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/OrderActionsMenu.tsx`
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/DeleteOrderDialog.tsx`

**Files to modify:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/page.tsx`

---

### 3. Implement Approve Order Logic
The "Approve order" button currently logs. Need to:
- Create confirmation dialog: "Approve this order?"
- Update order status from `approval_pending` to `in_progress`
- Add status change tracking:
  - Set `status_changed_at` to current timestamp
  - Set `status_changed_by` to current user ID
- Show success toast and refresh order data
- Handle errors appropriately

**Files to create:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/ApproveOrderDialog.tsx`

**Files to modify:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/page.tsx`

---

### 4. Integrate with Goods Outward Creation
The "Create outward" button navigates but needs full integration:
- Pass order ID via query parameter: `/goods-outward/create?order_id={orderId}`
- Update goods outward create page to:
  - Detect `order_id` query param
  - Fetch sales order data
  - Pre-fill warehouse, customer/recipient
  - Pre-select line items with pending quantities
  - Show "Creating outward from SO-{number}" indicator
- After outward creation, redirect back to order detail page

**Files to modify:**
- `src/app/warehouse/[warehouse_slug]/(flow)/goods-outward/create/page.tsx` (or app version)
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/page.tsx`

---

### 5. Add Permission Gates and Validation
Need to add proper authorization and validation:

**Permission checks:**
- Edit buttons: Check `sales_orders.update` permission
- Delete action: Check `sales_orders.delete` permission
- Approve button: Check `sales_orders.update` permission
- Hide/disable actions based on user role (staff can only access assigned warehouse)

**Status-based validation:**
- Cannot edit line items if status is `completed` or `cancelled`
- Cannot edit warehouse if `has_outward` is true
- Cannot approve if status is not `approval_pending`
- Cannot delete if `has_outward` is true AND status is not `approval_pending`

**Implementation:**
- Use `useSession()` hook to get user permissions
- Create helper function: `canEditOrder(order, user)`
- Add conditional rendering/disabling for protected actions
- Show appropriate error messages when actions are blocked

**Files to modify:**
- `src/app/warehouse/[warehouse_slug]/(app)/sales-orders/[sequence_number]/page.tsx`
- All edit sheet components (add permission checks)

---

### 6. Test All Functionality
End-to-end testing of complete feature:

**Edit Sheets:**
- [ ] Test all 7 edit sheets open correctly
- [ ] Verify data saves and UI refreshes
- [ ] Test validation (e.g., warehouse edit blocked if has_outward)
- [ ] Test discount type switching (none/percentage/flat_amount)
- [ ] Test line items edit (add/update/delete products)
- [ ] Test responsive behavior (Dialog on desktop, Drawer on mobile)

**Delete Flow:**
- [ ] Test delete validation (approval_pending OR !has_outward)
- [ ] Verify soft delete (deleted_at set, not hard delete)
- [ ] Test error message when delete is blocked
- [ ] Verify redirect after successful delete

**Approve Flow:**
- [ ] Test approve button only shows for approval_pending orders
- [ ] Verify status changes to in_progress
- [ ] Verify status_changed_at and status_changed_by are set
- [ ] Test error handling

**Navigation:**
- [ ] Test list → detail → back navigation
- [ ] Test detail → create outward → back navigation
- [ ] Verify breadcrumbs (if implemented)

**Permissions:**
- [ ] Test as admin (full access)
- [ ] Test as staff (limited to assigned warehouse)
- [ ] Verify RLS policies enforce data access
- [ ] Test permission-based UI hiding/disabling

**Edge Cases:**
- [ ] Test with order that has no line items
- [ ] Test with order that has no agent
- [ ] Test with order that has no expected delivery date
- [ ] Test with overdue orders
- [ ] Test with cancelled/completed orders

---

## Future Enhancements (Not Required for MVP)

- [ ] Add audit log/activity feed showing all changes to order
- [ ] Implement invoice generation ("Make invoice" button)
- [ ] Add order duplication functionality
- [ ] Export order as PDF
- [ ] Add bulk actions on list page (bulk approve, bulk delete)
- [ ] Add order notes/comments with @mentions
- [ ] Email notifications on status changes
- [ ] WhatsApp integration for order updates
