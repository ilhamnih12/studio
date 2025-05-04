'use client';

import type { FC } from 'react';
import React, { useState, useCallback, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // Added for user feedback
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Download, Bot, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateWebsite,
  type GenerateWebsiteOutput,
} from '@/ai/flows/generate-website-from-text';
import {
  suggestWebsiteUpdates,
  type SuggestWebsiteUpdatesOutput,
} from '@/ai/flows/suggest-website-updates';
import { Skeleton } from '@/components/ui/skeleton'; // Added for loading state


// Define the types for website code state
interface WebsiteCode {
  html: string;
  css: string;
  javascript: string;
}

const WebGeniusApp: FC = () => {
  const [description, setDescription] = useState<string>('');
  const [websiteCode, setWebsiteCode] = useState<WebsiteCode | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>(''); // Added for update feedback
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const { toast } = useToast();

  // Effect to update the iframe source document when websiteCode changes
  useEffect(() => {
    if (websiteCode) {
      const srcDoc = `
        <html>
          <head>
            <style>${websiteCode.css}</style>
          </head>
          <body>
            ${websiteCode.html}
            <script>${websiteCode.javascript}</script>
          </body>
        </html>
      `;
      setPreviewSrcDoc(srcDoc);
    } else {
      setPreviewSrcDoc(''); // Clear preview if no code
    }
  }, [websiteCode]);

  const handleGenerateWebsite = useCallback(async () => {
    if (!description.trim()) {
      setError('Please enter a description for the website.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setWebsiteCode(null); // Clear previous code

    try {
      const result: GenerateWebsiteOutput = await generateWebsite({ description });
      setWebsiteCode(result);
      toast({
        title: 'Website Generated',
        description: 'Your website has been successfully generated!',
      });
    } catch (err) {
      console.error('Error generating website:', err);
      setError(
        `Failed to generate website. ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'There was an error generating the website.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [description, toast]);

  const handleUpdateWebsite = useCallback(async () => {
    if (!websiteCode || !userFeedback.trim()) {
      setError(
        'Please generate a website first and provide feedback for updates.'
      );
      return;
    }
    setIsLoading(true);
    setError(null);

    const currentWebsiteCode = `
      <html>
        <head>
          <style>${websiteCode.css}</style>
        </head>
        <body>
          ${websiteCode.html}
          <script>${websiteCode.javascript}</script>
        </body>
      </html>
    `;

    try {
      const result: SuggestWebsiteUpdatesOutput = await suggestWebsiteUpdates({
        currentWebsiteCode,
        userFeedback,
      });

      // Basic parsing of the suggested code (assuming it's a full HTML document)
      // A more robust parser would be needed for complex scenarios
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.suggestedUpdates, 'text/html');
      const styleTag = doc.head.querySelector('style');
      const scriptTag = doc.body.querySelector('script');
      const bodyContent = doc.body.innerHTML.replace(/<script.*?>.*?<\/script>/gs, '').trim(); // Remove script tag from body content


      setWebsiteCode({
        html: bodyContent || doc.body.innerHTML, // Fallback if parsing fails
        css: styleTag?.textContent || '',
        javascript: scriptTag?.textContent || '',
      });

      setUserFeedback(''); // Clear feedback input after update
      toast({
        title: 'Website Updated',
        description: 'The website has been updated based on your feedback.',
      });
    } catch (err) {
      console.error('Error updating website:', err);
      setError(
        `Failed to update website. ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      );
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'There was an error updating the website.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [websiteCode, userFeedback, toast]);

  const handleDownloadCode = useCallback(() => {
    if (!websiteCode) {
      setError('No website code to download.');
      toast({
        variant: 'destructive',
        title: 'Download Error',
        description: 'Generate a website first before downloading.',
      });
      return;
    }

    const files = [
      { name: 'index.html', content: websiteCode.html },
      { name: 'style.css', content: websiteCode.css },
      { name: 'script.js', content: websiteCode.javascript },
    ];

    files.forEach(file => {
      if (file.content.trim()) { // Only download if there's content
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    });

    toast({
      title: 'Code Downloaded',
      description: 'Website files have been downloaded.',
    });
  }, [websiteCode, toast]);

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <header className="flex justify-between items-center pb-2 border-b">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-6 h-6" /> WebGenius
        </h1>
        <Button
          onClick={handleDownloadCode}
          disabled={!websiteCode || isLoading}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Code
        </Button>
      </header>

      <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border shadow-md">
        {/* Input Panel */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="flex flex-col h-full p-4 space-y-4">
             <Card className="flex flex-col flex-grow">
              <CardHeader>
                <CardTitle>Describe Your Website</CardTitle>
                <CardDescription>
                  Enter a description of the website you want the AI to create.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <Label htmlFor="description" className="sr-only">Description</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., A landing page for a coffee shop with a hero image, menu section, and contact form."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-grow min-h-[150px] resize-none"
                  disabled={isLoading}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-2 items-stretch">
                 <Button onClick={handleGenerateWebsite} disabled={isLoading || !description.trim()}>
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate Website'
                  )}
                </Button>
                {/* Update Section */}
                {websiteCode && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                     <Label htmlFor="feedback">Request Updates (Optional)</Label>
                     <div className="flex gap-2">
                      <Input
                        id="feedback"
                        placeholder="e.g., Change the background to light blue"
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        disabled={isLoading}
                        className="flex-grow"
                      />
                      <Button
                        onClick={handleUpdateWebsite}
                        disabled={isLoading || !userFeedback.trim()}
                        size="icon"
                        aria-label="Send Feedback"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>

            {error && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview Panel */}
        <ResizablePanel defaultSize={65} minSize={30}>
          <div className="flex flex-col h-full p-4">
            <Card className="flex-grow flex flex-col">
               <CardHeader>
                <CardTitle>Website Preview</CardTitle>
                <CardDescription>
                  View the generated website below. Updates appear in real-time.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow p-0 overflow-hidden">
                {isLoading && !websiteCode && (
                   <div className="flex items-center justify-center h-full">
                    <div className="space-y-4 p-4 w-full">
                      <Skeleton className="h-12 w-3/4" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-5/6" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-6 w-1/2" />
                      </div>
                   </div>
                )}
                {!isLoading && !websiteCode && !error && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Enter a description and click "Generate Website" to see the preview.</p>
                  </div>
                )}
                 {previewSrcDoc && (
                   <iframe
                     srcDoc={previewSrcDoc}
                     title="Website Preview"
                     className="w-full h-full border-0 rounded-b-md" // Ensure iframe takes full space and has no border
                     sandbox="allow-scripts allow-same-origin" // Security measure
                   />
                 )}
                 {error && !websiteCode && (
                    <div className="flex items-center justify-center h-full text-destructive">
                        <p>An error occurred. Please check the error message and try again.</p>
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default WebGeniusApp;
