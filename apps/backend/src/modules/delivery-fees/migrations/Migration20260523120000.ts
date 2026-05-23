import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260523120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "hub_barangay_fee" ("id" text not null, "hub_id" text not null, "barangay" text not null, "standard_fee_php" integer not null, "special_fee_php" integer not null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hub_barangay_fee_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hub_barangay_fee_hub_barangay" ON "hub_barangay_fee" ("hub_id", "barangay") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hub_barangay_fee_hub_id" ON "hub_barangay_fee" ("hub_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hub_barangay_fee_deleted_at" ON "hub_barangay_fee" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hub_barangay_fee" cascade;`);
  }

}
