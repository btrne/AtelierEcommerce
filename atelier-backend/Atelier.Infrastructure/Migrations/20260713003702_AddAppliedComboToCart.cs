using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Atelier.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAppliedComboToCart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppliedComboId",
                table: "Carts",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carts_AppliedComboId",
                table: "Carts",
                column: "AppliedComboId");

            migrationBuilder.AddForeignKey(
                name: "FK_Carts_ProductCombos_AppliedComboId",
                table: "Carts",
                column: "AppliedComboId",
                principalTable: "ProductCombos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Carts_ProductCombos_AppliedComboId",
                table: "Carts");

            migrationBuilder.DropIndex(
                name: "IX_Carts_AppliedComboId",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "AppliedComboId",
                table: "Carts");
        }
    }
}
