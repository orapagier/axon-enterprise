import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260521221631 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_listing" ("id" text not null, "listing_type" text check ("listing_type" in ('direct_to_consumer', 'sell_to_freshhub')) not null, "harvest_date" timestamptz null, "pickup_window_id" text null, "status" text check ("status" in ('draft', 'pending_pickup', 'active', 'sold_out', 'expired', 'cancelled')) not null default 'draft', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_listing_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_listing_deleted_at" ON "product_listing" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_listing" cascade;`);
  }

}
