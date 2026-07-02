import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConditionalNavbar } from "@/components/layout/conditional-navbar";

const defaultUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
	metadataBase: new URL(defaultUrl),
	title: "SIGS Patria S.A.",
	description: "Sistema Integral de Gestión de Seguros",
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
			{ url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
	},
	manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#F1F4F9" },
		{ media: "(prefers-color-scheme: dark)", color: "#14171C" },
	],
};

const geistSans = Geist({
	variable: "--font-geist-sans",
	display: "swap",
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<body className={`${geistSans.className} antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
					<ConditionalNavbar />
					{children}
					<Analytics />
					<SpeedInsights />
					<Toaster position="top-center" />
				</ThemeProvider>
			</body>
		</html>
	);
}
