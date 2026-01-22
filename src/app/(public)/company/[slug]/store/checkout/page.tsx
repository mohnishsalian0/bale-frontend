"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { IconArrowLeft, IconLoader2, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { useCart, type CartItem } from "@/contexts/cart-context";
import { getCompanyBySlug, type PublicCompany } from "@/lib/queries/catalog";
import { createCatalogOrder } from "@/lib/queries/catalog-orders";
import { LoadingState } from "@/components/layouts/loading-state";
import { ProductQuantitySheet } from "../ProductQuantitySheet";
import { toast } from "sonner";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  gstin: string;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPinCode: string;
  specialInstructions: string;
  termsAccepted: boolean;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { items: cartItems, clearCart, updateQuantity, removeItem } = useCart();

  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Quantity sheet state
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    pinCode: "",
    gstin: "",
    shippingSameAsBilling: true,
    shippingAddressLine1: "",
    shippingAddressLine2: "",
    shippingCity: "",
    shippingState: "",
    shippingCountry: "",
    shippingPinCode: "",
    specialInstructions: "",
    termsAccepted: false,
  });

  useEffect(() => {
    async function fetchCompany() {
      try {
        const companyData = await getCompanyBySlug(slug);
        if (!companyData) {
          router.push("/");
          return;
        }
        setCompany(companyData);
      } catch (error) {
        console.error("Error fetching company:", error);
        toast.error("Failed to load checkout page");
      } finally {
        setLoading(false);
      }
    }

    fetchCompany();

    // Clear cart on unmount after successful order
    return () => {
      if (submitting) {
        clearCart();
      }
    };
  }, [clearCart, router, slug, submitting]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!loading && cartItems.length === 0) {
      router.push(`/company/${slug}/store/products`);
    }
  }, [cartItems, loading, slug, router]);

  const handleOpenQuantitySheet = (item: CartItem) => {
    setSelectedItem(item);
    setShowQuantitySheet(true);
  };

  const handleConfirmQuantity = (quantity: number) => {
    if (selectedItem) {
      updateQuantity(selectedItem.product.id, quantity);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      toast.error("Please fill in all required contact details");
      return;
    }

    if (
      !formData.addressLine1 ||
      !formData.city ||
      !formData.state ||
      !formData.country ||
      !formData.pinCode
    ) {
      toast.error("Please fill in all required billing address fields");
      return;
    }

    if (
      !formData.shippingSameAsBilling &&
      (!formData.shippingAddressLine1 ||
        !formData.shippingCity ||
        !formData.shippingState ||
        !formData.shippingCountry ||
        !formData.shippingPinCode)
    ) {
      toast.error("Please fill in all required shipping address fields");
      return;
    }

    if (!formData.termsAccepted) {
      toast.error("You must accept the terms and conditions");
      return;
    }

    try {
      setSubmitting(true);
      const order = await createCatalogOrder({
        companyId: company.id,
        formData,
        cartItems,
      });

      // Redirect to order confirmation page (cart cleared in cleanup)
      router.push(`/company/${slug}/order/${order.id}`);
      toast.success("Order placed successfully!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading checkout..." />;
  }

  if (!company || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/company/${slug}/store/products`)}
          className="mb-4"
        >
          <IconArrowLeft className="size-4" />
          Back to store
        </Button>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          </div>

          {/* Illustration */}
          <div className="relative size-25 shrink-0">
            <Image
              src="/illustrations/sales-order-cart.png"
              alt="Store"
              fill
              sizes="100px"
              className="object-contain"
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Items Summary */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Order Items
          </h2>
          <div className="space-y-6">
            {cartItems.map((item) => {
              const imageUrl = item.product.product_images?.[0];
              const productInfoText = getProductInfo(item.product);
              const unitAbbreviation = getMeasuringUnitAbbreviation(
                item.product.measuring_unit as MeasuringUnit | null,
              );

              return (
                <div key={item.product.id} className="flex items-center gap-3">
                  {/* Product Image */}
                  <ImageWrapper
                    size="md"
                    shape="square"
                    imageUrl={imageUrl}
                    alt={item.product.name}
                    placeholderIcon={getProductIcon(
                      item.product.stock_type as StockType,
                    )}
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={item.product.name}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {item.product.name}
                    </p>
                    <p
                      title={productInfoText}
                      className="text-xs text-gray-500 truncate"
                    >
                      {productInfoText}
                    </p>
                  </div>

                  {/* Quantity and Delete Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenQuantitySheet(item)}
                    >
                      {item.quantity} {unitAbbreviation}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeItem(item.product.id)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Details */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Contact Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWrapper
              label="First Name"
              placeholder="Enter first name"
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
              required
            />

            <InputWrapper
              label="Last Name"
              placeholder="Enter last name"
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
              required
            />

            <InputWrapper
              label="Phone"
              placeholder="Enter phone number"
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              required
            />

            <InputWrapper
              label="Email"
              placeholder="Enter email address"
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
        </section>

        {/* Address */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Billing Address
          </h2>
          <div className="space-y-4">
            <InputWrapper
              label="Address Line 1"
              placeholder="Enter address line 1"
              id="addressLine1"
              value={formData.addressLine1}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  addressLine1: e.target.value,
                }))
              }
              required
            />

            <InputWrapper
              label="Address Line 2"
              placeholder="Enter address line 2"
              id="addressLine2"
              value={formData.addressLine2}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  addressLine2: e.target.value,
                }))
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputWrapper
                label="City"
                placeholder="Enter city"
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                required
              />

              <InputWrapper
                label="State"
                placeholder="Enter state"
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, state: e.target.value }))
                }
                required
              />

              <InputWrapper
                label="Country"
                placeholder="Enter country"
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
                required
              />

              <InputWrapper
                label="Pin Code"
                placeholder="Enter pin code"
                id="pinCode"
                value={formData.pinCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pinCode: e.target.value,
                  }))
                }
                required
              />
            </div>

            {/* Shipping Same as Billing Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="shippingSameAsBilling"
                checked={formData.shippingSameAsBilling}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    shippingSameAsBilling: checked === true,
                  }))
                }
              />
              <Label
                htmlFor="shippingSameAsBilling"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Shipping address same as billing address
              </Label>
            </div>

            {/* Shipping Address (conditional) */}
            {!formData.shippingSameAsBilling && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-base font-semibold text-gray-900">
                  Shipping Address
                </h3>

                <InputWrapper
                  label="Address Line 1"
                  placeholder="Enter shipping address line 1"
                  id="shippingAddressLine1"
                  value={formData.shippingAddressLine1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingAddressLine1: e.target.value,
                    }))
                  }
                  required
                />

                <InputWrapper
                  label="Address Line 2"
                  placeholder="Enter shipping address line 2"
                  id="shippingAddressLine2"
                  value={formData.shippingAddressLine2}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shippingAddressLine2: e.target.value,
                    }))
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputWrapper
                    label="City"
                    placeholder="Enter city"
                    id="shippingCity"
                    value={formData.shippingCity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingCity: e.target.value,
                      }))
                    }
                    required
                  />

                  <InputWrapper
                    label="State"
                    placeholder="Enter state"
                    id="shippingState"
                    value={formData.shippingState}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingState: e.target.value,
                      }))
                    }
                    required
                  />

                  <InputWrapper
                    label="Country"
                    placeholder="Enter country"
                    id="shippingCountry"
                    value={formData.shippingCountry}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingCountry: e.target.value,
                      }))
                    }
                    required
                  />

                  <InputWrapper
                    label="Pin Code"
                    placeholder="Enter pin code"
                    id="shippingPinCode"
                    value={formData.shippingPinCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingPinCode: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Additional Information */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Information
          </h2>
          <div className="space-y-4">
            <InputWrapper
              label="GSTIN"
              placeholder="22AAAAA0000A1Z5"
              id="gstin"
              value={formData.gstin}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gstin: e.target.value }))
              }
            />

            <div>
              <Label htmlFor="specialInstructions" className="mb-1">
                Special Instructions
              </Label>
              <Textarea
                id="specialInstructions"
                rows={4}
                placeholder="Any special instructions or notes for your order..."
                value={formData.specialInstructions}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    specialInstructions: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="termsAccepted"
            checked={formData.termsAccepted}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                termsAccepted: checked === true,
              }))
            }
          />
          <Label htmlFor="termsAccepted" className="cursor-pointer" required>
            I agree to the terms and conditions{" "}
          </Label>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/company/${slug}/store/products`)}
            disabled={submitting}
          >
            Back
          </Button>
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Order"
            )}
          </Button>
        </div>
      </form>

      {/* Quantity Sheet */}
      {showQuantitySheet && (
        <ProductQuantitySheet
          open={showQuantitySheet}
          onOpenChange={setShowQuantitySheet}
          product={selectedItem?.product || null}
          initialQuantity={selectedItem?.quantity}
          onConfirm={handleConfirmQuantity}
        />
      )}
    </div>
  );
}
