// src/ai/flows/generate-website-from-text.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow that generates website code (HTML, CSS, and JavaScript) as separate files from a textual description.
 *
 * generateWebsite - A function that generates website files from a text description.
 * GenerateWebsiteInput - The input type for the generateWebsite function.
 * GenerateWebsiteOutput - The return type for the generateWebsite function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateWebsiteInputSchema = z.object({
  description: z.string().describe('A text description of the website to generate.'),
});
export type GenerateWebsiteInput = z.infer<typeof GenerateWebsiteInputSchema>;

// Define a schema for a single file
const FileSchema = z.object({
    path: z.string().describe('The full path of the file (e.g., index.html, css/style.css, js/script.js)'),
    content: z.string().describe('The content of the file.'),
});

// Output schema is now an array of files
const GenerateWebsiteOutputSchema = z.array(FileSchema).describe('An array of files representing the website structure.');
export type GenerateWebsiteOutput = z.infer<typeof GenerateWebsiteOutputSchema>;

export async function generateWebsite(input: GenerateWebsiteInput): Promise<GenerateWebsiteOutput> {
  return generateWebsiteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWebsitePrompt',
  input: {
    schema: GenerateWebsiteInputSchema,
  },
  output: {
    schema: GenerateWebsiteOutputSchema, // Use the new output schema
  },
  prompt: `You are an AI web developer. Generate the necessary HTML, CSS, and JavaScript files for a website based on the following description.

  Description: {{{description}}}

  Structure the output as an array of file objects. Each object should have a 'path' (e.g., "index.html", "style.css", "script.js") and 'content' (the code for that file).
  - Create standard file names: index.html, style.css, script.js.
  - If CSS or JS is simple, you can include it directly in the HTML file using <style> or <script> tags, but prefer separate files for better organization if the code is more complex. If you use separate files, ensure the HTML file includes the correct <link> tag for the CSS and <script> tag for the JavaScript.
  - Provide complete code for each file. Do not include explanations or comments outside the code itself.
  - Return only the JSON array of file objects.
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
    // Ensure output is an array, provide default empty array if not
    return Array.isArray(output) ? output : [];
  }
);
