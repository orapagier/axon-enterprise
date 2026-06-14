import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260614140000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "referral_code" (` +
        `"id" text not null, ` +
        `"customer_id" text not null, ` +
        `"code" text not null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "referral_code_pkey" primary key ("id")` +
        `);`
    );
    this.addSql(
      `create unique index if not exists "IDX_referral_code_customer_id_unique" on "referral_code" ("customer_id") where deleted_at is null;`
    );
    this.addSql(
      `create unique index if not exists "IDX_referral_code_code_unique" on "referral_code" ("code") where deleted_at is null;`
    );

    this.addSql(
      `create table if not exists "referral" (` +
        `"id" text not null, ` +
        `"referrer_customer_id" text not null, ` +
        `"referee_customer_id" text not null, ` +
        `"referee_email" text null, ` +
        `"code_used" text null, ` +
        `"status" text check ("status" in ('pending', 'rewarded', 'void')) not null default 'pending', ` +
        `"reward_amount_centavos" numeric null, ` +
        `"reward_promo_id" text null, ` +
        `"reward_promo_code" text null, ` +
        `"rewarded_at" timestamptz null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "referral_pkey" primary key ("id")` +
        `);`
    );
    // One reward per referee, ever — this index is the hard guarantee behind
    // the "first upgrade only" rule.
    this.addSql(
      `create unique index if not exists "IDX_referral_referee_unique" on "referral" ("referee_customer_id") where deleted_at is null;`
    );
    this.addSql(
      `create index if not exists "IDX_referral_referrer" on "referral" ("referrer_customer_id") where deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral" cascade;`);
    this.addSql(`drop table if exists "referral_code" cascade;`);
  }

}
