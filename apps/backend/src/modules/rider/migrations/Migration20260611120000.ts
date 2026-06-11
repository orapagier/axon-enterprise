import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Adds rider.email — the admin-registered Google account used by the
 * rider-app "Continue with Google" sign-in. Unique among live rows
 * (NULLs are distinct in Postgres, so email-less riders are unaffected).
 */
export class Migration20260611120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "rider" add column if not exists "email" text null;`);
    this.addSql(
      `create unique index if not exists "IDX_rider_email_unique" on "rider" ("email") where deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_rider_email_unique";`);
    this.addSql(`alter table "rider" drop column if exists "email";`);
  }

}
