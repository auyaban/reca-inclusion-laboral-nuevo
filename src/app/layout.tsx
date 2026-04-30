import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "RECA - Red Empleo Con Apoyo",
  description: "Red Empleo con Apoyo – Gestión de formularios de inclusión laboral",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("font-sans", lato.variable)}>
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
