import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260522120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "dispatch_batch" ("id" text not null, "hub_id" text not null, "dispatch_date" timestamptz not null, "cutoff_at" timestamptz not null, "dispatched_at" timestamptz null, "status" text check ("status" in ('collecting', 'locked', 'in_transit', 'completed')) not null default 'collecting', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dispatch_batch_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_batch_hub_id" ON "dispatch_batch" ("hub_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_batch_dispatch_date" ON "dispatch_batch" ("dispatch_date") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dispatch_batch_hub_date" ON "dispatch_batch" ("hub_id", "dispatch_date") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_batch_deleted_at" ON "dispatch_batch" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "dispatch_order" ("id" text not null, "order_id" text not null, "rider_id" text null, "manifest_position" integer not null default 0, "delivered_at" timestamptz null, "delivery_status" text check ("delivery_status" in ('pending', 'delivered', 'refused', 'missed', 'disputed')) not null default 'pending', "dispatch_batch_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dispatch_order_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_order_dispatch_batch_id" ON "dispatch_order" ("dispatch_batch_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_order_order_id" ON "dispatch_order" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_order_rider_id" ON "dispatch_order" ("rider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dispatch_order_deleted_at" ON "dispatch_order" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "dispatch_order" add constraint "dispatch_order_dispatch_batch_id_foreign" foreign key ("dispatch_batch_id") references "dispatch_batch" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "dispatch_order" drop constraint if exists "dispatch_order_dispatch_batch_id_foreign";`);

    this.addSql(`drop table if exists "dispatch_order" cascade;`);
    this.addSql(`drop table if exists "dispatch_batch" cascade;`);
  }

}
