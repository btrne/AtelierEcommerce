import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATELIER Admin - Quản Trị Viên",
  description: "Hệ thống quản trị ATELIER",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${playfair.variable} ${montserrat.variable} light`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen bg-background">
        <AuthGuard>
        <ToastProvider>
        <ConfirmProvider>
        <AppShell>
          {children}
        </AppShell>
        </ConfirmProvider>
        </ToastProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
