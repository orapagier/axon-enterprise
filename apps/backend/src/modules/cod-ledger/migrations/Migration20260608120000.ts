import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260608120000 extends Migration {

  override async up(): Promise<void> {
    // Index the hot lookup columns. The cod-collected/remitted idempotency
    // check filters by order_id (+ type) and reconciliation filters by
    // customer_id; both were doing sequential scans.
    this.addSql(
      `create index if not exists "IDX_cod_transaction_order_id" on "cod_transaction" ("order_id") where deleted_at is null;`
    );
    this.addSql(
      `create index if not exists "IDX_cod_transaction_customer_id" on "cod_transaction" ("customer_id") where deleted_at is null;`
    );
    // Enforce one ledger row of each type per order so a concurrent double
    // POST can't write two cod_collected rows for the same order.
    this.addSql(
      `create unique index if not exists "UQ_cod_transaction_order_id_type" on "cod_transaction" ("order_id", "type") where order_id is not null and deleted_at is null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "UQ_cod_transaction_order_id_type";`);
    this.addSql(`drop index if exists "IDX_cod_transaction_customer_id";`);
    this.addSql(`drop index if exists "IDX_cod_transaction_order_id";`);
  }

}
