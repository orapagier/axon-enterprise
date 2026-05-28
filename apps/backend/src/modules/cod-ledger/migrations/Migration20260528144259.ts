import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260528144259 extends Migration {

  override async up(): Promise<void> {
    // Drop the COD deposit wallet — the ₱100 deposit gate was removed.
    // CodTransaction (the rider cash ledger) is unaffected.
    this.addSql(`drop table if exists "buyer_wallet" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "buyer_wallet" ("id" text not null, "customer_id" text not null, "deposit_balance" integer not null default 0, "status" text check ("status" in ('none', 'pending_verification', 'verified')) not null default 'none', "payment_reference" text null, "verified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buyer_wallet_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_buyer_wallet_customer_id_unique" ON "buyer_wallet" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_wallet_deleted_at" ON "buyer_wallet" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

}
