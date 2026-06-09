import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260610120000 extends Migration {

  override async up(): Promise<void> {
    // Add `otc_collected` — Over-the-Counter cash paid at the hub counter.
    // It is hub-held (no rider, no remittance leg), so it is tracked as its
    // own type and kept out of the rider collected−remitted outstanding math.
    this.addSql(
      `alter table if exists "cod_transaction" drop constraint if exists "cod_transaction_type_check";`
    );
    this.addSql(
      `alter table if exists "cod_transaction" add constraint "cod_transaction_type_check" check ("type" in ('cod_collected', 'rider_remitted', 'otc_collected', 'reconciled'));`
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "cod_transaction" drop constraint if exists "cod_transaction_type_check";`
    );
    this.addSql(
      `alter table if exists "cod_transaction" add constraint "cod_transaction_type_check" check ("type" in ('cod_collected', 'rider_remitted', 'reconciled'));`
    );
  }

}
