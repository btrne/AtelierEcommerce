"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export default function StoryPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".reveal-up").forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[calc(100vh-148px)] min-h-[600px] overflow-hidden bg-primary-container">
        <img
          alt="Atelier Story"
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1473188588951-666fce8e7c68?w=1600&q=80"
        />
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-margin-mobile">
          <div className="max-w-4xl">
            <p className="font-label-caps text-label-caps text-white mb-6 tracking-[0.4em] uppercase">
              Câu Chuyện
            </p>
            <h1 className="font-headline-xl text-headline-xl text-white mb-10 leading-[1.1]">
              Nơi Nghệ Thuật<br />
              Gặp Gỡ Thủ Công
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 max-w-2xl mx-auto">
              Từ đôi tay tỉ mỉ của những nghệ nhân, mỗi sản phẩm Atelier đều mang trong mình một câu chuyện riêng —
              câu chuyện của đam mê, tận tụy và khát vọng tạo nên kiệt tác trường tồn cùng thời gian.
            </p>
          </div>
        </div>
      </section>

      {/* Khởi nguồn */}
      <section className="py-section-padding bg-surface overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
            <div className="flex-1 order-2 lg:order-1 reveal-up">
              <p className="font-label-caps text-label-caps text-secondary mb-3 tracking-[0.4em] uppercase">
                Khởi Nguồn
              </p>
              <h2 className="font-headline-lg text-headline-lg mb-8 leading-tight">
                Từ một xưởng nhỏ,<br />đến biểu tượng thủ công
              </h2>
              <div className="space-y-6">
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Atelier ra đời từ niềm đam mê mãnh liệt với nghệ thuật chế tác da thủ công.
                  Được thành lập vào năm 2019 bởi những người yêu thích đồ da cao cấp,
                  chúng tôi tin rằng mỗi sản phẩm da không chỉ là phụ kiện — mà là minh chứng
                  cho phong cách sống thượng lưu.
                </p>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Cái tên &ldquo;Atelier&rdquo; — trong tiếng Pháp có nghĩa &ldquo;xưởng chế tác&rdquo; —
                  chính là lời cam kết: mỗi sản phẩm đều được tạo ra bằng chính đôi tay,
                  bằng cả tâm huyết của người nghệ nhân, chứ không phải bởi máy móc vô hồn.
                </p>
              </div>
              <div className="mt-10">
                <div className="border-t border-outline-variant mb-6"></div>
                <div className="flex flex-wrap gap-10">
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">2019</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      Năm Thành Lập
                    </p>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">350+</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      Tác Phẩm
                    </p>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">12</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">
                      Nghệ Nhân Bậc Thầy
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:w-5/12 relative reveal-up">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  alt="Xưởng chế tác Atelier"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1599202860130-f600f4948364?w=800&q=80"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 hidden md:block w-24 aspect-square border-[6px] border-surface shadow-xl">
                <img
                  alt="Chi tiết chế tác"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&q=80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nghệ nhân */}
      <section className="py-section-padding bg-primary text-white overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-20 reveal-up">
            <p className="font-label-caps text-label-caps text-white/60 mb-3 tracking-[0.4em] uppercase">
              Người Thợ
            </p>
            <h2 className="font-headline-lg text-headline-lg text-white">
              Bàn Tay Tạo Nên Linh Hồn
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
            <div className="lg:w-1/2 reveal-up">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  alt="Nghệ nhân chế tác da"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  src="https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80"
                />
              </div>
            </div>
            <div className="lg:w-1/2 space-y-6 reveal-up">
              <p className="font-body-lg text-body-lg text-white/80">
                Mỗi nghệ nhân tại Atelier đều sở hữu hơn 10 năm kinh nghiệm trong nghề.
                Họ không chỉ là người thợ — mà là những bậc thầy về nghệ thuật chế tác da,
                những người đã dành cả cuộc đời để hoàn thiện kỹ năng saddle stitch — kỹ thuật
                khâu tay truyền thống không máy móc nào thay thế được.
              </p>
              <p className="font-body-lg text-body-lg text-white/80">
                Từ việc cắt da, đánh dấu, đục lỗ cho đến khâu từng mũi chỉ — tất cả đều được
                thực hiện hoàn toàn bằng tay. Mỗi mũi khâu saddle stitch sử dụng hai kim
                đối diện, tạo nên đường chỉ chắc chắn gấp đôi so với máy may thông thường.
                Nếu một mũi đứt, các mũi còn lại vẫn giữ chặt — đó là lý do sản phẩm Atelier
                tồn tại suốt nhiều thập kỷ.
              </p>
              <div className="border-t border-white/20 my-8"></div>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <h4 className="font-headline-md text-headline-md text-white mb-2">200+</h4>
                  <p className="font-label-caps text-label-caps text-white/60">Giờ Chế Tác</p>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-white mb-2">100%</h4>
                  <p className="font-label-caps text-label-caps text-white/60">Thủ Công</p>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-white mb-2">Saddle</h4>
                  <p className="font-label-caps text-label-caps text-white/60">Stitch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vật liệu */}
      <section className="py-section-padding bg-surface-container-lowest overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
            <div className="flex-1 space-y-6 reveal-up">
              <p className="font-label-caps text-label-caps text-secondary mb-3 tracking-[0.4em] uppercase">
                Vật Liệu
              </p>
              <h2 className="font-headline-lg text-headline-lg mb-8 leading-tight">
                Tuyển Chọn Từ<br />Nguồn Gốc Tốt Nhất
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Da thuộc tại những xưởng da danh tiếng nhất thế giới — Tuscany ở Ý và
                Saumur ở Pháp. Mỗi tấm da đều được tuyển chọn kỹ lưỡng từ những con bò
                được nuôi thả tự nhiên, đảm bảo bề mặt da mịn màng, đều màu và bền bỉ
                theo thời gian.
              </p>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Quy trình thuộc da truyền thống vegetable-tanned sử dụng chiết xuất thực vật
                tự nhiên trong suốt 60 ngày — không hóa chất độc hại, không ảnh hưởng đến
                môi trường. Đây chính là lý do sản phẩm Atelier ngày càng đẹp hơn khi sử dụng,
                tạo nên lớp patina đặc trưng mà chỉ da thật cao cấp mới có được.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">verified</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">Da Ý & Pháp</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">eco</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">Vegetable-Tanned</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">schedule</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">60 ngày thuộc da</span>
                </div>
              </div>
            </div>
            <div className="lg:w-5/12 relative reveal-up">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  alt="Da thuộc cao cấp"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=800&q=80"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 hidden md:block w-20 aspect-square border-[6px] border-surface shadow-xl">
                <img
                  alt="Chi tiết da"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=400&q=80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Triết lý */}
      <section className="py-section-padding bg-surface">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-20 reveal-up">
            <p className="font-label-caps text-label-caps text-secondary mb-3 tracking-[0.4em] uppercase">
              Triết Lý
            </p>
            <h2 className="font-headline-lg text-headline-lg">
              Ba Giá Trị Cốt Lõi
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 reveal-up">
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center border border-outline-variant group-hover:border-secondary group-hover:bg-secondary/5 transition-all duration-500">
                <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors duration-500">
                  build
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-4">Thủ Công</h3>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Mỗi sản phẩm được tạo ra hoàn toàn bằng đôi tay — từ cắt, khâu, đánh bóng
                đến hoàn thiện. Không có bất kỳ quy trình nào bị rút ngắn bằng máy móc.
                Chính sự tỉ mỉ thủ công tạo nên linh hồn riêng biệt cho từng tác phẩm.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center border border-outline-variant group-hover:border-secondary group-hover:bg-secondary/5 transition-all duration-500">
                <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors duration-500">
                  eco
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-4">Bền Vững</h3>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Da vegetable-tanned thân thiện với môi trường, quy trình chế tác không sử dụng
                hóa chất độc hại. Chúng tôi tin rằng thời trang cao cấp không cần phải hy sinh
                trách nhiệm với hành tinh. Một sản phẩm bền lâu chính là sản phẩm bền vững nhất.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-8 flex items-center justify-center border border-outline-variant group-hover:border-secondary group-hover:bg-secondary/5 transition-all duration-500">
                <span className="material-symbols-outlined text-3xl text-primary group-hover:text-secondary transition-colors duration-500">
                  auto_awesome
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-4">Độc Bản</h3>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Mỗi sản phẩm Atelier đều có số_serial riêng và được chế tác với sự chú ý
                đến từng chi tiết nhỏ nhất. Qua thời gian, lớp patina tự nhiên sẽ tạo nên
                dấu ấn riêng — biến mỗi chiếc túi thành câu chuyện độc nhất vô nhị của người sở hữu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cam kết */}
      <section className="py-16 bg-surface-container-low overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-10 max-w-5xl mx-auto">
            <div className="flex-1 reveal-up">
              <p className="font-label-caps text-label-caps text-secondary mb-3 tracking-[0.4em] uppercase">
                Cam Kết
              </p>
              <h2 className="font-headline-lg text-headline-lg mb-5 leading-tight">
                Bảo hành trọn đời,<br />chăm sóc mãi mãi
              </h2>
              <div className="space-y-6 max-w-xl">
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Atelier cam kết hỗ trợ khách hàng trọn đời. Mỗi sản phẩm đều được bảo hành
                  miễn phí về đường chỉ và kết cấu. Bên cạnh đó, dịch vụ chăm sóc da định kỳ
                  giúp sản phẩm của bạn luôn trong tình trạng tốt nhất.
                </p>
              </div>
              <div className="mt-8">
                <div className="border-t border-outline-variant mb-6"></div>
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">shield</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">Bảo hành trọn đời</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">spa</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">Chăm sóc miễn phí</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">local_shipping</span>
                    <span className="font-body-md text-body-md text-on-surface-variant">Giao hàng toàn quốc</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/3 relative reveal-up">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  alt="Sản phẩm Atelier"
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-section-padding bg-primary text-white">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center reveal-up">
          <p className="font-label-caps text-label-caps text-white/60 mb-4 tracking-[0.4em] uppercase">
            Bắt Đầu Câu Chuyện Của Bạn
          </p>
          <h2 className="font-headline-lg text-headline-lg mb-8">
            Mỗi Chiếc Túi,<br />Một Câu Chuyện
          </h2>
          <p className="font-body-lg text-body-lg text-white/70 max-w-xl mx-auto mb-12">
            Khám phá bộ sưu tập sản phẩm thủ công cao cấp — nơi nghệ thuật chế tác truyền thống
            gặp gỡ thiết kế hiện đại, tạo nên những tác phẩm trường tồn cùng thời gian.
          </p>
          <Link
            href="/products"
            className="inline-block border border-white/40 px-12 py-5 font-button-text text-button-text uppercase tracking-widest hover:bg-white hover:text-primary transition-all duration-500"
          >
            Khám Phá Sản Phẩm
          </Link>
        </div>
      </section>
    </div>
  );
}
