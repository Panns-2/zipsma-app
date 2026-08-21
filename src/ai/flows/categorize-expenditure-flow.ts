'use server';

import { ai, googleAI } from '@/ai/genkit';
import { z } from 'zod';
import { allExpenditureCategories } from '@/lib/constants';

const CategorizeExpenditureInputSchema = z.object({
  description: z.string().describe('The description of the expenditure.'),
});

export type CategorizeExpenditureInput = z.infer<typeof CategorizeExpenditureInputSchema>;

const CategorizeExpenditureOutputSchema = z.object({
  category: z.string().describe('The most appropriate category for the expenditure.'),
});

export type CategorizeExpenditureOutput = z.infer<typeof CategorizeExpenditureOutputSchema>;

const categorizeExpenditurePrompt = ai.definePrompt({
    name: 'categorizeExpenditurePrompt',
    input: { schema: CategorizeExpenditureInputSchema },
    output: { schema: CategorizeExpenditureOutputSchema },
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are an expert accountant categorizing expenses for a school.
    
    The user has entered the following expense description: "{{description}}"
    
    Choose the ONE most appropriate category from the following allowed list:
    ${allExpenditureCategories.join(', ')}
    
    If none fit perfectly, choose the closest match, or "Other" as a last resort.`,
});

export const categorizeExpenditureFlow = ai.defineFlow(
  {
    name: 'categorizeExpenditureFlow',
    inputSchema: CategorizeExpenditureInputSchema,
    outputSchema: CategorizeExpenditureOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await categorizeExpenditurePrompt(input);
        
        // Ensure the output category is actually in the allowed list
        let category = output?.category;
        if (!category || !allExpenditureCategories.includes(category)) {
             category = 'Other';
        }
        
        return { category };
    } catch (error) {
        console.error("Genkit categorizeExpenditurePrompt Error:", error);
        return { category: 'Other' };
    }
  }
);
