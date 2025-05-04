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
      if (isMobile && activeTab === 'chat') {
        setActiveTab('preview');
      }
    } else {
      setPreviewSrcDoc(''); // Clear preview if no code
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteCode, isMobile]); // Add isMobile dependency

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

      // Basic parsing (improved slightly)
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.suggestedUpdates, 'text/html');

      let extractedHtml = doc.body.innerHTML;
      let extractedCss = '';
      let extractedJs = '';

      // Extract CSS
      const styleTag = doc.head.querySelector('style');
      if (styleTag) {
        extractedCss = styleTag.textContent || '';
      } else {
        // Fallback: check body for style tag if not in head
        const bodyStyleTag = doc.body.querySelector('style');
        if (bodyStyleTag) {
           extractedCss = bodyStyleTag.textContent || '';
           bodyStyleTag.remove(); // Remove from body html
           extractedHtml = doc.body.innerHTML; // Update html after removal
        }
      }


      // Extract JS
      const scriptTag = doc.body.querySelector('script');
      if (scriptTag) {
        extractedJs = scriptTag.textContent || '';
        scriptTag.remove(); // Remove from body html
        extractedHtml = doc.body.innerHTML; // Update html after removal
      } else {
           // Fallback: check head for script tag if not in body
           const headScriptTag = doc.head.querySelector('script');
           if (headScriptTag) {
               extractedJs = headScriptTag.textContent || '';
           }
       }


      setWebsiteCode({
        html: extractedHtml.trim(),
        css: extractedCss,
        javascript: extractedJs,
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

    // Combine HTML, CSS, JS into a single index.html for simplicity
    // CSS is embedded in <style>, JS is embedded in <script>
    const fullHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    <style>
${websiteCode.css}
    </style>
</head>
<body>
${websiteCode.html}
    <script>
${websiteCode.javascript}
    </script>
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

  // --- Render Helper Components ---

  const InputPanelContent = () => (
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
               value={description}
               onChange={(e) => setDescription(e.target.value)}
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
                     value={userFeedback}
                     onChange={(e) => setUserFeedback(e.target.value)}
                     disabled={isLoading}
                     className="flex-grow"
                   />
                   <Button
                     onClick={handleUpdateWebsite}
                     disabled={isLoading || !userFeedback.trim()}
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
          <Button onClick={handleGenerateWebsite} disabled={isLoading || !description.trim()}>
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

 const PreviewPanelContent = () => (
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
          {previewSrcDoc && (
            <iframe
              srcDoc={previewSrcDoc}
              title="Website Preview"
              className="w-full h-full border-0" // Let CardContent handle rounding
              sandbox="allow-scripts allow-same-origin" // Security measure
            />
          )}
          {error && !websiteCode && (
            <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
              <p>An error occurred. Please check the error message and try again.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );


  // --- Main Render ---

  return (
    // Removed the incorrect <html> and <body> tags
    <div className={`flex flex-col h-screen ${isMobile ? 'p-2' : 'p-4'} gap-4 bg-muted/20`}>
      <header className="flex justify-between items-center pb-2 border-b">
        <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-6 h-6" /> WebGenius
        </h1>
        <Button
          onClick={handleDownloadCode}
          disabled={!websiteCode || isLoading}
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
             <TabsContent value="chat" className="flex-grow mt-0 overflow-auto">
                 <InputPanelContent />
             </TabsContent>
             <TabsContent value="preview" className="flex-grow mt-0 overflow-auto">
                 <PreviewPanelContent />
             </TabsContent>
             {/* Place TabsList at the bottom */}
             <div className="mt-auto p-2 border-t bg-background rounded-b-lg">
                 <TabsList className="grid w-full grid-cols-2 h-12">
                     <TabsTrigger value="chat" className="h-full text-sm">
                         <Code className="w-4 h-4 mr-2"/>
                         Chat / Input
                     </TabsTrigger>
                     <TabsTrigger value="preview" className="h-full text-sm" disabled={!websiteCode && !isLoading}>
                         <Eye className="w-4 h-4 mr-2" />
                         Preview
                     </TabsTrigger>
                 </TabsList>
            </div>
         </Tabs>

      ) : (
        // --- Desktop View (Resizable Panels) ---
        <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border shadow-md bg-background">
          {/* Input Panel */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <InputPanelContent />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary transition-colors duration-200 w-2" />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={65} minSize={30}>
            <PreviewPanelContent />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default WebGeniusApp;
    