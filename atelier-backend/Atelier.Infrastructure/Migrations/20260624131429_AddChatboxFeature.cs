using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Atelier.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatboxFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConversationId",
                table: "CustomRequests",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CustomerConfirmedAt",
                table: "CustomRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "CustomRequests",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Conversations",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "MessageImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MessageId = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageImages_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomRequests_ConversationId",
                table: "CustomRequests",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageImages_MessageId",
                table: "MessageImages",
                column: "MessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_CustomRequests_Conversations_ConversationId",
                table: "CustomRequests",
                column: "ConversationId",
                principalTable: "Conversations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CustomRequests_Conversations_ConversationId",
                table: "CustomRequests");

            migrationBuilder.DropTable(
                name: "MessageImages");

            migrationBuilder.DropIndex(
                name: "IX_CustomRequests_ConversationId",
                table: "CustomRequests");

            migrationBuilder.DropColumn(
                name: "ConversationId",
                table: "CustomRequests");

            migrationBuilder.DropColumn(
                name: "CustomerConfirmedAt",
                table: "CustomRequests");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "CustomRequests");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Conversations");
        }
    }
}
