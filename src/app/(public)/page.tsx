"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconChevronDown,
  IconChevronUp,
  IconQrcode,
  IconTruckDelivery,
  IconChartBar,
} from "@tabler/icons-react";
import { toast } from "sonner";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Integrate with your backend/form service
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Request submitted! We'll contact you soon.");
    setEmail("");
    setBusinessName("");
    setIsSubmitting(false);
  };

  const handleTryDemo = () => {
    // Scroll to invite form
    document.getElementById("invite-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const benefits = [
    {
      letter: "B",
      title: "Better Visibility",
      description:
        "Know your stock by number of rolls, color, and meters so you can instantly confirm availability without searching",
      image: "/illustrations/inventory.png",
    },
    {
      letter: "A",
      title: "Accuracy in Every Order",
      description:
        "Keep your stock, dispatch, and sales data in sync so every delivery matches exactly what was promised",
      image: "/illustrations/sales-order.png",
    },
    {
      letter: "L",
      title: "Log Every Movement",
      description:
        "From receipt to dispatch, every roll is tracked with time, date, and user — so you always know who moved what",
      image: "/illustrations/stock-flow.png",
    },
    {
      letter: "E",
      title: "Easy for Everyone",
      description:
        "Scan, dispatch, and update stock in seconds so your team moves fast with minimal training",
      image: "/mascot/staff-trolley.png",
    },
  ];

  const features = [
    {
      title: "Smart Inventory Tracking",
      description:
        "Track fabric stock by roll, meter, or kilogram. See live quantity updates with QR code",
      image: "/illustrations/inventory-shelf.png",
      icon: IconQrcode,
    },
    {
      title: "Job Work Coordination",
      description:
        "Create and track job work for embroidery, dyeing, stitching, or printing so you don't need to call",
      image: "/mascot/truck-delivery.png",
      icon: IconTruckDelivery,
    },
    {
      title: "QR code Generation",
      description:
        "Generate and print QRs in batches. Stick them to rolls and scan to update instantly.",
      image: "/illustrations/qr-scanner.png",
      icon: IconQrcode,
    },
    {
      title: "Fabric-Specific Reports",
      description:
        "See reports to track old and slow moving products, sales performance in one dashboard",
      image: "/illustrations/dashboard.png",
      icon: IconChartBar,
      comingSoon: true,
    },
  ];

  const faqs = [
    {
      question: "What exactly does Bale do?",
      answer:
        "Bale is an all-in-one inventory app built for fabric traders. It tracks every roll, manages job work, and keeps your warehouses in sync.",
    },
    {
      question: "How is Bale different from Tally or ERP software?",
      answer:
        "Bale is built for fabric-specific workflows. Not too simple like generic apps, not too complex like enterprise ERPs.",
    },
    {
      question: "How is my data safe from other fabric traders?",
      answer:
        "Bale is built on a multi-tenant architecture in Supabase ensuring data isolation with strict data access control. We achieve this with the help of Authorization via Row Level Security",
    },
    {
      question: "Will my staff be able to use it easily?",
      answer:
        "Yes, Bale is designed for simple, tap-based workflows — scan, update, done.",
    },
  ];

  return (
    <div className="min-h-dvh">
      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left: Text Content */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Every Roll Matters.{" "}
              <span className="text-primary-700">
                Let&apos;s make sure it&apos;s counted.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl">
              That&apos;s why we built a tool that keeps your fabric organised
              and lets you focus on important tasks.
            </p>
            <Button onClick={handleTryDemo} size="lg" className="text-lg px-8">
              Try Demo
            </Button>
          </div>

          {/* Right: Mascot */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 shrink-0">
            <Image
              src="/mascot/welcome.png"
              alt="Bale mascot welcoming you"
              fill
              sizes="(max-width: 768px) 256px, (max-width: 1024px) 320px, 384px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why fabric traders choose Bale
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Because every feature of Bale is built around how your business
              actually works.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {benefits.map((benefit) => (
              <div
                key={benefit.letter}
                className="flex flex-col gap-4 p-6 rounded-lg border border-gray-200 bg-background-100 hover:border-primary-500 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Letter Badge */}
                  <div className="flex items-center justify-center size-12 rounded-lg bg-primary-700 text-white text-2xl font-bold shrink-0">
                    {benefit.letter}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </div>

                {/* Illustration */}
                <div className="relative w-full h-48 mt-4">
                  <Image
                    src={benefit.image}
                    alt={benefit.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Features built for fabric trade
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative flex flex-col gap-4 p-6 rounded-lg border border-gray-200 bg-white hover:shadow-lg transition-shadow"
              >
                {feature.comingSoon && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                    Coming Soon
                  </div>
                )}

                {/* Illustration */}
                <div className="relative w-full h-40">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                  />
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Button onClick={handleTryDemo} size="lg" className="text-lg px-8">
              Try Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Invite Form Section */}
      <section id="invite-form" className="bg-white py-16 md:py-24">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Left: Form */}
            <div className="flex-1 w-full">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Join Early Access
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Bale is currently invite-only — we&apos;re personally onboarding
                each fabric trader with full support and a free setup.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="businessName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Name
                  </label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Try Demo"}
                </Button>
              </form>
            </div>

            {/* Right: Mascot */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0">
              <Image
                src="/mascot/partner-handshake.png"
                alt="Partner handshake"
                fill
                sizes="(max-width: 768px) 256px, 320px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {expandedFaq === index ? (
                    <IconChevronUp className="size-5 text-gray-500 shrink-0" />
                  ) : (
                    <IconChevronDown className="size-5 text-gray-500 shrink-0" />
                  )}
                </button>

                {expandedFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Tagline */}
          <div className="text-center mb-8">
            <p className="text-lg font-semibold text-gray-300">
              Built for fabric traders. Made for simplicity.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-8 text-sm">
            <a
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Terms of Use
            </a>
            <a
              href="mailto:bale.inventory@gmail.com"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Contact: bale.inventory@gmail.com
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-500">
            © 2025 Bale. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
