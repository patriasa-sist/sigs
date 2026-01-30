import type { Metadata } from "next";
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
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					forcedTheme="clear"
					enableSystem
					disableTransitionOnChange
				>
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
