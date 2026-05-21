import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260521221634 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pickup_window" ("id" text not null, "hub_id" text not null, "hub_area_id" text not null, "date" timestamptz not null, "start_time" text not null, "end_time" text not null, "capacity_kg" integer null, "reserved_kg" integer not null default 0, "status" text check ("status" in ('open', 'full', 'closed', 'completed')) not null default 'open', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_window_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_window_deleted_at" ON "pickup_window" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "pickup_slot" ("id" text not null, "listing_id" text not null, "estimated_kg" integer not null, "status" text check ("status" in ('reserved', 'picked_up', 'no_show', 'rejected')) not null default 'reserved', "picked_up_at" timestamptz null, "notes" text null, "pickup_window_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_slot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_slot_pickup_window_id" ON "pickup_slot" ("pickup_window_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_slot_deleted_at" ON "pickup_slot" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "pickup_slot" add constraint "pickup_slot_pickup_window_id_foreign" foreign key ("pickup_window_id") references "pickup_window" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "pickup_slot" drop constraint if exists "pickup_slot_pickup_window_id_foreign";`);

    this.addSql(`drop table if exists "pickup_window" cascade;`);

    this.addSql(`drop table if exists "pickup_slot" cascade;`);
  }

}
