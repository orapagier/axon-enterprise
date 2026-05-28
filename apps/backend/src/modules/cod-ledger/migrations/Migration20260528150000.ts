import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260528150000 extends Migration {

  override async up(): Promise<void> {
    // Deposit removed — drop the deposit_* transaction types, keeping only the
    // rider cash-ledger types.
    this.addSql(`alter table if exists "cod_transaction" drop constraint if exists "cod_transaction_type_check";`);
    this.addSql(`alter table if exists "cod_transaction" add constraint "cod_transaction_type_check" check ("type" in ('cod_collected', 'rider_remitted', 'reconciled'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "cod_transaction" drop constraint if exists "cod_transaction_type_check";`);
    this.addSql(`alter table if exists "cod_transaction" add constraint "cod_transaction_type_check" check ("type" in ('deposit_in', 'deposit_refund', 'deposit_forfeit', 'cod_collected', 'rider_remitted', 'reconciled'));`);
  }

}
