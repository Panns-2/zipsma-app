'use server';

import { ai, googleAI } from '@/ai/genkit';
import { z } from 'zod';

const FinanceAnalyticsInputSchema = z.object({
  totalIncome: z.number().describe('Total school fees and income collected.'),
  totalOutstanding: z.number().describe('Total unpaid debt owed by students.'),
  expendituresThisMonth: z.number().describe('Total money spent this month.'),
  dailyFeesIncome: z.number().describe('Income collected from daily recurring fees like feeding and transport.'),
  dailyFeesOutstanding: z.number().describe('Unpaid debt specifically for daily recurring fees.'),
  recentExpenditures: z.array(
    z.object({
      category: z.string(),
      amount: z.number(),
    })
  ).describe('A brief list of recent expense categories and amounts.'),
  totalStudentsWithDebt: z.number().describe('Number of students who currently owe money.'),
});

export type FinanceAnalyticsInput = z.infer<typeof FinanceAnalyticsInputSchema>;

const FinanceAnalyticsOutputSchema = z.object({
  healthSummary: z.string().describe('A high-level narrative summary of the school’s financial health.'),
  actionableInsights: z.array(z.string()).describe('Specific actions the administrator should take to improve finances.'),
  warnings: z.array(z.string()).describe('Potential financial risks or anomalies to watch out for.'),
});

export type FinanceAnalyticsOutput = z.infer<typeof FinanceAnalyticsOutputSchema>;

const analyzeFinancesPrompt = ai.definePrompt({
    name: 'analyzeFinancesPrompt',
    input: { schema: FinanceAnalyticsInputSchema },
    output: { schema: FinanceAnalyticsOutputSchema },
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are an expert Financial Advisor and Accountant for a Ghanaian educational institution.
    The school administrator has requested an AI analysis of the current financial data.

    Here is the current financial snapshot:
    Total Income Collected: GH¢{{totalIncome}}
    Total Debt Owed by Students: GH¢{{totalOutstanding}}
    Total Expenditures (This Month): GH¢{{expendituresThisMonth}}
    Daily Recurring Fees Income (Feeding/Transport): GH¢{{dailyFeesIncome}}
    Daily Recurring Fees Debt: GH¢{{dailyFeesOutstanding}}
    Number of Students in Debt: {{totalStudentsWithDebt}}
    
    Recent Expenditure Breakdown:
    {{#each recentExpenditures}}
    - {{this.category}}: GH¢{{this.amount}}
    {{/each}}

    CRITICAL REQUIREMENTS:
    1. Provide a professional, encouraging, but realistic 'healthSummary' (1-2 paragraphs). Mention profit margins roughly based on income vs expenditures.
    2. Provide 2-4 'actionableInsights'. Focus heavily on debt recovery strategies and balancing revenue vs expenditure.
    3. Provide 1-3 'warnings'. Flag any alarming ratios (e.g., if debt is too close to collected income, or if daily recurring fee debt is spiraling).
    4. Keep the tone executive and tailored for a School Principal or Bursar.`,
});

export const analyzeFinancesFlow = ai.defineFlow(
  {
    name: 'analyzeFinancesFlow',
    inputSchema: FinanceAnalyticsInputSchema,
    outputSchema: FinanceAnalyticsOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeFinancesPrompt(input);
    return output!;
  }
);

export async function generateFinanceReport(input: FinanceAnalyticsInput): Promise<FinanceAnalyticsOutput> {
    return analyzeFinancesFlow(input);
}
