const envKey = 'GENKIT_ENV';
process.env[envKey] = 'prod';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// In production, Firebase Cloud Functions provide K_SERVICE or FUNCTION_TARGET.
// Next.js sets NODE_ENV='production' during local build/discovery, which caused the timeout.
const isCloudFunction = !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET;
const isDev = process.env.NODE_ENV === 'development';
const shouldInitPlugin = isCloudFunction || isDev;

const ai = genkit({
  plugins: shouldInitPlugin ? [
    googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || 'dummy-key-to-prevent-adc' }),
  ] : [],
  model: 'googleai/gemini-2.5-flash',
});

export {ai, googleAI};
