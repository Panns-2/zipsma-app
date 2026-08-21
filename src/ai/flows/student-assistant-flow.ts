
'use server';

/**
 * @fileOverview AI flows to assist students with their learning.
 */

import { ai, googleAI } from '@/ai/genkit';
import { z } from 'zod';

// 1. Homework Helper
const ExplainConceptInputSchema = z.object({
  question: z.string().describe('The homework question or concept the student needs help with.'),
  className: z.string().describe("The student's class level, e.g., 'Primary 4'."),
});
export type ExplainConceptInput = z.infer<typeof ExplainConceptInputSchema>;

const ExplainConceptOutputSchema = z.object({
  explanation: z.string().describe('A simple explanation, hint, or breakdown of the concept.'),
});
export type ExplainConceptOutput = z.infer<typeof ExplainConceptOutputSchema>;

export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  return explainConceptFlow(input);
}

const explainConceptPrompt = ai.definePrompt({
    name: 'explainConceptPrompt',
    input: { schema: ExplainConceptInputSchema },
    output: { schema: ExplainConceptOutputSchema },
    model: googleAI.model('gemini-flash-latest'),
    prompt: `You are a friendly, patient, and encouraging Ghanaian Tutor and NaCCA Curriculum Expert.
    A student from class "{{className}}" has asked for help with the following question or concept: "{{question}}". 
    
    Your task is to provide a simple, age-appropriate explanation, hint, or a step-by-step breakdown to help the student understand — NOT to give the final answer.
    
    CRITICAL REQUIREMENTS:
    1. DO NOT give the final answer directly. Your role is to guide, not to solve. Facilitate deep learning.
    2. Use Ghanaian cultural contexts, local names (e.g., Kofi, Ama, Abena, Kwame), local landmarks (e.g., Accra, Kumasi, the Akosombo Dam, Kejetia Market), and everyday Ghanaian scenarios to make the explanation relatable and engaging.
    3. For Primary level students: use very simple language, real-world analogies, and concrete examples.
    4. For JHS level: align your explanation with the Common Core Programme (CCP) structure — emphasize understanding the concept deeply, not rote memorization.
    5. For SHS level: explain using structured reasoning, relevant Ghanaian exam context (WASSCE), and encourage critical thinking.
    6. If the question is a maths problem, break it down step by step, showing the method and letting the student try each step.
    7. End with an encouraging statement that motivates the student to keep trying.
    8. Keep your response concise and well-structured (use bullet points or numbered steps where appropriate).`,
});


const explainConceptFlow = ai.defineFlow(
  {
    name: 'explainConceptFlow',
    inputSchema: ExplainConceptInputSchema,
    outputSchema: ExplainConceptOutputSchema,
  },
  async (input) => {
    const { output } = await explainConceptPrompt(input);
    return output!;
  }
);


// 2. Revision Assistant
const SummarizeTopicInputSchema = z.object({
  topic: z.string().describe('The topic or subject the student wants a summary of.'),
});
export type SummarizeTopicInput = z.infer<typeof SummarizeTopicInputSchema>;

const SummarizeTopicOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key points for the given topic, formatted in markdown.'),
});
export type SummarizeTopicOutput = z.infer<typeof SummarizeTopicOutputSchema>;

export async function summarizeTopic(input: SummarizeTopicInput): Promise<SummarizeTopicOutput> {
  return summarizeTopicFlow(input);
}

const summarizeTopicPrompt = ai.definePrompt({
    name: 'summarizeTopicPrompt',
    input: { schema: SummarizeTopicInputSchema },
    output: { schema: SummarizeTopicOutputSchema },
    model: googleAI.model('gemini-flash-latest'),
    prompt: `You are a helpful and expert study assistant specializing in the Ghanaian National Curriculum (NaCCA/GES).
    A student needs a revision summary for the topic: "{{topic}}".
    
    Please generate a comprehensive but concise revision summary of the most important key points for this topic.
    
    FORMAT REQUIREMENTS:
    - Use proper markdown formatting: headings (##), bullet points (-), bold (**text**), and numbered lists where appropriate.
    - Start with a brief 1-2 sentence overview of what the topic is about.
    - Then cover the key concepts, definitions, facts, and processes under clear subheadings.
    - End with a "Key Things to Remember" section with 3-5 bullet points.
    
    CONTENT REQUIREMENTS:
    - Focus on the core competencies and learning indicators defined by GES/NaCCA for this topic.
    - Use Ghanaian examples wherever applicable:
      * Science topics: mention Akosombo Dam (electricity), Volta River (water cycle), Ghana's cocoa industry (agriculture), etc.
      * History/Social Studies: reference Ghanaian leaders (Kwame Nkrumah, etc.), events, and places.
      * Maths: use Ghana Cedis (GH¢), local market scenarios, local names in word problems.
      * English: use Ghanaian proverbs, stories, or contexts where relevant.
    - Ensure the depth and language complexity is appropriate for a Ghanaian student studying this topic.
    - The output MUST be in well-formatted markdown.`,
});

const summarizeTopicFlow = ai.defineFlow(
  {
    name: 'summarizeTopicFlow',
    inputSchema: SummarizeTopicInputSchema,
    outputSchema: SummarizeTopicOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeTopicPrompt(input);
    return output!;
  }
);


// 3. AI Quiz Generator
const QuizGeneratorInputSchema = z.object({
    topic: z.string().describe('The topic or subject for the quiz.'),
});
export type QuizGeneratorInput = z.infer<typeof QuizGeneratorInputSchema>;

const QuizQuestionSchema = z.object({
    question: z.string().describe('The quiz question.'),
    options: z.array(z.string()).describe('A list of 4 possible answers (multiple choice).'),
    answer: z.string().describe('The correct answer from the options list.'),
});

const QuizGeneratorOutputSchema = z.object({
    questions: z.array(QuizQuestionSchema).describe('A list of 3-5 multiple choice questions.'),
});
export type QuizGeneratorOutput = z.infer<typeof QuizGeneratorOutputSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export async function generateQuiz(input: QuizGeneratorInput): Promise<QuizGeneratorOutput> {
    return quizGeneratorFlow(input);
}

const quizGeneratorPrompt = ai.definePrompt({
    name: 'quizGeneratorPrompt',
    input: { schema: QuizGeneratorInputSchema },
    output: { schema: QuizGeneratorOutputSchema },
    model: googleAI.model('gemini-flash-latest'),
    prompt: `You are an expert educational quiz creator for Ghanaian students, aligned with GES/NaCCA examination standards.
    A student wants a short practice quiz on the topic: "{{topic}}".
    
    Please generate exactly 4 multiple-choice questions based on this topic.
    
    REQUIREMENTS:
    - Each question must have exactly 4 answer options (A, B, C, D style content — but return them as plain text in the options array).
    - Exactly one option must be the correct answer (specified in the "answer" field, which must match one of the options exactly).
    - Cover different aspects of the topic across the 4 questions (e.g., definition, application, identification, comparison).
    - Use Ghanaian context, names (Kofi, Ama, Kwame, Abena), places (Accra, Kumasi, Tamale, Cape Coast), and cultural references where appropriate to make questions relatable.
    - Ensure the questions are clear, unambiguous, and at an appropriate difficulty level for a Ghanaian student.
    - For Science/Maths: include calculation-based or diagram-interpretation type questions where suitable.
    - For History/Social Studies: include questions about Ghanaian leaders, events, and institutions.
    - The 4 options should be plausible — wrong answers should not be obviously incorrect.`,
});

const quizGeneratorFlow = ai.defineFlow(
    {
        name: 'quizGeneratorFlow',
        inputSchema: QuizGeneratorInputSchema,
        outputSchema: QuizGeneratorOutputSchema,
    },
    async (input) => {
        const { output } = await quizGeneratorPrompt(input);
        return output!;
    }
);
