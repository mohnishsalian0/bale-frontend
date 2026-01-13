"use client";

import { useState } from "react";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";

export default function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#faq", label: "FAQ" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={handleLinkClick}
            >
              <div className="text-xl sm:text-2xl font-heading font-bold text-primary-700">
                Bale
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm lg:text-base text-gray-600 hover:text-primary-700 transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="mailto:bale.inventory@gmail.com"
                className="bg-primary-700 text-white hover:bg-primary-800 px-3 lg:px-4 py-2 rounded-lg transition-colors font-semibold text-sm lg:text-base"
              >
                Contact Us
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-primary-700 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <IconX className="w-6 h-6" />
              ) : (
                <IconMenu2 className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-[56px] sm:top-[64px] right-0 h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] w-full sm:w-80 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col h-full overflow-y-auto">
          <div className="flex-1 py-6 px-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact Button at Bottom */}
          <div className="p-4 border-t border-gray-200">
            <Link
              href="mailto:bale.inventory@gmail.com"
              onClick={handleLinkClick}
              className="block w-full bg-primary-700 text-white hover:bg-primary-800 px-4 py-3 rounded-lg transition-colors font-semibold text-center text-base"
            >
              Contact Us
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
