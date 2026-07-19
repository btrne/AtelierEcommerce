import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container dark:bg-surface-container border-t border-outline-variant/30">
      <div className="flex flex-col md:flex-row justify-between items-center py-16 px-margin-desktop max-w-container-max mx-auto w-full">
        <div className="mb-8 md:mb-0 text-center md:text-left">
          <Link href="/" className="font-headline-md text-headline-md text-primary dark:text-primary block mb-2">
            Atelier
          </Link>
          <p className="font-body-md text-body-md text-on-surface-variant opacity-80 max-w-[300px]">
            Di sản của tay nghề thủ công mỹ nghệ và sự sang trọng vượt thời gian.
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-4">
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
            <Link href="#" className="text-on-surface-variant hover:text-secondary transition-colors duration-300 font-label-caps text-label-caps">
              Chính sách bảo mật
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-secondary transition-colors duration-300 font-label-caps text-label-caps">
              Điều khoản dịch vụ
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-secondary transition-colors duration-300 font-label-caps text-label-caps">
              Giao hàng & Trả hàng
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-secondary transition-colors duration-300 font-label-caps text-label-caps">
              Chăm sóc khách hàng
            </Link>
          </div>
          <p className="text-on-surface-variant font-body-md text-body-md opacity-60">
            © 2024 Atelier. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
}
