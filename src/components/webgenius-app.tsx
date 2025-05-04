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
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Terminal, Download, Bot, Send, Eye, Code, FileJson, FileCode, FileType } from 'lucide-react'; // Added more icons
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
import { cn } from '@/lib/utils'; // Import cn utility

// Define the types for website code state
interface WebsiteCode {
  html: string;
  css: string;
  javascript: string;
}

// Simple Code Display Component (Integrated for simplicity)
interface CodeDisplayProps {
    code: string | null;
    language: string;
    isLoading: boolean;
    className?: string;
}

const CodeDisplay: FC<CodeDisplayProps> = ({ code, language, isLoading, className }) => {
    if (isLoading) {
        return (
            <div className={cn("p-4 space-y-2 h-full", className)}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
            </div>
        );
    }

    if (code === null || code.trim() === '') {
        return (
            <div className={cn("flex items-center justify-center h-full text-sm text-muted-foreground p-4", className)}>
                No {language} code generated yet or the generated code is empty.
            </div>
        );
    }

    return (
        <ScrollArea className={cn("h-full w-full rounded-md border bg-muted/20", className)}>
            <pre className="p-4 text-sm font-mono overflow-auto">
                <code className={`language-${language}`}>
                    {code}
                </code>
            </pre>
        </ScrollArea>
    );
};


// --- Input Panel Component ---
interface InputPanelProps {
    description: string;
    setDescription: (value: string) => void;
    userFeedback: string;
    setUserFeedback: (value: string) => void;
    websiteCode: WebsiteCode | null;
    isLoading: boolean;
    isGenerating: boolean; // Specific state for generation
    isUpdating: boolean; // Specific state for update
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
    isLoading, // Keep general loading state
    isGenerating,
    isUpdating,
    handleGenerateWebsite,
    handleUpdateWebsite,
    error,
    isMobile,
}) => {
    // Local state for textarea/input to avoid lag, only update parent on blur or button click
    const [localDescription, setLocalDescription] = useState(description);
    const [localFeedback, setLocalFeedback] = useState(userFeedback);

    // Update local state when props change (e.g., after generation/update)
    useEffect(() => {
        setLocalDescription(description);
    }, [description]);

    useEffect(() => {
        setLocalFeedback(userFeedback);
    }, [userFeedback]);

    // Update parent state on blur (optional, could also do it only on button click)
    const handleDescriptionBlur = () => {
        setDescription(localDescription);
    };
    const handleFeedbackBlur = () => {
        setUserFeedback(localFeedback);
    };

   return (
    <div className={cn(
        "flex flex-col h-full space-y-4",
        isMobile ? 'p-2' : 'p-4' // Adjust padding for mobile/desktop
    )}>
        <Card className="flex flex-col flex-grow shadow-sm border-none bg-transparent md:border md:bg-card md:border-border">
            <CardHeader className="pt-2 pb-2 md:pt-6 md:pb-6">
                <CardTitle className="text-lg md:text-xl">Describe Your Website</CardTitle>
                <CardDescription>
                    Enter a description or request updates for the generated site.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4 pt-0 pb-2 md:pb-6">
                <div className="flex-grow flex flex-col">
                    <Label htmlFor="description" className="mb-2">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="e.g., A landing page for a coffee shop with a hero image, menu section, and contact form."
                        value={localDescription}
                        onChange={(e) => setLocalDescription(e.target.value)}
                        onBlur={handleDescriptionBlur} // Update parent on blur
                        className="flex-grow min-h-[150px] resize-none text-sm" // Ensure text size consistency
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
                                value={localFeedback}
                                onChange={(e) => setLocalFeedback(e.target.value)}
                                onBlur={handleFeedbackBlur} // Update parent on blur
                                disabled={isLoading}
                                className="flex-grow h-10 text-sm" // Ensure text size consistency
                                // Trigger update on Enter key press
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && localFeedback.trim()) {
                                        e.preventDefault(); // Prevent newline in input
                                        handleUpdateWebsite();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleUpdateWebsite}
                                disabled={isLoading || !localFeedback.trim()}
                                size="icon"
                                variant="ghost"
                                aria-label="Send Feedback"
                                className="h-10 w-10 flex-shrink-0"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch pt-2 md:pt-6">
                <Button
                    onClick={handleGenerateWebsite}
                    disabled={isLoading || !localDescription.trim()}
                    size={isMobile ? "lg" : "default"} // Larger button on mobile
                >
                    {isGenerating ? ( // Use specific generating state
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </>
                    ) : isUpdating ? ( // Use specific updating state
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                        </>
                    ) : (
                        websiteCode ? 'Generate / Regenerate' : 'Generate Website' // Changed button text
                    )}
                </Button>
                 {/* Show a subtle hint about regeneration */}
                 {websiteCode && !isLoading && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                        Modifying the description and clicking again will regenerate the entire site.
                    </p>
                 )}
            </CardFooter>
        </Card>

        {error && (
            <Alert variant="destructive" className="mt-auto"> {/* Push error to bottom */}
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
    activeOutputTab: string;
    setActiveOutputTab: (value: string) => void;
}

const PreviewPanelContent: FC<PreviewPanelProps> = ({
    isLoading,
    websiteCode,
    previewSrcDoc,
    error,
    isMobile,
    activeOutputTab,
    setActiveOutputTab,
}) => {
    const showContent = !!websiteCode || isLoading || !!error; // Determine if any content area should be shown

    return (
        <div className={cn(
            "flex flex-col h-full",
             isMobile ? 'p-0' : 'p-4' // No padding on mobile, handled by parent or tabs
        )}>
             {/* Use Tabs for Preview, HTML, CSS, JS */}
             <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab} className="flex-grow flex flex-col h-full overflow-hidden border-none bg-transparent md:border md:bg-card md:border-border md:rounded-lg md:shadow-sm">
                 <CardHeader className={cn(
                     "flex flex-row items-center justify-between pb-2 pt-2 md:pt-4",
                     isMobile ? 'border-b' : '' // Border only on mobile header
                 )}>
                    {!isMobile && (
                        <div>
                            <CardTitle className="text-lg md:text-xl">Output</CardTitle>
                            <CardDescription>
                                View the preview or the generated code.
                            </CardDescription>
                        </div>
                     )}
                     <TabsList className={cn(
                         "grid grid-cols-4 gap-1 h-9",
                         isMobile ? 'w-full' : 'ml-auto' // Full width on mobile
                     )}>
                         <TabsTrigger value="preview" className="text-xs px-2 h-full" disabled={!previewSrcDoc && !isLoading && !error}>
                             <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                         </TabsTrigger>
                         <TabsTrigger value="html" className="text-xs px-2 h-full" disabled={!websiteCode && !isLoading}>
                             <FileCode className="w-3.5 h-3.5 mr-1" /> HTML
                         </TabsTrigger>
                         <TabsTrigger value="css" className="text-xs px-2 h-full" disabled={!websiteCode && !isLoading}>
                             <FileType className="w-3.5 h-3.5 mr-1" /> CSS
                         </TabsTrigger>
                         <TabsTrigger value="js" className="text-xs px-2 h-full" disabled={!websiteCode && !isLoading}>
                             <FileJson className="w-3.5 h-3.5 mr-1" /> JS
                         </TabsTrigger>
                     </TabsList>
                 </CardHeader>

                 <CardContent className="flex-grow p-0 overflow-auto relative">
                     {/* Preview Tab */}
                     <TabsContent value="preview" className="mt-0 h-full w-full absolute inset-0" hidden={activeOutputTab !== 'preview'}>
                        {/* Loading Skeleton for Preview */}
                        {isLoading && !websiteCode && (
                            <div className="flex items-center justify-center h-full bg-background">
                                <div className="space-y-4 p-4 w-full max-w-md">
                                    <Skeleton className="h-12 w-3/4" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-5/6" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-6 w-1/2" />
                                </div>
                            </div>
                        )}
                        {/* Initial State Message */}
                        {!isLoading && !websiteCode && !error && (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center bg-background">
                                <p>Enter a description and click "Generate Website" to see the preview.</p>
                            </div>
                        )}
                        {/* Preview Iframe */}
                        {previewSrcDoc && (
                            <iframe
                                srcDoc={previewSrcDoc}
                                title="Website Preview"
                                className="w-full h-full border-0 bg-white" // White background for iframe
                                sandbox="allow-scripts allow-same-origin" // Security measure
                            />
                        )}
                        {/* Error Message in Preview */}
                        {error && !websiteCode && (
                             <div className="flex items-center justify-center h-full text-destructive p-4 text-center bg-background">
                                <p>An error occurred. Please check the input panel for details.</p>
                            </div>
                        )}
                     </TabsContent>

                    {/* HTML Tab */}
                    <TabsContent value="html" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'html'}>
                       <CodeDisplay
                           code={websiteCode?.html ?? null}
                           language="html"
                           isLoading={isLoading && !websiteCode} // Show loading only if no previous code
                           className="h-full"
                       />
                    </TabsContent>

                    {/* CSS Tab */}
                    <TabsContent value="css" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'css'}>
                        <CodeDisplay
                            code={websiteCode?.css ?? null}
                            language="css"
                            isLoading={isLoading && !websiteCode}
                            className="h-full"
                        />
                    </TabsContent>

                    {/* JS Tab */}
                    <TabsContent value="js" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'js'}>
                        <CodeDisplay
                            code={websiteCode?.javascript ?? null}
                            language="javascript"
                            isLoading={isLoading && !websiteCode}
                            className="h-full"
                        />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </div>
    );
};


const WebGeniusApp: FC = () => {
  const [description, setDescription] = useState<string>('');
  const [websiteCode, setWebsiteCode] = useState<WebsiteCode | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading state
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // Specific state
  const [isUpdating, setIsUpdating] = useState<boolean>(false); // Specific state
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Check if the device is mobile
  const [activeMobileTab, setActiveMobileTab] = useState<string>('chat'); // For mobile tab state (Chat vs Output)
  const [activeOutputTab, setActiveOutputTab] = useState<string>('preview'); // For output panel tabs (Preview, HTML, etc.)


  // Effect to update the iframe source document when websiteCode changes
  useEffect(() => {
    if (websiteCode) {
      const srcDoc = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
              /* Basic reset and smooth scrolling */
              body { margin: 0; font-family: sans-serif; }
              html { scroll-behavior: smooth; }
              /* Ensure iframe content is visible even if body has specific background */
              body { background-color: white !important; }
              ${websiteCode.css}
            </style>
          </head>
          <body>
            ${websiteCode.html}
            <script>${websiteCode.javascript}</script>
          </body>
        </html>
      `;
      setPreviewSrcDoc(srcDoc);

      // Switch to output tab on mobile after generation/update if chat was active
      if (isMobile && activeMobileTab === 'chat' && (websiteCode.html || websiteCode.css || websiteCode.javascript)) {
          setActiveMobileTab('output');
          // Default to preview tab within output panel
          setActiveOutputTab('preview');
      } else if (!isMobile && (websiteCode.html || websiteCode.css || websiteCode.javascript)) {
           // On desktop, ensure the preview tab is active after generation/update
           setActiveOutputTab('preview');
      }
    } else {
      setPreviewSrcDoc(''); // Clear preview if no code
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteCode]); // Removed isMobile dependency - switching is handled inside effect


  const handleGenerateWebsite = useCallback(async () => {
    // Use the description directly from state, as local state is now handled differently
    if (!description.trim()) {
      setError('Please enter a description for the website.');
      return;
    }
    setIsLoading(true);
    setIsGenerating(true); // Set specific generating state
    setIsUpdating(false);
    setError(null);
    // setWebsiteCode(null); // Keep old code visible while generating
    setPreviewSrcDoc(''); // Clear preview immediately

    try {
      const result: GenerateWebsiteOutput = await generateWebsite({ description });
       if (result && typeof result.html === 'string' && typeof result.css === 'string' && typeof result.javascript === 'string') {
           setWebsiteCode(result); // Update code only on success
           toast({
               title: 'Website Generated',
               description: 'Your website has been successfully generated!',
           });
       } else {
           throw new Error('AI response did not contain valid code.');
       }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate website. ${errorMessage}`);
      // Keep old code on error? setWebsiteCode(null);
      setPreviewSrcDoc(''); // Ensure preview is cleared on error
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: `There was an error generating the website: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false); // Clear specific generating state
    }
  }, [description, toast]);


    const handleUpdateWebsite = useCallback(async () => {
        if (!websiteCode) {
            setError('Please generate a website first before requesting updates.');
            toast({ variant: 'destructive', title: 'Update Error', description: 'Generate a website first.' });
            return;
        }
        if (!userFeedback.trim()) {
            setError('Please provide feedback for the update request.');
             toast({ variant: 'destructive', title: 'Update Error', description: 'Enter your update request.' });
            return;
        }

        setIsLoading(true);
        setIsUpdating(true); // Set specific updating state
        setIsGenerating(false);
        setError(null);
        // Keep the old code visible while updating

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

            if (!result || typeof result.suggestedUpdates !== 'string' || !result.suggestedUpdates.trim()) {
                throw new Error('AI response did not contain valid suggested updates.');
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(result.suggestedUpdates, 'text/html');

            if (!doc || !doc.body) {
                throw new Error('Failed to parse suggested updates.');
            }

            let extractedHtml = doc.body.innerHTML;
            let extractedCss = '';
            let extractedJs = '';

            const styleTag = doc.head?.querySelector('style') ?? doc.body?.querySelector('style');
            if (styleTag) {
                extractedCss = styleTag.textContent || '';
                if (doc.body.contains(styleTag)) {
                    styleTag.remove();
                    extractedHtml = doc.body.innerHTML;
                }
            }

            const scriptTag = doc.body?.querySelector('script') ?? doc.head?.querySelector('script');
            if (scriptTag) {
                extractedJs = scriptTag.textContent || '';
                if (doc.body.contains(scriptTag)) {
                    scriptTag.remove();
                    extractedHtml = doc.body.innerHTML;
                }
            }

            extractedHtml = extractedHtml?.trim() ?? '';
            extractedCss = extractedCss ?? '';
            extractedJs = extractedJs ?? '';

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
                 console.warn('Parsed update resulted in empty code.');
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
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: `There was an error updating the website: ${errorMessage}`,
            });
        } finally {
            setIsLoading(false);
            setIsUpdating(false); // Clear specific updating state
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
    link.download = 'index.html';
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
    <div className={cn(
        "flex flex-col h-screen bg-muted/20 overflow-hidden", // Prevent body scroll
        isMobile ? 'p-0' : 'p-4 gap-4' // No padding/gap on mobile root
        )}>
      {/* Header */}
       <header className={cn(
           "flex justify-between items-center shrink-0 border-b",
           isMobile ? 'px-3 py-2' : 'px-0 pb-3' // Mobile header padding
        )}>
        <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> WebGenius
        </h1>
        <Button
          onClick={handleDownloadCode}
          disabled={!websiteCode || (!websiteCode.html && !websiteCode.css && !websiteCode.javascript) || isLoading}
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-0">
          {isMobile ? (
             // --- Mobile View (Tabs) ---
             <Tabs value={activeMobileTab} onValueChange={setActiveMobileTab} className="flex flex-col flex-grow overflow-hidden border-none bg-transparent">
                 {/* Content Panes */}
                 <TabsContent value="chat" className="flex-grow mt-0 overflow-auto" hidden={activeMobileTab !== 'chat'}>
                     <InputPanelContent
                        description={description}
                        setDescription={setDescription}
                        userFeedback={userFeedback}
                        setUserFeedback={setUserFeedback}
                        websiteCode={websiteCode}
                        isLoading={isLoading}
                        isGenerating={isGenerating}
                        isUpdating={isUpdating}
                        handleGenerateWebsite={handleGenerateWebsite}
                        handleUpdateWebsite={handleUpdateWebsite}
                        error={error}
                        isMobile={isMobile}
                     />
                 </TabsContent>
                 <TabsContent value="output" className="flex-grow mt-0 overflow-hidden p-0" hidden={activeMobileTab !== 'output'}>
                     <PreviewPanelContent
                        isLoading={isLoading}
                        websiteCode={websiteCode}
                        previewSrcDoc={previewSrcDoc}
                        error={error}
                        isMobile={isMobile}
                        activeOutputTab={activeOutputTab}
                        setActiveOutputTab={setActiveOutputTab}
                     />
                 </TabsContent>

                 {/* Bottom Navigation */}
                 <div className="shrink-0 border-t bg-background shadow-inner px-2 pt-1.5 pb-2">
                     <TabsList className="grid w-full grid-cols-2 h-11">
                         <TabsTrigger value="chat" className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                             <Code className="w-4 h-4 mr-1.5"/>
                             Input
                         </TabsTrigger>
                         <TabsTrigger
                             value="output"
                             className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                             // Enable if loading, has error, or has some code/preview
                             disabled={!isLoading && !error && !previewSrcDoc && !websiteCode}
                         >
                             <Eye className="w-4 h-4 mr-1.5" />
                             Output
                         </TabsTrigger>
                     </TabsList>
                </div>
             </Tabs>

          ) : (
            // --- Desktop View (Resizable Panels) ---
            <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border shadow-md bg-background overflow-hidden min-h-0">
              {/* Input Panel */}
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="min-h-0">
                 <InputPanelContent
                    description={description}
                    setDescription={setDescription}
                    userFeedback={userFeedback}
                    setUserFeedback={setUserFeedback}
                    websiteCode={websiteCode}
                    isLoading={isLoading}
                    isGenerating={isGenerating}
                    isUpdating={isUpdating}
                    handleGenerateWebsite={handleGenerateWebsite}
                    handleUpdateWebsite={handleUpdateWebsite}
                    error={error}
                    isMobile={isMobile}
                 />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-border hover:bg-primary/50 active:bg-primary/60 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none w-1.5 data-[resize-handle-state=drag]:bg-primary/50" />

              {/* Output Panel */}
              <ResizablePanel defaultSize={65} minSize={30} className="min-h-0">
                 <PreviewPanelContent
                    isLoading={isLoading}
                    websiteCode={websiteCode}
                    previewSrcDoc={previewSrcDoc}
                    error={error}
                    isMobile={isMobile}
                    activeOutputTab={activeOutputTab}
                    setActiveOutputTab={setActiveOutputTab}
                 />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
      </div>
    </div>
  );
};

export default WebGeniusApp;
