import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260610130000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "rider" (` +
        `"id" text not null, ` +
        `"full_name" text not null, ` +
        `"phone" text not null, ` +
        `"hub_id" text not null, ` +
        `"status" text check ("status" in ('active', 'inactive', 'suspended')) not null default 'active', ` +
        `"pin_hash" text null, ` +
        `"notes" text null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "rider_pkey" primary key ("id")` +
        `);`
    );
    this.addSql(
      `create unique index if not exists "IDX_rider_phone_unique" on "rider" ("phone") where deleted_at is null;`
    );
    this.addSql(
      `create index if not exists "IDX_rider_hub_id" on "rider" ("hub_id") where deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rider" cascade;`);
  }

}
