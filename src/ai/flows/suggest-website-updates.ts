// src/ai/flows/suggest-website-updates.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting website updates based on user feedback.
 *
 * The flow takes in the current website code and user feedback, and returns a suggestion
 * for updated website code.
 *
 * @remarks
 * - suggestWebsiteUpdates - The main function that triggers the website update suggestion flow.
 * - SuggestWebsiteUpdatesInput - The input type for the suggestWebsiteUpdates function.
 * - SuggestWebsiteUpdatesOutput - The output type for the suggestWebsiteUpdates function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestWebsiteUpdatesInputSchema = z.object({
  currentWebsiteCode: z
    .string()
    .describe('The current HTML/CSS/JS code of the website.'),
  userFeedback: z
    .string()
    .describe(
      'The user feedback on the website, e.g., \'make the header bigger\' or \'change the button color\'.' // keep the backslashes, otherwise the string will not be valid
    ),
});
export type SuggestWebsiteUpdatesInput = z.infer<typeof SuggestWebsiteUpdatesInputSchema>;

const SuggestWebsiteUpdatesOutputSchema = z.object({
  suggestedUpdates: z
    .string()
    .describe(
      'The suggested updated HTML/CSS/JS code for the website, based on the user feedback.'
    ),
});
export type SuggestWebsiteUpdatesOutput = z.infer<typeof SuggestWebsiteUpdatesOutputSchema>;

export async function suggestWebsiteUpdates(
  input: SuggestWebsiteUpdatesInput
): Promise<SuggestWebsiteUpdatesOutput> {
  return suggestWebsiteUpdatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestWebsiteUpdatesPrompt',
  input: {
    schema: z.object({
      currentWebsiteCode: z
        .string()
        .describe('The current HTML/CSS/JS code of the website.'),
      userFeedback: z
        .string()
        .describe(
          'The user feedback on the website, e.g., \'make the header bigger\' or \'change the button color\'.'
        ),
    }),
  },
  output: {
    schema: z.object({
      suggestedUpdates: z
        .string()
        .describe(
          'The suggested updated HTML/CSS/JS code for the website, based on the user feedback.'
        ),
    }),
  },
  prompt: `You are an AI expert in web design. You will receive the current code of a website and user feedback on the website.
Based on the user feedback, you will suggest updated code for the website. Ensure the suggested code is valid HTML/CSS/JS. Do not include any explanation, only provide code.

Current Website Code:
\`\`\`html
{{{currentWebsiteCode}}}
\`\`\`

User Feedback:
{{{userFeedback}}}

Suggested Updates:
`, // keep the backslashes, otherwise the string will not be valid
});

const suggestWebsiteUpdatesFlow = ai.defineFlow<
  typeof SuggestWebsiteUpdatesInputSchema,
  typeof SuggestWebsiteUpdatesOutputSchema
>({
  name: 'suggestWebsiteUpdatesFlow',
  inputSchema: SuggestWebsiteUpdatesInputSchema,
  outputSchema: SuggestWebsiteUpdatesOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});

