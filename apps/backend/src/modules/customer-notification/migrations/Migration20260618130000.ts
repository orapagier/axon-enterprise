import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260618130000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "customer_notification" (` +
        `"id" text not null, ` +
        `"customer_id" text not null, ` +
        `"type" text null, ` +
        `"title" text not null, ` +
        `"body" text not null, ` +
        `"url" text null, ` +
        `"tag" text null, ` +
        `"read_at" timestamptz null, ` +
        `"data" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "customer_notification_pkey" primary key ("id")` +
        `);`
    );
    this.addSql(
      `create index if not exists "IDX_customer_notification_customer_id" on "customer_notification" ("customer_id") where deleted_at is null;`
    );
    this.addSql(
      `create index if not exists "IDX_customer_notification_unread_tag" on "customer_notification" ("customer_id", "tag") where deleted_at is null and read_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "customer_notification" cascade;`);
  }

}
