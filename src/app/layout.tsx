import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "NovaMarket",
  description: "Plataforma de comercio electronico NovaMarket",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          NovaMarket &copy; {new Date().getFullYear()} - Proyecto academico
        </footer>
      </body>
    </html>
  );
}
