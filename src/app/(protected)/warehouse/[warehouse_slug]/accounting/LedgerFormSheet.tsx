"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronDown } from "@tabler/icons-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputWrapper } from "@/components/ui/input-wrapper";
import {
  useLedgerById,
  useLedgerMutations,
  useParentGroups,
} from "@/lib/query/hooks/ledgers";
import { ledgerSchema, type LedgerFormData } from "@/lib/validations/ledger";
import type { Database } from "@/types/database/supabase";

type LedgerType = Database["public"]["Enums"]["ledger_type_enum"];

interface LedgerFormSheetProps {
  ledgerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LedgerFormSheet({
  ledgerId,
  open,
  onOpenChange,
}: LedgerFormSheetProps) {
  const isEdit = !!ledgerId;

  // Queries
  const { data: ledger } = useLedgerById(ledgerId);
  const { data: parentGroups } = useParentGroups();
  const { create, update } = useLedgerMutations();

  // Collapsible sections state
  const [showOpeningBalance, setShowOpeningBalance] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);
  const [showGstConfig, setShowGstConfig] = useState(true);
  const [showTdsConfig, setShowTdsConfig] = useState(true);

  // Form
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      gst_applicable: false,
      tds_applicable: false,
    },
  });

  // Watch fields for conditional rendering
  const ledger_type = useWatch({
    control,
    name: "ledger_type",
  }) as LedgerType | undefined;

  const gst_applicable = useWatch({
    control,
    name: "gst_applicable",
  });

  const tds_applicable = useWatch({
    control,
    name: "tds_applicable",
  });

  // Populate form when editing
  useEffect(() => {
    if (isEdit && ledger) {
      reset({
        name: ledger.name,
        parent_group_id: ledger.parent_group_id,
        ledger_type: ledger.ledger_type,
        opening_balance: ledger.opening_balance || undefined,
        dr_cr: ledger.dr_cr || undefined,
        gst_applicable: ledger.gst_applicable || false,
        gst_rate: ledger.gst_rate || undefined,
        gst_type:
          (ledger.gst_type as "CGST" | "SGST" | "IGST" | "CESS") || undefined,
        tds_applicable: ledger.tds_applicable || false,
        tds_rate: ledger.tds_rate || undefined,
        bank_name: ledger.bank_name || undefined,
        account_number: ledger.account_number || undefined,
        ifsc_code: ledger.ifsc_code || undefined,
        branch_name: ledger.branch_name || undefined,
      });
    } else {
      reset({
        gst_applicable: false,
        tds_applicable: false,
      });
    }
  }, [isEdit, ledger, reset]);

  const onSubmit = async (data: LedgerFormData) => {
    try {
      if (isEdit) {
        await update.mutateAsync({ id: ledgerId, updates: data });
      } else {
        await create.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error toast handled by mutation
      console.error("Failed to save ledger:", error);
    }
  };

  const isSystemLedger = ledger?.is_default || ledger?.partner_id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Ledger" : "Create Ledger"}</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <div className="flex flex-col gap-6 px-4 py-5">
              <InputWrapper
                label="Ledger Name"
                placeholder="e.g., HDFC Bank"
                {...register("name")}
                required
                isError={!!errors.name}
                errorText={errors.name?.message}
              />

              <div className="flex flex-col gap-1">
                <Label
                  required
                  htmlFor="parent_group_id"
                  className="text-sm font-medium text-gray-700"
                >
                  Parent Group
                </Label>
                <Controller
                  control={control}
                  name="parent_group_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!isSystemLedger}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent group" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentGroups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.parent_group_id && (
                  <p className="text-sm text-red-600">
                    {errors.parent_group_id.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label
                  required
                  htmlFor="ledger_type"
                  className="text-sm font-medium text-gray-700"
                >
                  Ledger Type
                </Label>
                <Controller
                  control={control}
                  name="ledger_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!isSystemLedger}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ledger type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="party">Party</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="tax">Tax</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.ledger_type && (
                  <p className="text-sm text-red-600">
                    {errors.ledger_type.message}
                  </p>
                )}
              </div>
            </div>

            {/* Opening Balance */}
            <Collapsible
              open={showOpeningBalance}
              onOpenChange={setShowOpeningBalance}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showOpeningBalance ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Opening Balance
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showOpeningBalance ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  <div className="flex gap-4">
                    <InputWrapper
                      type="number"
                      label="Amount"
                      placeholder="0.00"
                      step="0.01"
                      {...register("opening_balance", { valueAsNumber: true })}
                      className="flex-1"
                      isError={!!errors.opening_balance}
                      errorText={errors.opening_balance?.message}
                    />

                    <div className="flex-1 flex flex-col gap-1">
                      <Label className="text-sm font-medium text-gray-700">
                        Dr/Cr
                      </Label>
                      <Controller
                        control={control}
                        name="dr_cr"
                        render={({ field }) => (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex gap-4 mt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="debit" id="debit" />
                              <Label htmlFor="debit" className="font-normal">
                                Debit
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="credit" id="credit" />
                              <Label htmlFor="credit" className="font-normal">
                                Credit
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Bank Details (shown only for bank type) */}
            {ledger_type === "bank" && (
              <Collapsible
                open={showBankDetails}
                onOpenChange={setShowBankDetails}
                className="border-t border-gray-200 px-4 py-5"
              >
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full ${showBankDetails ? "mb-5" : "mb-0"}`}
                >
                  <h3 className="text-lg font-medium text-gray-900">
                    Bank Details
                  </h3>
                  <IconChevronDown
                    className={`size-6 text-gray-500 transition-transform ${showBankDetails ? "rotate-180" : "rotate-0"}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex flex-col gap-6">
                    <InputWrapper
                      label="Bank Name"
                      placeholder="e.g., HDFC Bank"
                      {...register("bank_name")}
                      isError={!!errors.bank_name}
                      errorText={errors.bank_name?.message}
                    />

                    <InputWrapper
                      label="Account Number"
                      placeholder="e.g., 1234567890"
                      {...register("account_number")}
                      isError={!!errors.account_number}
                      errorText={errors.account_number?.message}
                    />

                    <InputWrapper
                      label="IFSC Code"
                      placeholder="e.g., HDFC0001234"
                      maxLength={11}
                      {...register("ifsc_code")}
                      isError={!!errors.ifsc_code}
                      errorText={errors.ifsc_code?.message}
                    />

                    <InputWrapper
                      label="Branch Name"
                      placeholder="e.g., Andheri West"
                      {...register("branch_name")}
                      isError={!!errors.branch_name}
                      errorText={errors.branch_name?.message}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* GST Configuration */}
            <Collapsible
              open={showGstConfig}
              onOpenChange={setShowGstConfig}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showGstConfig ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  GST Configuration
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showGstConfig ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={control}
                      name="gst_applicable"
                      render={({ field }) => (
                        <Checkbox
                          id="gst_applicable"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="gst_applicable" className="font-normal">
                      GST Applicable
                    </Label>
                  </div>

                  {gst_applicable && (
                    <div className="flex gap-4">
                      <InputWrapper
                        type="number"
                        label="GST Rate (%)"
                        placeholder="e.g., 18"
                        step="0.01"
                        {...register("gst_rate", { valueAsNumber: true })}
                        className="flex-1"
                        isError={!!errors.gst_rate}
                        errorText={errors.gst_rate?.message}
                      />

                      <div className="flex-1 flex flex-col gap-1">
                        <Label
                          htmlFor="gst_type"
                          className="text-sm font-medium text-gray-700"
                        >
                          GST Type
                        </Label>
                        <Controller
                          control={control}
                          name="gst_type"
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CGST">CGST</SelectItem>
                                <SelectItem value="SGST">SGST</SelectItem>
                                <SelectItem value="IGST">IGST</SelectItem>
                                <SelectItem value="CESS">CESS</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.gst_type && (
                          <p className="text-sm text-red-600">
                            {errors.gst_type.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* TDS Configuration */}
            <Collapsible
              open={showTdsConfig}
              onOpenChange={setShowTdsConfig}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showTdsConfig ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  TDS Configuration
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showTdsConfig ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  <div className="flex items-center space-x-2">
                    <Controller
                      control={control}
                      name="tds_applicable"
                      render={({ field }) => (
                        <Checkbox
                          id="tds_applicable"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="tds_applicable" className="font-normal">
                      TDS Applicable
                    </Label>
                  </div>

                  {tds_applicable && (
                    <InputWrapper
                      type="number"
                      label="TDS Rate (%)"
                      placeholder="e.g., 0.1"
                      step="0.01"
                      {...register("tds_rate", { valueAsNumber: true })}
                      isError={!!errors.tds_rate}
                      errorText={errors.tds_rate?.message}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <SheetFooter>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
