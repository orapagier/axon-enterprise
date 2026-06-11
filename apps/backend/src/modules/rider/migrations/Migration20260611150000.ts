import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * Adds 'pending' to the rider.status check — riders now self-register via the
 * rider app (Google or email + PIN) and wait in 'pending' until a hub admin
 * approves them after collecting the cash bond.
 */
export class Migration20260611150000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "rider" drop constraint if exists "rider_status_check";`);
    this.addSql(
      `alter table "rider" add constraint "rider_status_check" check ("status" in ('pending', 'active', 'inactive', 'suspended'));`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`update "rider" set "status" = 'inactive' where "status" = 'pending';`);
    this.addSql(`alter table "rider" drop constraint if exists "rider_status_check";`);
    this.addSql(
      `alter table "rider" add constraint "rider_status_check" check ("status" in ('active', 'inactive', 'suspended'));`
    );
  }

}
