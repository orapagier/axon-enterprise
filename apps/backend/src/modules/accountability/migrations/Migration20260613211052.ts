import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260613211052 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "refusal_dispute" add column if not exists "buyer_reminder_sent_at" timestamptz null, add column if not exists "escalated_at" timestamptz null, add column if not exists "auto_resolved" boolean not null default false, add column if not exists "appeal_state" text check ("appeal_state" in ('none', 'requested', 'upheld', 'overturned')) not null default 'none', add column if not exists "appeal_notes" text null, add column if not exists "appeal_requested_at" timestamptz null, add column if not exists "appeal_resolved_at" timestamptz null, add column if not exists "appeal_resolved_by" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "refusal_dispute" drop column if exists "buyer_reminder_sent_at", drop column if exists "escalated_at", drop column if exists "auto_resolved", drop column if exists "appeal_state", drop column if exists "appeal_notes", drop column if exists "appeal_requested_at", drop column if exists "appeal_resolved_at", drop column if exists "appeal_resolved_by";`);
  }

}
