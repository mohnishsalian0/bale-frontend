import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Return Policy | Bale",
  description: "Shipping and return policy for Bale e-commerce products",
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-background-50 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Shipping & Return Policy
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <p>
                This policy applies to physical products (such as trading cards)
                purchased through our e-commerce platform. Subscription services
                for the Bale inventory management platform are delivered
                digitally and do not require shipping.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Shipping Policy
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Shipping Method
              </h3>
              <p>
                Orders for users are shipped through registered domestic courier
                companies and/or speed post only. We partner with reliable
                courier services to ensure your products reach you safely.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Processing & Delivery Time
              </h3>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Orders are shipped within <strong>7-10 business days</strong>{" "}
                  from the date of the order and/or payment
                </li>
                <li>
                  Delivery time is subject to courier company/post office norms
                  and may vary based on your location
                </li>
                <li>
                  We will provide you with tracking information once your order
                  is dispatched
                </li>
                <li>
                  Delivery timeline may be communicated at the time of order
                  confirmation
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Delivery Address
              </h3>
              <p>
                Delivery of all orders will be made to the address provided by
                the buyer at the time of purchase. Please ensure that the
                shipping address is accurate and complete. We are not
                responsible for delays or non-delivery due to incorrect address
                information.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Shipping Charges
              </h3>
              <p>
                Shipping charges (if applicable) will be displayed at checkout.
                If there are any shipping costs levied by the seller or Platform
                Owner, <strong>the same is not refundable</strong> unless the
                product was defective or the wrong item was sent.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Shipping Delays
              </h3>
              <p>
                Platform Owner (Bale) shall not be liable for any delay in
                delivery by the courier company/postal authority. Delays may
                occur due to factors beyond our control, including weather
                conditions, courier backlogs, or unforeseen circumstances. We
                appreciate your patience and understanding.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Order Confirmation
              </h3>
              <p>
                Delivery of our services will be confirmed via email to the
                email ID specified at the time of registration. You will receive
                order confirmation, shipping updates, and delivery notifications
                via email.
              </p>
            </section>

            <section className="bg-primary-50 p-6 rounded-lg border-l-4 border-primary-600">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Return Policy
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                3-Day Return Window
              </h3>
              <p>
                We offer refund/exchange within the first{" "}
                <strong>3 days</strong> from the date of your purchase. If 3
                days have passed since your purchase, you will not be offered a
                return, exchange or refund of any kind.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Eligibility for Returns
              </h3>
              <p>In order to be eligible for a return or an exchange:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  The purchased item should be{" "}
                  <strong>unused and in the same condition</strong> as you
                  received it
                </li>
                <li>
                  The item must have <strong>original packaging</strong> with
                  all tags and labels intact
                </li>
                <li>
                  If the item was purchased on sale, it may not be eligible for
                  return/exchange
                </li>
                <li>
                  Only items that are found{" "}
                  <strong>defective or damaged</strong> will be replaced (based
                  on an exchange request)
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Non-Returnable Items
              </h3>
              <p>
                You agree that there may be certain categories of products/items
                that are exempted from returns or refunds. Such categories will
                be clearly identified at the time of purchase. This may include:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Perishable goods</li>
                <li>Personalized or customized items</li>
                <li>
                  Items marked as &quot;Final Sale&quot; or
                  &quot;Non-Returnable&quot;
                </li>
                <li>Opened or used products (unless defective)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Return Process
              </h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Contact our customer service team within 3 days of
                  purchase/receipt
                </li>
                <li>
                  Provide your order number, reason for return, and photos (if
                  applicable)
                </li>
                <li>
                  Once your return request is approved, ship the product back to
                  us
                </li>
                <li>
                  Once your returned product is received and inspected by us, we
                  will send you an email notification
                </li>
                <li>
                  If approved after quality check, your request
                  (return/exchange) will be processed in accordance with our
                  policies
                </li>
              </ol>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Inspection & Processing
              </h3>
              <p>
                For exchange/return accepted requests (as applicable), once your
                returned product/item is received and inspected by us, we will
                send you an email to notify you about receipt of the
                returned/exchanged product. If the same has been approved after
                the quality check at our end, your request (i.e.,
                return/exchange) will be processed in accordance with our
                policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Contact Customer Service
              </h2>
              <p>
                For any shipping or return-related queries, please contact us:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:bale.inventory@gmail.com"
                    className="text-primary-600 hover:underline"
                  >
                    bale.inventory@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Phone:</strong>{" "}
                  <a
                    href="tel:9619915299"
                    className="text-primary-600 hover:underline"
                  >
                    9619915299
                  </a>
                </li>
                <li>
                  <strong>Support Hours:</strong> Monday - Friday (9:00 AM -
                  6:00 PM IST)
                </li>
              </ul>
            </section>

            <section className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Last Updated: January 2026
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
