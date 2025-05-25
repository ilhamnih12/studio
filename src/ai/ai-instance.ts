import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { useSettings } from '@/stores/settings';

export const getAIInstance = () => {
  const { customApiKey } = useSettings.getState();
  
  return genkit({
    promptDir: './prompts',
    plugins: [
      googleAI({
        apiKey: customApiKey || process.env.GOOGLE_GENAI_API_KEY,
      }),
    ],
    model: 'googleai/gemini-2.0-flash',
  });
};
