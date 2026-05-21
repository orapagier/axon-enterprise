import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260521083610 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hub" drop constraint if exists "hub_slug_unique";`);
    this.addSql(`create table if not exists "hub" ("id" text not null, "name" text not null, "slug" text not null, "city" text not null, "province" text not null, "country" text not null default 'ph', "timezone" text not null default 'Asia/Manila', "dispatch_cutoff" text not null default '12:00', "dispatch_time" text not null default '16:00', "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hub_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hub_slug_unique" ON "hub" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hub_deleted_at" ON "hub" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "hub_area" ("id" text not null, "name" text not null, "postal_codes" jsonb not null, "barangays" jsonb not null, "pickup_day_of_week" jsonb null, "hub_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hub_area_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hub_area_hub_id" ON "hub_area" ("hub_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hub_area_deleted_at" ON "hub_area" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "hub_area" add constraint "hub_area_hub_id_foreign" foreign key ("hub_id") references "hub" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "hub_area" drop constraint if exists "hub_area_hub_id_foreign";`);

    this.addSql(`drop table if exists "hub" cascade;`);

    this.addSql(`drop table if exists "hub_area" cascade;`);
  }

}
