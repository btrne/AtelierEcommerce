import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import ChatBox from "@/components/ChatBox";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
  title: "ATELIER - Dấu Ấn Thủ Công Tinh Tế",
  description: 'ATELIER - Nơi hội tụ tinh hoa chế tác thủ công. Chất liệu da thượng hạng, thiết kế tinh tế và sự tỉ mỉ trong từng đường kim mũi chỉ tạo nên những tác phẩm nghệ thuật sống động. Hãy để ATELIER đồng hành cùng bạn trên hành trình thể hiện phong cách và cá tính riêng biệt.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${playfair.variable} ${montserrat.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <LayoutShell>{children}</LayoutShell>
            <Footer />
            <ChatBox />
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
