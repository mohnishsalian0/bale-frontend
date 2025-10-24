import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Bale - Fabric Inventory Management",
	description: "Inventory management system for fabric distributors",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
