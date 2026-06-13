import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260613120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "push_subscription" (` +
        `"id" text not null, ` +
        `"customer_id" text not null, ` +
        `"endpoint" text not null, ` +
        `"p256dh" text not null, ` +
        `"auth" text not null, ` +
        `"user_agent" text null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "push_subscription_pkey" primary key ("id")` +
        `);`
    );
    this.addSql(
      `create unique index if not exists "IDX_push_subscription_endpoint_unique" on "push_subscription" ("endpoint") where deleted_at is null;`
    );
    this.addSql(
      `create index if not exists "IDX_push_subscription_customer_id" on "push_subscription" ("customer_id") where deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "push_subscription" cascade;`);
  }

}
