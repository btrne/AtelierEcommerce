# Atelier - Nền tảng E-commerce Túi xách / Handbag E-commerce Platform

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-database-CC2927?logo=microsoftsqlserver&logoColor=white)

## Tổng quan / Overview

**VI:** Atelier là một nền tảng e-commerce túi xách full-stack được xây dựng theo mô hình monorepo, gồm storefront cho khách hàng, admin dashboard và ASP.NET Core REST API backend. Hệ thống hỗ trợ duyệt sản phẩm, giỏ hàng khách vãng lai, checkout, thanh toán VNPay sandbox, quy trình vận chuyển bên thứ ba, gợi ý sản phẩm, upload ảnh và thống kê quản trị.

**EN:** Atelier is a full-stack handbag e-commerce platform built as a monorepo. It includes a customer storefront, an admin dashboard, and an ASP.NET Core REST API backend. The system supports product browsing, guest cart, checkout, sandbox VNPay payment, third-party shipping workflows, product recommendations, image upload, and admin analytics.

## Demo / Live Demo

- Customer site: https://atelier-ecommerce-atelier-customer.vercel.app/
- Admin dashboard: https://atelier-ecommerce-atelier-admin.vercel.app/

## Tính năng chính / Main Features

### Storefront khách hàng / Customer Storefront

- **VI:** Duyệt sản phẩm, danh mục, bộ sưu tập và biến thể sản phẩm như màu sắc, chất liệu, kiểu dáng.

  **EN:** Browse products, categories, collections, and product variants such as color, material, and style.
- **VI:** Hỗ trợ giỏ hàng guest bằng `sessionId` và tự động merge vào tài khoản sau khi đăng nhập hoặc đăng ký.

  **EN:** Support guest cart with `sessionId` and merge cart data after login or registration.
- **VI:** Đăng ký, đăng nhập bằng email, Google hoặc Facebook OAuth.

  **EN:** Register and log in with email, Google, or Facebook OAuth.
- **VI:** Checkout với địa chỉ, voucher, combo, thanh toán sandbox và mô phỏng quy trình vận chuyển.

  **EN:** Checkout with address selection, vouchers, combos, sandbox payment, and shipping workflow simulation.
- **VI:** Quản lý hồ sơ, địa chỉ, wishlist và thông tin đơn hàng.

  **EN:** Manage profile, addresses, wishlist, and order information.
- **VI:** Tìm kiếm sản phẩm, danh mục và bộ sưu tập với gợi ý.

  **EN:** Search products, categories, and collections with suggestions.

### Admin Dashboard

- **VI:** Xem thống kê doanh thu, sản phẩm nổi bật, đơn hàng gần đây và yêu cầu may đo.

  **EN:** View revenue analytics, top products, recent orders, and custom requests.
- **VI:** Quản lý sản phẩm, biến thể, danh mục, bộ sưu tập, thuộc tính, kho hàng, voucher, đơn hàng, người dùng, vai trò, đánh giá, thanh toán và đơn vị vận chuyển.

  **EN:** Manage products, variants, categories, collections, attributes, inventory, vouchers, orders, users, roles, ratings, payments, and shipping providers.
- **VI:** Quản lý hội thoại khách hàng, thông báo và yêu cầu may đo.

  **EN:** Manage customer conversations, notifications, and custom clothing requests.

### Backend API

- **VI:** ASP.NET Core Web API theo kiến trúc phân lớp: `API`, `Application`, `Domain`, `Infrastructure`.

  **EN:** ASP.NET Core Web API using a layered architecture: `API`, `Application`, `Domain`, and `Infrastructure`.
- **VI:** EF Core Code-First với SQL Server, migrations và seed data.

  **EN:** EF Core Code-First with SQL Server, migrations, and seed data.
- **VI:** JWT Authentication, CORS cấu hình được, MediatR và Swagger documentation.

  **EN:** JWT Authentication, configurable CORS, MediatR, and Swagger documentation.
- **VI:** API cho auth, products, cart, orders, payments, shipping, analytics, upload file và AI/product recommendations.

  **EN:** API modules for auth, products, cart, orders, payments, shipping, analytics, file upload, and AI/product recommendations.

## Công nghệ / Tech Stack

| Area | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | ASP.NET Core Web API, .NET 10, Entity Framework Core, MediatR |
| Database | SQL Server |
| Authentication | JWT Bearer, Google OAuth, Facebook OAuth |
| API Documentation | Swagger / Swashbuckle |
| Tooling | npm workspaces, concurrently, node-forge |

## Tích hợp bên thứ ba / Third-party Integrations

| Service | Mục đích / Purpose | Môi trường / Environment |
|---|---|---|
| VNPay | Thanh toán trực tuyến / Online payment workflow | Sandbox |
| GHN / Lalamove | Mô phỏng phí ship và quy trình giao hàng / Shipping workflow simulation | Sandbox / development |
| Cloudinary | Lưu trữ ảnh sản phẩm / Product image storage | Development / production-ready config |
| Gemini AI | Gợi ý sản phẩm và trợ lý AI / Product suggestions and AI assistant features | API-based integration |
| Google / Facebook OAuth | Đăng nhập mạng xã hội / Social login | Development / production config |
| provinces.open-api.vn | Dữ liệu địa chỉ Việt Nam / Vietnam address data | Public API, no key required |

## Cấu trúc dự án / Project Structure

```text
AtelierProject/
|-- atelier-customer/        # Customer storefront (Next.js, port 3001)
|-- atelier-admin/           # Admin dashboard (Next.js, port 3000)
|-- atelier-backend/         # ASP.NET Core backend solution
|   |-- Atelier.API/
|   |-- Atelier.Application/
|   |-- Atelier.Domain/
|   `-- Atelier.Infrastructure/
|-- deploy/                  # Deployment artifacts and example environment files
|-- docs/                    # Deployment documentation
|-- scripts/                 # SQL/helper scripts
`-- package.json             # Root npm workspace scripts
```

## Yêu cầu / Requirements

| Tool | Version |
|---|---|
| Node.js | 20 or later |
| npm | Included with Node.js |
| .NET SDK | 10.0 |
| SQL Server | 2019 or later, LocalDB, or Express |

## Cài đặt / Getting Started

### 1. Clone repository và cài dependencies / Clone and install dependencies

```bash
git clone <repo-url> atelier
cd atelier
npm install
```

### 2. Cấu hình backend / Configure the backend

```bash
cd atelier-backend/Atelier.API
cp appsettings.example.json appsettings.json
```

Cập nhật các cấu hình cần thiết trong `appsettings.json` / Update the required settings in `appsettings.json`:

- `ConnectionStrings:DefaultConnection`
- `JwtSettings:SecretKey` with at least 32 characters
- `Cors:AllowedOrigins`
- Optional service settings for Cloudinary, VNPay, GHN, Lalamove, Gemini, Google, and Facebook

### 3. Tạo database và chạy API / Create the database and run the API

```bash
dotnet tool install --global dotnet-ef
dotnet ef database update --project ../Atelier.Infrastructure --startup-project .
dotnet run
```

Default backend URLs:

- API: http://localhost:5097/api
- Swagger: http://localhost:5097/swagger

### 4. Chạy frontend / Run the frontend apps

From the repository root:

```bash
npm run dev
npm run dev:admin
npm run dev:customer
```

Default frontend URLs:

- Admin: http://localhost:3000
- Customer: https://localhost:3001

The customer app can generate self-signed certificates for local HTTPS development.

## Biến môi trường / Environment Files

Example configuration files are available in `deploy/`:

- `deploy/vercel-admin.env.example`
- `deploy/vercel-customer.env.example`
- `deploy/monsterasp-backend.appsettings.Production.example.json`

## API Modules

Controllers are grouped by domain under the `/api` prefix:

| Module | Examples |
|---|---|
| Auth | Login, registration, Google/Facebook login, users, roles |
| Products | Products, categories, collections, attributes, combos, ratings, wishlist, recommendations |
| Sales | Carts, orders, payments, payment methods, vouchers |
| Shipping | Shipments, shipping providers, locations |
| Communication | Custom requests, conversations, notifications |
| Analytics | Dashboard, tracking, inventory transactions, AI suggestion logs |
| Infrastructure | File upload, AI |

## Triển khai / Deployment

- **VI:** Frontend được deploy trên Vercel.

  **EN:** Frontend apps are deployed on Vercel.
- **VI:** Hướng dẫn deploy backend nằm trong `docs/deploy-monsterasp.md`.

  **EN:** Backend deployment instructions are documented in `docs/deploy-monsterasp.md`.
- **VI:** Script database schema nằm tại `deploy/sql/atelier-idempotent.sql`.

  **EN:** Database schema script is available at `deploy/sql/atelier-idempotent.sql`.

Before deploying to production, update CORS origins, frontend URLs, payment callback URLs, API keys, and demo credentials.

## License

This project is currently not licensed for public reuse.
