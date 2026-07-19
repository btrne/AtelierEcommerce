using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Atelier.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedVouchers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Vouchers",
                columns: new[] { "Id", "Code", "CreatedAt", "Description", "DiscountType", "DiscountValue", "EndDate", "IsActive", "MaxDiscountValue", "MaxUses", "MaxUsesPerUser", "MinOrderValue", "StartDate" },
                values: new object[,]
                {
                    { 1, "ATELIERWELCOME", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Giảm 10% cho đơn hàng đầu tiên", "Percentage", 10m, new DateTime(2099, 12, 31, 23, 59, 59, 0, DateTimeKind.Utc), true, 500000m, 99999, 1, 0m, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, "CRAFTSMANSHIP", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Giảm 150.000đ phí vận chuyển hỏa tốc", "Fixed", 150000m, new DateTime(2099, 12, 31, 23, 59, 59, 0, DateTimeKind.Utc), true, 150000m, 99999, 99999, 0m, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, "LUNAR2024", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Giảm 500.000đ cho đơn từ 10.000.000đ", "Fixed", 500000m, new DateTime(2099, 12, 31, 23, 59, 59, 0, DateTimeKind.Utc), true, 500000m, 99999, 1, 10000000m, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Vouchers",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Vouchers",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Vouchers",
                keyColumn: "Id",
                keyValue: 3);
        }
    }
}
