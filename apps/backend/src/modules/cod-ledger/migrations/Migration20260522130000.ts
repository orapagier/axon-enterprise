import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260522130000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "buyer_wallet" ("id" text not null, "customer_id" text not null, "deposit_balance" integer not null default 0, "status" text check ("status" in ('none', 'pending_verification', 'verified')) not null default 'none', "payment_reference" text null, "verified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "buyer_wallet_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_buyer_wallet_customer_id" ON "buyer_wallet" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_buyer_wallet_deleted_at" ON "buyer_wallet" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "cod_transaction" ("id" text not null, "customer_id" text not null, "order_id" text null, "type" text check ("type" in ('deposit_in', 'deposit_refund', 'deposit_forfeit', 'cod_collected', 'rider_remitted', 'reconciled')) not null, "amount" integer not null, "reference" text null, "rider_id" text null, "recorded_by" text null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "cod_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_transaction_customer_id" ON "cod_transaction" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_transaction_order_id" ON "cod_transaction" ("order_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_transaction_type" ON "cod_transaction" ("type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_cod_transaction_deleted_at" ON "cod_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "cod_transaction" cascade;`);
    this.addSql(`drop table if exists "buyer_wallet" cascade;`);
  }

}
