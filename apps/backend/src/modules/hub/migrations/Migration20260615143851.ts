import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260615143851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hub" add column if not exists "delivery_open" text not null default '06:00', add column if not exists "delivery_close" text not null default '18:00';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "hub" drop column if exists "delivery_open", drop column if exists "delivery_close";`);
  }

}
