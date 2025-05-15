// src/ai/flows/suggest-website-updates.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting website updates based on user feedback, operating on a file structure.
 *
 * The flow takes in the current website files and user feedback, and returns the suggested
 * updated website files.
 *
 * @remarks
 * - suggestWebsiteUpdates - The main function that triggers the website update suggestion flow.
 * - SuggestWebsiteUpdatesInput - The input type for the suggestWebsiteUpdates function.
 * - SuggestWebsiteUpdatesOutput - The output type for the suggestWebsiteUpdates function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define a schema for a single file (reusable)
export const FileSchema = z.object({
    path: z.string().describe('The full path of the file (e.g., index.html, css/style.css)'),
    content: z.string().describe('The content of the file.'),
});

const SuggestWebsiteUpdatesInputSchema = z.object({
  currentFiles: z.array(FileSchema).describe('An array representing the current files of the website.'),
  userFeedback: z
    .string()
    .describe(
      'The user feedback on the website, e.g., \'make the header bigger\' or \'change the button color\'.'
    ),
});
export type SuggestWebsiteUpdatesInput = z.infer<typeof SuggestWebsiteUpdatesInputSchema>;

// Output schema is also an array of files
const SuggestWebsiteUpdatesOutputSchema = z.array(FileSchema).describe('An array representing the suggested updated files for the website.');
export type SuggestWebsiteUpdatesOutput = z.infer<typeof SuggestWebsiteUpdatesOutputSchema>;

export async function suggestWebsiteUpdates(
  input: SuggestWebsiteUpdatesInput
): Promise<SuggestWebsiteUpdatesOutput> {
  return suggestWebsiteUpdatesFlow(input);
}

// Helper to format files for the prompt
function formatFilesForPrompt(files: z.infer<typeof FileSchema>[]): string {
    return files.map(file => `
\`\`\`${getLanguageFromPath(file.path)} (${file.path})
${file.content}
\`\`\`
`).join('\n');
}

// Helper function to determine language (can be moved to utils if needed elsewhere)
function getLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'html';
        case 'css': return 'css';
        case 'js': return 'javascript';
        default: return 'text'; // Default to text if unknown
    }
}


const prompt = ai.definePrompt({
  name: 'suggestWebsiteUpdatesPrompt',
  input: {
    schema: z.object({
      formattedFiles: z.string().describe("The current website files formatted as concatenated code blocks."),
      userFeedback: SuggestWebsiteUpdatesInputSchema.shape.userFeedback, // Reuse schema part
    })
  },
  output: {
    schema: SuggestWebsiteUpdatesOutputSchema, // Expecting array of files as output
  },
  prompt: `You are an AI expert in web design. You will receive the current code of a website structured as multiple files and user feedback.
Based on the user feedback, suggest updated code for the website, maintaining the file structure.
Return the complete updated code for ALL relevant files as a JSON array of file objects, where each object has 'path' and 'content'.
Ensure the suggested code is valid and addresses the feedback. Do not include explanations outside the code. If a file doesn't need changes, return its original content.

Current Website Files:
{{{formattedFiles}}}

User Feedback:
{{{userFeedback}}}

Suggested Updated Files (Return only the JSON array):
`,
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
  // Format the input files for the prompt
  const formattedFiles = formatFilesForPrompt(input.currentFiles);

  const {output} = await prompt({
      formattedFiles: formattedFiles,
      userFeedback: input.userFeedback,
  });

  // Ensure output is an array, provide default empty array if not
  return Array.isArray(output) ? output : [];
});
