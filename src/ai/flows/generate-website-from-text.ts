// src/ai/flows/generate-website-from-text.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that generates website code (HTML, CSS, and JavaScript) from a textual description.
 *
 * generateWebsite - A function that generates website code from a text description.
 * GenerateWebsiteInput - The input type for the generateWebsite function.
 * GenerateWebsiteOutput - The return type for the generateWebsite function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateWebsiteInputSchema = z.object({
  description: z.string().describe('A text description of the website to generate.'),
});
export type GenerateWebsiteInput = z.infer<typeof GenerateWebsiteInputSchema>;

const GenerateWebsiteOutputSchema = z.object({
  html: z.string().describe('The HTML code for the website.'),
  css: z.string().describe('The CSS code for the website.'),
  javascript: z.string().describe('The JavaScript code for the website.'),
});
export type GenerateWebsiteOutput = z.infer<typeof GenerateWebsiteOutputSchema>;

export async function generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteOutput> {
  return generateWebsiteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWebsitePrompt',
  input: {
    schema: z.object({
      description: z.string().describe('A text description of the website to generate.'),
    }),
  },
  output: {
    schema: z.object({
      html: z.string().describe('The HTML code for the website.'),
      css: z.string().describe('The CSS code for the website.'),
      javascript: z.string().describe('The JavaScript code for the website.'),
    }),
  },
  prompt: `You are an AI web developer that generates HTML, CSS, and JavaScript code for a website based on a text description.

  Description: {{{description}}}

  Generate the HTML, CSS, and JavaScript code for the website based on the description. Return the code as a JSON object with the keys "html", "css", and "javascript". Make sure each code block is complete.
  Do not include any explanation or comments in the generated code.
  `,
});

const generateWebsiteFlow = ai.defineFlow<
  typeof GenerateWebsiteInputSchema,
  typeof GenerateWebsiteOutputSchema
>(
  {
    name: 'generateWebsiteFlow',
    inputSchema: GenerateWebsiteInputSchema,
    outputSchema: GenerateWebsiteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

