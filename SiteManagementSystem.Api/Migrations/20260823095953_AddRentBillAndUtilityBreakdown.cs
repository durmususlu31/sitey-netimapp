using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SiteManagementSystem.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRentBillAndUtilityBreakdown : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Dues_ApartmentId_Period",
                table: "Dues");

            migrationBuilder.AddColumn<decimal>(
                name: "DefaultBillSupport",
                table: "Tenants",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyDue",
                table: "Tenants",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyRent",
                table: "Tenants",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BillSupportAmount",
                table: "Dues",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Dues",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DueType",
                table: "Dues",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "AIDAT");

            migrationBuilder.AddColumn<decimal>(
                name: "ElectricityAmount",
                table: "Dues",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GasAmount",
                table: "Dues",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Dues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WaterAmount",
                table: "Dues",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Dues_ApartmentId_Period_DueType",
                table: "Dues",
                columns: new[] { "ApartmentId", "Period", "DueType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Dues_TenantId",
                table: "Dues",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Dues_Tenants_TenantId",
                table: "Dues",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Dues_Tenants_TenantId",
                table: "Dues");

            migrationBuilder.DropIndex(
                name: "IX_Dues_ApartmentId_Period_DueType",
                table: "Dues");

            migrationBuilder.DropIndex(
                name: "IX_Dues_TenantId",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "DefaultBillSupport",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "MonthlyDue",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "MonthlyRent",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "BillSupportAmount",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "DueType",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "ElectricityAmount",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "GasAmount",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Dues");

            migrationBuilder.DropColumn(
                name: "WaterAmount",
                table: "Dues");

            migrationBuilder.CreateIndex(
                name: "IX_Dues_ApartmentId_Period",
                table: "Dues",
                columns: new[] { "ApartmentId", "Period" },
                unique: true);
        }
    }
}
