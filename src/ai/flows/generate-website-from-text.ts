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
 
  Structure the output as an array of file objects. Each object should have a 'path' and 'content'.
  Requirements:
  - Create following files: index.html, style.css, script.js
  - Generate complete and functional JavaScript code in script.js for all interactive elements described in the user's input (like buttons, game elements, forms, etc.).
  - Ensure the script.js file is correctly linked and executed in index.html using a <script src="script.js"></script> tag, preferably placed just before the closing </body> tag to ensure the HTML elements are loaded before the script runs.
  - Ensure all interactive elements have appropriate event listeners attached in the script.js file to perform the actions described.
  - If CSS is needed, use style.css and include it correctly in index.html using a <link rel="stylesheet" href="style.css"> tag.
  - Return only the JSON array of file objects with complete code for each file
  Example file structure:
  [
    { "path": "index.html", "content": "..." },
    { "path": "style.css", "content": "..." },
    { "path": "script.js", "content": "..." }
  ]`,
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
