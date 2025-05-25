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
  if (!input?.description) {
    throw new Error('Description is required');
  }
  
  try {
    return await generateWebsiteFlow(input);
  } catch (error) {
    console.error('Generate website flow error:', error);
    throw error;
  }
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
  - For ANY interactive elements (buttons, forms, games, etc), ensure they have:
    1. Proper HTML elements with unique IDs
    2. Complete JavaScript event listeners in script.js
    3. Proper initialization after DOM loads using DOMContentLoaded
  - Use vanilla JavaScript (no external libraries)
  - All interactive elements must be fully functional
  - Test all event listeners and interactions work
  - Add console.log() statements to verify code execution
  - Ensure proper event delegation for dynamic elements
  - Place script.js at end of body with defer attribute
  - Return only valid, working code
  Example structure:
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
    try {
      const {output} = await prompt(input);
      
      if (!output || !Array.isArray(output)) {
        throw new Error('Invalid AI response format');
      }

      const requiredFiles = ['index.html', 'style.css', 'script.js'];
      const missingFiles = requiredFiles.filter(
        file => !output.some(f => f.path === file)
      );

      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }

      return output;
    } catch (error) {
      console.error('Generate website flow error:', error);
      throw error;
    }
  }
);
