"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Header2 from "./Header2";
import NavBar from "./NavBar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProductDetail = pathname.startsWith("/products/") && pathname !== "/products";
  const isCollectionDetail = pathname.startsWith("/collections/") && pathname !== "/collections";
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAccountPage = pathname.startsWith("/account");
  const isCheckoutPage = pathname.startsWith("/checkout");
  const isCartPage = pathname === "/cart";

  if (isProductDetail || isCollectionDetail) {
    return (
      <>
        <Header2 />
        <main className="flex-1" style={{ paddingTop: "100px" }}>
          {children}
        </main>
      </>
    );
  }

  if (isAccountPage || isCheckoutPage || isCartPage) {
    return (
      <>
        <Header2 fixed={false} />
        <main className="flex-1">
          {children}
        </main>
      </>
    );
  }

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <NavBar />
      <main className="flex-1" style={{ paddingTop: 'calc(var(--header-height, 100px) + 48px)' }}>
        {children}
      </main>
    </>
  );
}
