import * as fs from 'fs';

// Read output of task-114
const logContent = fs.readFileSync('C:/Users/User/.gemini/antigravity-ide/brain/d5aaa568-ea17-4156-bfcb-830e2271fa7b/.system_generated/tasks/task-114.log', 'utf8');

const match = logContent.match(/Total Outstanding: (.*)/);
if (match) console.log('Total Outstanding:', match[1]);

const ledgerMatch = logContent.match(/Ledger: (\[[\s\S]*\])/);
if (ledgerMatch) {
    const ledger = JSON.parse(ledgerMatch[1]);
    
    // mimic getPeriodBalances
    const prevTransactions = ledger.filter(t => t.periodId === '2025-2026-T6679');
    const currentTransactions = ledger.filter(t => t.periodId === '2026-2027-F1566');
    
    const bf = prevTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0) - (Number(t.credit) || 0), 0);
    const billed = currentTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
    const paid = currentTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
    
    const adminBilled = (bf > 0 ? bf : 0) + billed;
    const adminPaid = (bf < 0 ? Math.abs(bf) : 0) + paid;
    const balance = adminBilled - adminPaid;
    
    console.log({ bf, billed, paid, adminBilled, adminPaid, balance });
}
