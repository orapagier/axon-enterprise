import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260614120000 extends Migration {

  override async up(): Promise<void> {
    // Phase H — record the EXPECTED cash on a ledger row so the remittance-aging
    // report can flag shortfalls (collected/remitted < expected). Nullable:
    // legacy rows and otc/reconciled rows leave it unset.
    this.addSql(
      `alter table if exists "cod_transaction" add column if not exists "expected_amount" integer null;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cod_transaction" drop column if exists "expected_amount";`
    );
  }

}
