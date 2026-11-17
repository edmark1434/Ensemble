import CreditEconomyDesk from '@/pages/admin/creditEconomy/CreditEconomyDesk';

/**
 * Same Credits & economy desk as Admin. Support is the only moderator role that may adjust
 * or hold credits; the API hides staff wallets and staff ledger rows from it.
 */
export default function SupportCreditsWallets() {
  return <CreditEconomyDesk variant="support" />;
}
