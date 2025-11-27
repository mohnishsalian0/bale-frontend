"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { IconArrowLeft, IconLoader2, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCart, type CartItem } from "@/contexts/cart-context";
import { getCompanyBySlug } from "@/lib/queries/catalog";
import { createCatalogOrder } from "@/lib/queries/catalog-orders";
import { LoadingState } from "@/components/layouts/loading-state";
import { ProductQuantitySheet } from "../ProductQuantitySheet";
import type { Tables } from "@/types/database/supabase";
import { toast } from "sonner";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";

type Company = Tables<"companies">;

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
  specialInstructions: string;
  termsAccepted: boolean;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { items: cartItems, clearCart, updateQuantity, removeItem } = useCart();

  const [company, setCompany] = useState<Company | null>(null);
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
  }, []);

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
      toast.error("Please fill in all required address fields");
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
      console.log("Order", order.id);

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
            <div>
              <Label htmlFor="firstName" className="mb-1" required>
                First Name
              </Label>
              <Input
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
            </div>

            <div>
              <Label htmlFor="lastName" className="mb-1" required>
                Last Name{" "}
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1" required>
                Phone{" "}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="mb-1">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="addressLine1" className="mb-1" required>
                Address Line 1{" "}
              </Label>
              <Input
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
            </div>

            <div>
              <Label htmlFor="addressLine2" className="mb-1">
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    addressLine2: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="mb-1" required>
                  City{" "}
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="state" className="mb-1" required>
                  State{" "}
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="country" className="mb-1" required>
                  Country{" "}
                </Label>
                <Input
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
              </div>

              <div>
                <Label htmlFor="pinCode" className="mb-1" required>
                  Pin Code{" "}
                </Label>
                <Input
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
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="rounded-lg border-2 border-border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gstin" className="mb-1">
                GSTIN
              </Label>
              <Input
                id="gstin"
                placeholder="22AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gstin: e.target.value }))
                }
              />
            </div>

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
      <ProductQuantitySheet
        open={showQuantitySheet}
        onOpenChange={setShowQuantitySheet}
        product={selectedItem?.product || null}
        initialQuantity={selectedItem?.quantity}
        onConfirm={handleConfirmQuantity}
      />
    </div>
  );
}
