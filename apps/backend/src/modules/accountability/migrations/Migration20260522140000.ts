import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260522140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "refusal_dispute" ("id" text not null, "order_id" text not null, "dispatch_order_id" text not null, "customer_id" text not null, "rider_id" text null, "rider_photo_url" text null, "rider_notes" text null, "buyer_reason" text check ("buyer_reason" in ('damaged_goods', 'wrong_item', 'not_home', 'other')) null, "buyer_notes" text null, "buyer_responded_at" timestamptz null, "producer_response" text null, "producer_responded_at" timestamptz null, "resolution" text check ("resolution" in ('pending', 'buyer_fault', 'producer_fault', 'rider_fault', 'platform_fault')) not null default 'pending', "resolution_notes" text null, "resolved_by" text null, "resolved_at" timestamptz null, "deposit_action" text check ("deposit_action" in ('none', 'forfeit', 'refund')) not null default 'none', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "refusal_dispute_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refusal_dispute_order_id" ON "refusal_dispute" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refusal_dispute_dispatch_order_id" ON "refusal_dispute" ("dispatch_order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refusal_dispute_customer_id" ON "refusal_dispute" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refusal_dispute_resolution" ON "refusal_dispute" ("resolution") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_refusal_dispute_deleted_at" ON "refusal_dispute" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "buyer_account_status" ("id" text not null, "customer_id" text not null, "strike_count" integer not null default 0, "state" text check ("state" in ('normal', 'warned', 'prepay_locked_30d', 'prepay_locked_permanent')) not null default 'normal', "state_until" timestamptz null, "last_clean_order_at" timestamptz null, "recovery_eligible_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buyer_account_status_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_buyer_account_status_customer_id" ON "buyer_account_status" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_account_status_state" ON "buyer_account_status" ("state") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_account_status_deleted_at" ON "buyer_account_status" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "refusal_dispute" cascade;`);
    this.addSql(`drop table if exists "buyer_account_status" cascade;`);
  }

}
