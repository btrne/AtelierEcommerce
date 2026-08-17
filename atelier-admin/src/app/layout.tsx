/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import "./globals.css";

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
    <html lang="vi" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen bg-background">
        <ToastProvider>
        <AuthGuard>
        <ConfirmProvider>
        <AppShell>
          {children}
        </AppShell>
        </ConfirmProvider>
        </AuthGuard>
        </ToastProvider>
      </body>
    </html>
  );
}
