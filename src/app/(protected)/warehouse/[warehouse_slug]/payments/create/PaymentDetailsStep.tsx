"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCounterLedgers } from "@/lib/query/hooks/payments";
import { dateToISOString } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import type { PaymentMode } from "@/types/database/enums";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPercentage,
} from "@tabler/icons-react";

const AMOUNT_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

interface PaymentDetailsFormData {
  advanceAmount?: string;
  counterLedgerId: string;
  paymentDate: string;
  paymentMode: PaymentMode | "";
  notes: string;
  tdsApplicable: boolean;
  tdsRate: string;
  // Instrument fields (cheque, demand_draft)
  instrumentNumber?: string;
  instrumentDate?: string;
  instrumentBank?: string;
  instrumentBranch?: string;
  instrumentIfsc?: string;
  // Digital payment fields
  transactionId?: string;
  vpa?: string;
  cardLastFour?: string;
}

interface PaymentDetailsStepProps {
  isAdvanceFlow: boolean;
  totalAmount: number;
  formData: PaymentDetailsFormData;
  setFormData: (data: Partial<PaymentDetailsFormData>) => void;
}

export function PaymentDetailsStep({
  isAdvanceFlow,
  totalAmount,
  formData,
  setFormData,
}: PaymentDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { data: counterLedgers = [], isLoading } = useCounterLedgers();

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Advance Amount - Only for advance flow */}
        {isAdvanceFlow && (
          <div className="space-y-2">
            <InputWrapper
              label="Advance Amount"
              type="number"
              placeholder="Enter amount"
              value={formData.advanceAmount || ""}
              onChange={(e) => setFormData({ advanceAmount: e.target.value })}
              icon={<IconCurrencyRupee />}
              min="0"
              step="0.01"
              required
            />
            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((amount) => (
                <Badge
                  key={amount}
                  variant="secondary"
                  color="gray"
                  onClick={() => {
                    const currentAmount = parseFloat(
                      formData.advanceAmount || "0",
                    );
                    const newAmount = currentAmount + amount;
                    setFormData({ advanceAmount: newAmount.toString() });
                  }}
                  className="cursor-pointer hover:bg-gray-200 select-none"
                >
                  +₹{amount.toLocaleString("en-IN")}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Counter Ledger (Bank/Cash) */}
        <div className="space-y-2">
          <Label required htmlFor="counter-ledger">
            Bank/Cash Account
          </Label>
          <Select
            value={formData.counterLedgerId}
            onValueChange={(value) => setFormData({ counterLedgerId: value })}
          >
            <SelectTrigger id="counter-ledger">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <div className="p-2 text-sm text-gray-500">Loading...</div>
              ) : counterLedgers.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">
                  No accounts found
                </div>
              ) : (
                counterLedgers.map((ledger) => (
                  <SelectItem key={ledger.id} value={ledger.id}>
                    {ledger.name}
                    {ledger.parent_group && ` (${ledger.parent_group.name})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Date */}
        <div className="space-y-2">
          <Label required>Payment Date</Label>
          <DatePicker
            placeholder="Pick a date"
            value={
              formData.paymentDate ? new Date(formData.paymentDate) : undefined
            }
            onChange={(date) =>
              setFormData({
                paymentDate: date ? dateToISOString(date) : "",
              })
            }
          />
        </div>

        {/* Payment Mode */}
        <div className="space-y-2">
          <Label required>Payment Mode</Label>
          <RadioGroup
            value={formData.paymentMode}
            onValueChange={(value) =>
              setFormData({ paymentMode: value as PaymentMode })
            }
            name="payment-mode"
            className="flex-wrap"
          >
            <RadioGroupItem value="cash">Cash</RadioGroupItem>
            <RadioGroupItem value="cheque">Cheque</RadioGroupItem>
            <RadioGroupItem value="demand_draft">Demand Draft</RadioGroupItem>
            <RadioGroupItem value="neft">NEFT</RadioGroupItem>
            <RadioGroupItem value="rtgs">RTGS</RadioGroupItem>
            <RadioGroupItem value="imps">IMPS</RadioGroupItem>
            <RadioGroupItem value="upi">UPI</RadioGroupItem>
            <RadioGroupItem value="card">Card</RadioGroupItem>
          </RadioGroup>
        </div>

        {/* Instrument Fields - Cheque & Demand Draft */}
        {(formData.paymentMode === "cheque" ||
          formData.paymentMode === "demand_draft") && (
          <>
            <div className="flex gap-4">
              <InputWrapper
                type="text"
                placeholder={`Enter ${formData.paymentMode === "cheque" ? "cheque" : "DD"} number`}
                value={formData.instrumentNumber || ""}
                onChange={(e) =>
                  setFormData({ instrumentNumber: e.target.value })
                }
                maxLength={20}
                className="flex-1"
              />

              <DatePicker
                placeholder={`Enter ${formData.paymentMode === "cheque" ? "Cheque" : "DD"} date`}
                value={
                  formData.instrumentDate
                    ? new Date(formData.instrumentDate)
                    : undefined
                }
                onChange={(date) =>
                  setFormData({
                    instrumentDate: date ? dateToISOString(date) : "",
                  })
                }
                className="flex-1"
              />
            </div>

            <div className="flex gap-4">
              <InputWrapper
                type="text"
                placeholder="Enter drawer bank name"
                value={formData.instrumentBank || ""}
                onChange={(e) =>
                  setFormData({ instrumentBank: e.target.value })
                }
                maxLength={100}
                className="flex-1"
              />

              <InputWrapper
                type="text"
                placeholder="Enter drawer branch name"
                value={formData.instrumentBranch || ""}
                onChange={(e) =>
                  setFormData({ instrumentBranch: e.target.value })
                }
                maxLength={100}
                className="flex-1"
              />
            </div>

            <InputWrapper
              type="text"
              placeholder="Enter drawer IFSC code"
              value={formData.instrumentIfsc || ""}
              onChange={(e) =>
                setFormData({ instrumentIfsc: e.target.value.toUpperCase() })
              }
              maxLength={11}
            />
          </>
        )}

        {/* Digital Payment Fields - NEFT/RTGS/IMPS */}
        {(formData.paymentMode === "neft" ||
          formData.paymentMode === "rtgs" ||
          formData.paymentMode === "imps") && (
          <InputWrapper
            type="text"
            placeholder="Enter transaction ID or UTR number"
            value={formData.transactionId || ""}
            onChange={(e) => setFormData({ transactionId: e.target.value })}
            maxLength={50}
          />
        )}

        {/* UPI Fields */}
        {formData.paymentMode === "upi" && (
          <div className="flex gap-4">
            <InputWrapper
              type="text"
              placeholder="Enter UPI transaction ID"
              value={formData.transactionId || ""}
              onChange={(e) => setFormData({ transactionId: e.target.value })}
              maxLength={50}
              className="flex-1"
            />

            <InputWrapper
              type="text"
              placeholder="Enter UPI ID (e.g., user@upi)"
              value={formData.vpa || ""}
              onChange={(e) => setFormData({ vpa: e.target.value })}
              maxLength={100}
              className="flex-1"
            />
          </div>
        )}

        {/* Card Payment Fields */}
        {formData.paymentMode === "card" && (
          <div className="flex gap-4">
            <InputWrapper
              type="text"
              placeholder="Enter transaction ID"
              value={formData.transactionId || ""}
              onChange={(e) => setFormData({ transactionId: e.target.value })}
              maxLength={50}
              className="flex-1"
            />

            <InputWrapper
              type="text"
              placeholder="Enter last 4 digits of the card"
              value={formData.cardLastFour || ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setFormData({ cardLastFour: value });
              }}
              maxLength={4}
              className="flex-1"
            />
          </div>
        )}

        {/* Direct Tax */}
        <div className="space-y-2">
          <Label>Direct Tax</Label>
          <RadioGroup
            value={formData.tdsApplicable ? "tds" : "none"}
            onValueChange={(value) => {
              const isTds = value === "tds";
              setFormData({ tdsApplicable: isTds });
              if (!isTds) {
                setFormData({ tdsRate: "" });
              }
            }}
            name="direct-tax"
            className="flex-wrap"
          >
            <RadioGroupItem value="none">No direct tax</RadioGroupItem>
            <RadioGroupItem value="tds">TDS</RadioGroupItem>
          </RadioGroup>
        </div>

        {/* TDS Rate - Only shown when TDS is applicable */}
        {formData.tdsApplicable && (
          <div className="space-y-2">
            <InputWrapper
              label="TDS Rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Enter rate"
              value={formData.tdsRate}
              onChange={(e) => setFormData({ tdsRate: e.target.value })}
              icon={<IconPercentage className="size-4" />}
              required
            />
            {formData.tdsRate && totalAmount > 0 && (
              <p className="text-xs text-gray-500">
                TDS Amount:{" "}
                {formatCurrency(
                  (totalAmount * parseFloat(formData.tdsRate)) / 100,
                )}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Additional Details - Collapsible */}
      <Collapsible
        open={showAdditionalDetails}
        onOpenChange={setShowAdditionalDetails}
        className="border-t border-gray-200 px-4 py-5"
      >
        <CollapsibleTrigger
          className={`flex items-center justify-between w-full ${showAdditionalDetails ? "mb-5" : "mb-0"}`}
        >
          <h3 className="text-lg font-medium text-gray-900">
            Additional Details
          </h3>
          <IconChevronDown
            className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : "rotate-0"}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-6">
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
