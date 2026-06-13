import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260613130000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "producer_payout" (` +
        `"id" text not null, ` +
        `"producer_id" text not null, ` +
        `"producer_name" text null, ` +
        `"order_id" text null, ` +
        `"kind" text check ("kind" in ('dtc_remit', 'hub_intake')) not null, ` +
        `"gross_centavos" numeric null, ` +
        `"amount_centavos" numeric not null, ` +
        `"method" text check ("method" in ('cash', 'gcash')) not null default 'cash', ` +
        `"reference" text null, ` +
        `"notes" text null, ` +
        `"recorded_by" text null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "producer_payout_pkey" primary key ("id")` +
        `);`
    );
    this.addSql(
      `create index if not exists "IDX_producer_payout_producer_id" on "producer_payout" ("producer_id") where deleted_at is null;`
    );
    // One DTC remittance per (order, producer). hub_intake rows have a null
    // order_id and are unconstrained (Postgres treats NULLs as distinct).
    this.addSql(
      `create unique index if not exists "IDX_producer_payout_order_producer_unique" on "producer_payout" ("order_id", "producer_id") where order_id is not null and deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "producer_payout" cascade;`);
  }

}
