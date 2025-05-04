// src/components/webgenius-app.tsx
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
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Download, Bot, Send, Eye, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateWebsite,
  type GenerateWebsiteOutput,
} from '@/ai/flows/generate-website-from-text';
import {
  suggestWebsiteUpdates,
  type SuggestWebsiteUpdatesOutput,
} from '@/ai/flows/suggest-website-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile'; // Import useIsMobile hook

// Define the types for website code state
interface WebsiteCode {
  html: string;
  css: string;
  javascript: string;
}

// --- Input Panel Component ---
interface InputPanelProps {
    description: string;
    setDescription: (value: string) => void;
    userFeedback: string;
    setUserFeedback: (value: string) => void;
    websiteCode: WebsiteCode | null;
    isLoading: boolean;
    handleGenerateWebsite: () => void;
    handleUpdateWebsite: () => void;
    error: string | null;
    isMobile: boolean;
}

const InputPanelContent: FC<InputPanelProps> = ({
    description,
    setDescription,
    userFeedback,
    setUserFeedback,
    websiteCode,
    isLoading,
    handleGenerateWebsite,
    handleUpdateWebsite,
    error,
    isMobile,
}) => {
    // Local state for textarea to avoid lag
    const [localDescription, setLocalDescription] = useState(description);
    const [localFeedback, setLocalFeedback] = useState(userFeedback);

    // Update local state when props change (e.g., after generation/update)
    useEffect(() => {
        setLocalDescription(description);
    }, [description]);

    useEffect(() => {
        setLocalFeedback(userFeedback);
    }, [userFeedback]);

    // Handler to update both local and parent state
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalDescription(e.target.value);
        setDescription(e.target.value); // Update parent state immediately or debounced
    };

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFeedback(e.target.value);
        setUserFeedback(e.target.value); // Update parent state immediately or debounced
    };


   return (
    <div className={`flex flex-col h-full ${isMobile ? 'p-0' : 'p-4'} space-y-4`}>
        <Card className="flex flex-col flex-grow shadow-sm">
            <CardHeader>
                <CardTitle>Describe Your Website</CardTitle>
                <CardDescription>
                    Enter a description of the website you want the AI to create or modify.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4">
                <div className="flex-grow flex flex-col">
                    <Label htmlFor="description" className="mb-2">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="e.g., A landing page for a coffee shop with a hero image, menu section, and contact form."
                        value={localDescription} // Use local state
                        onChange={handleDescriptionChange} // Use controlled update handler
                        className="flex-grow min-h-[150px] resize-none"
                        disabled={isLoading}
                    />
                </div>
                {/* Update Section */}
                {websiteCode && (
                    <div className="pt-4 border-t space-y-2">
                        <Label htmlFor="feedback">Request Updates (Optional)</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="feedback"
                                placeholder="e.g., Change the background to light blue"
                                value={localFeedback} // Use local state
                                onChange={handleFeedbackChange} // Use controlled update handler
                                disabled={isLoading}
                                className="flex-grow"
                            />
                            <Button
                                onClick={handleUpdateWebsite}
                                disabled={isLoading || !localFeedback.trim()} // Check local state
                                size="icon"
                                variant="ghost"
                                aria-label="Send Feedback"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch">
                <Button onClick={handleGenerateWebsite} disabled={isLoading || !localDescription.trim()}> {/* Check local state */}
                    {isLoading && !userFeedback ? ( // Show generating only if not updating
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : isLoading && userFeedback ? ( // Show updating if loading and feedback exists
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                        </>
                    ) : (
                        websiteCode ? 'Generate / Update Website' : 'Generate Website'
                    )}
                </Button>
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
   );
};


// --- Preview Panel Component ---
interface PreviewPanelProps {
    isLoading: boolean;
    websiteCode: WebsiteCode | null;
    previewSrcDoc: string;
    error: string | null;
    isMobile: boolean;
}

const PreviewPanelContent: FC<PreviewPanelProps> = ({
    isLoading,
    websiteCode,
    previewSrcDoc,
    error,
    isMobile,
}) => (
    <div className={`flex flex-col h-full ${isMobile ? 'p-0' : 'p-4'}`}>
        <Card className="flex-grow flex flex-col shadow-sm overflow-hidden">
            {!isMobile && ( // Only show header on desktop
                <CardHeader>
                    <CardTitle>Website Preview</CardTitle>
                    <CardDescription>
                        View the generated website below. Updates appear in real-time.
                    </CardDescription>
                </CardHeader>
            )}
            <CardContent className="flex-grow p-0 overflow-auto bg-white"> {/* Use overflow-auto */}
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
                    <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
                        <p>Enter a description and click "Generate Website" to see the preview.</p>
                    </div>
                )}
                {/* Ensure previewSrcDoc is not empty before rendering iframe */}
                {previewSrcDoc && (
                    <iframe
                        srcDoc={previewSrcDoc}
                        title="Website Preview"
                        className="w-full h-full border-0" // Let CardContent handle rounding
                        sandbox="allow-scripts allow-same-origin" // Security measure
                    />
                )}
                {/* Show error message only if there's an error AND no code exists */}
                {error && !websiteCode && (
                    <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
                        <p>An error occurred. Please check the error message and try again.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);


const WebGeniusApp: FC = () => {
  const [description, setDescription] = useState<string>('');
  const [websiteCode, setWebsiteCode] = useState<WebsiteCode | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Check if the device is mobile
  const [activeTab, setActiveTab] = useState<string>('chat'); // For mobile tab state


  // Effect to update the iframe source document when websiteCode changes
  useEffect(() => {
    // Only update srcDoc if websiteCode is not null
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
      // Switch to preview tab on mobile after generation/update if chat was active
      // and if the generated code is not empty
      if (isMobile && activeTab === 'chat' && (websiteCode.html || websiteCode.css || websiteCode.javascript)) {
          setActiveTab('preview');
      }
    } else {
      // If websiteCode becomes null (e.g., during initial load or error without prior code), clear the preview
      setPreviewSrcDoc('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteCode, isMobile]); // Only depends on websiteCode and isMobile


  const handleGenerateWebsite = useCallback(async () => {
    if (!description.trim()) {
      setError('Please enter a description for the website.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setWebsiteCode(null); // Clear previous code *before* generation starts
    setPreviewSrcDoc(''); // Clear preview immediately

    try {
      const result: GenerateWebsiteOutput = await generateWebsite({ description });
       // Check if the result is valid before setting the state
       if (result && typeof result.html === 'string' && typeof result.css === 'string' && typeof result.javascript === 'string') {
           setWebsiteCode(result);
           toast({
               title: 'Website Generated',
               description: 'Your website has been successfully generated!',
           });
       } else {
           // Handle case where AI might return invalid data
           throw new Error('AI response did not contain valid code.');
       }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate website. ${errorMessage}`);
      setWebsiteCode(null); // Ensure websiteCode is null on error
      setPreviewSrcDoc(''); // Ensure preview is cleared on error
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: `There was an error generating the website: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [description, toast]);


    const handleUpdateWebsite = useCallback(async () => {
        // Ensure websiteCode exists and feedback is provided
        if (!websiteCode) {
            setError('Please generate a website first before requesting updates.');
            toast({
                variant: 'destructive',
                title: 'Update Error',
                description: 'Generate a website first.',
            });
            return;
        }
        if (!userFeedback.trim()) {
            setError('Please provide feedback for the update request.');
             toast({
                variant: 'destructive',
                title: 'Update Error',
                description: 'Enter your update request.',
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        // Don't clear websiteCode here, keep the old one until update succeeds

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

            // Check if suggestedUpdates is valid before parsing
            if (!result || typeof result.suggestedUpdates !== 'string' || !result.suggestedUpdates.trim()) {
                throw new Error('AI response did not contain valid suggested updates.');
            }


            // Basic parsing (improved slightly)
            const parser = new DOMParser();
            // Use 'text/html' for robust parsing, even with incomplete HTML snippets
            const doc = parser.parseFromString(result.suggestedUpdates, 'text/html');

            // Check if parsing was successful (basic check)
            if (!doc || !doc.body) {
                throw new Error('Failed to parse suggested updates.');
            }


            let extractedHtml = doc.body.innerHTML;
            let extractedCss = '';
            let extractedJs = '';

            // Extract CSS from <style> in <head> or <body>
            const styleTag = doc.head?.querySelector('style') ?? doc.body?.querySelector('style');
            if (styleTag) {
                extractedCss = styleTag.textContent || '';
                // If style tag was in body, remove it to avoid duplication in html
                if (doc.body.contains(styleTag)) {
                    styleTag.remove();
                    extractedHtml = doc.body.innerHTML; // Update html after removal
                }
            }

            // Extract JS from <script> in <body> or <head>
            const scriptTag = doc.body?.querySelector('script') ?? doc.head?.querySelector('script');
            if (scriptTag) {
                extractedJs = scriptTag.textContent || '';
                 // If script tag was in body, remove it to avoid duplication in html
                if (doc.body.contains(scriptTag)) {
                    scriptTag.remove();
                    extractedHtml = doc.body.innerHTML; // Update html after removal
                }
            }


             // Ensure extracted parts are strings, default to empty string if null/undefined
            extractedHtml = extractedHtml?.trim() ?? '';
            extractedCss = extractedCss ?? '';
            extractedJs = extractedJs ?? '';


            // Only update if we have some content
            if (extractedHtml || extractedCss || extractedJs) {
                 setWebsiteCode({
                    html: extractedHtml,
                    css: extractedCss,
                    javascript: extractedJs,
                });
                 setUserFeedback(''); // Clear feedback input only on successful update
                 toast({
                    title: 'Website Updated',
                    description: 'The website has been updated based on your feedback.',
                });
            } else {
                 // If parsing resulted in empty content, treat it as an error or warning
                 console.warn('Parsed update resulted in empty code.');
                 // Optionally keep the old code or show a specific message
                 toast({
                     variant: 'destructive',
                     title: 'Update Warning',
                     description: 'The AI update resulted in empty code. No changes applied.',
                 });
            }


        } catch (err) {
            console.error('Error updating website:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to update website. ${errorMessage}`);
            // Don't clear website code on error, keep the last working version
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: `There was an error updating the website: ${errorMessage}`,
            });
        } finally {
            setIsLoading(false);
        }
    }, [websiteCode, userFeedback, toast]);


  const handleDownloadCode = useCallback(() => {
    if (!websiteCode || (!websiteCode.html && !websiteCode.css && !websiteCode.javascript)) {
      setError('No website code to download.');
      toast({
        variant: 'destructive',
        title: 'Download Error',
        description: 'Generate or update a website first before downloading.',
      });
      return;
    }

    // Combine HTML, CSS, JS into a single index.html
    const fullHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    ${websiteCode.css ? `<style>\n${websiteCode.css}\n    </style>` : ''}
</head>
<body>
${websiteCode.html || '<!-- No HTML content generated -->'}
    ${websiteCode.javascript ? `<script>\n${websiteCode.javascript}\n    </script>` : ''}
</body>
</html>
    `;

    const blob = new Blob([fullHtmlContent.trim()], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'index.html'; // Download as single HTML file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);


    toast({
      title: 'Code Downloaded',
      description: 'Website downloaded as index.html.',
    });
  }, [websiteCode, toast]);


  // --- Main Render ---

  return (
    <div className={`flex flex-col h-screen ${isMobile ? 'p-2' : 'p-4'} gap-4 bg-muted/20`}>
      <header className="flex justify-between items-center pb-2 border-b">
        <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-6 h-6" /> WebGenius
        </h1>
        <Button
          onClick={handleDownloadCode}
          disabled={!websiteCode || (!websiteCode.html && !websiteCode.css && !websiteCode.javascript) || isLoading}
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </header>

      {isMobile ? (
         // --- Mobile View (Tabs) ---
         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow h-full overflow-hidden">
             {/* Use hidden attribute for better performance/SEO than conditional rendering */}
             <TabsContent value="chat" className="flex-grow mt-0 overflow-auto" hidden={activeTab !== 'chat'}>
                 <InputPanelContent
                    description={description}
                    setDescription={setDescription}
                    userFeedback={userFeedback}
                    setUserFeedback={setUserFeedback}
                    websiteCode={websiteCode}
                    isLoading={isLoading}
                    handleGenerateWebsite={handleGenerateWebsite}
                    handleUpdateWebsite={handleUpdateWebsite}
                    error={error}
                    isMobile={isMobile}
                 />
             </TabsContent>
             <TabsContent value="preview" className="flex-grow mt-0 overflow-auto" hidden={activeTab !== 'preview'}>
                 <PreviewPanelContent
                    isLoading={isLoading}
                    websiteCode={websiteCode}
                    previewSrcDoc={previewSrcDoc}
                    error={error}
                    isMobile={isMobile}
                 />
             </TabsContent>
             {/* Place TabsList at the bottom */}
             <div className="mt-auto p-2 border-t bg-background rounded-b-lg shadow-inner">
                 <TabsList className="grid w-full grid-cols-2 h-12">
                     <TabsTrigger value="chat" className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                         <Code className="w-4 h-4 mr-2"/>
                         Chat / Input
                     </TabsTrigger>
                     {/* Disable preview tab if there's absolutely nothing to show */}
                     <TabsTrigger
                         value="preview"
                         className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                         disabled={!previewSrcDoc && !isLoading && !error}
                     >
                         <Eye className="w-4 h-4 mr-2" />
                         Preview
                     </TabsTrigger>
                 </TabsList>
            </div>
         </Tabs>

      ) : (
        // --- Desktop View (Resizable Panels) ---
        <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border shadow-md bg-background overflow-hidden">
          {/* Input Panel */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
             <InputPanelContent
                description={description}
                setDescription={setDescription}
                userFeedback={userFeedback}
                setUserFeedback={setUserFeedback}
                websiteCode={websiteCode}
                isLoading={isLoading}
                handleGenerateWebsite={handleGenerateWebsite}
                handleUpdateWebsite={handleUpdateWebsite}
                error={error}
                isMobile={isMobile}
             />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary active:bg-primary focus:bg-primary transition-colors duration-200 w-2" />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={65} minSize={30}>
             <PreviewPanelContent
                isLoading={isLoading}
                websiteCode={websiteCode}
                previewSrcDoc={previewSrcDoc}
                error={error}
                isMobile={isMobile}
             />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default WebGeniusApp;
