using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Atelier.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateShippingProviders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ShippingProviders",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "ShippingProviders",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.InsertData(
                table: "ShippingProviders",
                columns: new[] { "Id", "Code", "IsActive", "Name" },
                values: new object[] { 4, "Lalamove", true, "Lalamove" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ShippingProviders",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.InsertData(
                table: "ShippingProviders",
                columns: new[] { "Id", "Code", "IsActive", "Name" },
                values: new object[,]
                {
                    { 2, "GHTK", true, "Giao Hàng Tiết Kiệm" },
                    { 3, "GRAB", true, "GrabExpress" }
                });
        }
    }
}
