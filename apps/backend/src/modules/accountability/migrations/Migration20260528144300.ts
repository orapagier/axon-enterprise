import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260528144300 extends Migration {

  override async up(): Promise<void> {
    // Deposit removed — disputes no longer carry a deposit consequence.
    this.addSql(`alter table if exists "refusal_dispute" drop column if exists "deposit_action";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "refusal_dispute" add column if not exists "deposit_action" text check ("deposit_action" in ('none', 'forfeit', 'refund')) not null default 'none';`);
  }

}
