import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | Bale",
  description: "Refund and cancellation policy for Bale subscription and e-commerce products",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background-50 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Refund & Cancellation Policy
          </h1>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <section>
              <p>
                This refund and cancellation policy outlines how you can cancel or seek a refund for a product/service
                that you have purchased through the Platform. Bale offers two types of products: <strong>subscription services</strong> (yearly access to inventory management platform) and <strong>physical products</strong> (trading cards). Each has different refund terms as outlined below.
              </p>
            </section>

            <section className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-600">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Subscription Services (Inventory Management Platform)
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                1 Month Money-Back Guarantee
              </h3>
              <p>
                We offer a <strong>30-day money-back guarantee</strong> for all yearly subscription purchases to the Bale inventory management platform. If you are not satisfied with our service, you may request a full refund within 30 days of your initial subscription purchase.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Eligibility Criteria:
              </h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Refund request must be made within 30 days of the subscription purchase date</li>
                <li>This applies only to first-time subscribers (not renewal payments)</li>
                <li>You must contact us at bale.inventory@gmail.com with your refund request</li>
                <li>Account access will be revoked upon refund approval</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                After 30 Days:
              </h3>
              <p>
                Subscription payments made more than 30 days ago are <strong>non-refundable</strong>. You may cancel your subscription to prevent future renewals, but no refund will be issued for the current subscription period.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Cancellation Process:
              </h3>
              <p>
                You may cancel your subscription at any time through your account settings or by contacting customer support. Cancellation will prevent future automatic renewals, but you will retain access until the end of your current subscription period.
              </p>
            </section>

            <section className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Physical Products (Trading Cards & E-commerce Items)
              </h2>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                3-Day Return & Refund Window
              </h3>
              <p>
                For physical products purchased through our e-commerce platform, we offer returns and refunds within <strong>3 days</strong> of placing the order, subject to the conditions below.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Cancellation Before Shipping:
              </h3>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Cancellations will only be considered if the request is made within <strong>3 days</strong> of placing the order
                </li>
                <li>
                  However, cancellation requests may not be entertained if the orders have been communicated to sellers/merchants and they have initiated the shipping process, or the product is out for delivery
                </li>
                <li>
                  In such cases, you may choose to reject the product at the doorstep
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Perishable Items:
              </h3>
              <p>
                Bale does not accept cancellation requests for perishable items like flowers, eatables, etc. However, the refund/replacement can be made if the user establishes that the quality of the product delivered is not good.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Damaged or Defective Items:
              </h3>
              <p>
                In case of receipt of damaged or defective items, please report to our customer service team within <strong>3 days of receipt of products</strong>. The request will be entertained once the seller/merchant has checked and determined the same at their end.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Product Not as Expected:
              </h3>
              <p>
                In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within <strong>3 days of receiving the product</strong>. The customer service team after looking into your complaint will take an appropriate decision.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                Warranty Issues:
              </h3>
              <p>
                In case of complaints regarding products that come with a warranty from the manufacturers, please refer the issue to them directly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Refund Processing Timeline
              </h2>
              <p>
                In case of any refunds approved by Bale, it will take <strong>5-7 business days</strong> for the refund to be processed to your original payment method after approval. The actual time for the amount to reflect in your account may vary depending on your bank or payment provider.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How to Request a Refund
              </h2>
              <p>To request a refund, please contact our customer support team:</p>
              <ul className="list-disc list-inside space-y-2 mt-4">
                <li>
                  <strong>Email:</strong>{" "}
                  <a href="mailto:bale.inventory@gmail.com" className="text-primary-600 hover:underline">
                    bale.inventory@gmail.com
                  </a>
                </li>
                <li>
                  <strong>Phone:</strong>{" "}
                  <a href="tel:9619915299" className="text-primary-600 hover:underline">
                    9619915299
                  </a>
                </li>
                <li><strong>Support Hours:</strong> Monday - Friday (9:00 AM - 6:00 PM IST)</li>
              </ul>
              <p className="mt-4">
                Please include your order number, reason for refund, and any supporting documentation (photos of damaged items, etc.) to expedite the process.
              </p>
            </section>

            <section className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Important Notes</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>All refund requests are subject to verification and approval</li>
                <li>Shipping charges are non-refundable unless the product was defective or incorrect</li>
                <li>Refunds will be processed to the original payment method used during purchase</li>
                <li>We reserve the right to refuse refunds that do not meet the criteria outlined above</li>
              </ul>
              <p className="mt-4 text-sm text-gray-600">
                Last Updated: January 2026
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
