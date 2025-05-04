// src/components/webgenius-app.tsx
'use client';

import type { FC } from 'react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Download, Bot, Send, Eye, Code, File as FileIcon, Folder, Play, Save, FileCode, FileType, FileJson } from 'lucide-react'; // Added icons
import { useToast } from '@/hooks/use-toast';
import {
  generateWebsite,
  type GenerateWebsiteOutput,
} from '@/ai/flows/generate-website-from-text';
import {
  suggestWebsiteUpdates,
  type SuggestWebsiteUpdatesOutput,
  type FileSchema as UpdateFileSchema, // Import the schema directly
} from '@/ai/flows/suggest-website-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// --- Types ---
interface FileNode {
    path: string;
    content: string;
    type: 'file' | 'folder'; // Folders might not have content initially
}

// --- Helper Functions ---
function getLanguageFromPath(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'html';
        case 'css': return 'css';
        case 'js': return 'javascript';
        default: return 'plaintext';
    }
}

// Extracts code from FileNode array, prioritizing standard names
function extractCodeFromFiles(files: FileNode[]): { html: string; css: string; javascript: string } {
    let html = files.find(f => f.path === 'index.html')?.content || '';
    let css = files.find(f => f.path === 'style.css')?.content || '';
    let javascript = files.find(f => f.path === 'script.js')?.content || '';

    // Fallback if standard names aren't used (simple check)
    if (!html) html = files.find(f => f.path.endsWith('.html'))?.content || '';
    if (!css) css = files.find(f => f.path.endsWith('.css'))?.content || '';
    if (!javascript) javascript = files.find(f => f.path.endsWith('.js'))?.content || '';

    return { html, css, javascript };
}

// --- File Explorer Component ---
interface FileExplorerProps {
    files: FileNode[] | null;
    selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
    isLoading: boolean;
    className?: string;
}

const FileExplorer: FC<FileExplorerProps> = ({ files, selectedFilePath, onSelectFile, isLoading, className }) => {
    if (isLoading && !files) {
        return (
            <div className={cn("p-2 space-y-2", className)}>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
            </div>
        );
    }

    if (!files || files.length === 0) {
        return (
            <div className={cn("p-2 text-sm text-muted-foreground", className)}>
                No files generated yet.
            </div>
        );
    }

    // Basic list view for now, could be enhanced with tree structure later
    return (
        <ScrollArea className={cn("h-full", className)}>
            <div className="p-1 space-y-0.5">
                {files.map((file) => (
                    <Button
                        key={file.path}
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "w-full justify-start h-7 text-xs px-2",
                            selectedFilePath === file.path && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => onSelectFile(file.path)}
                    >
                        {file.type === 'folder' ? <Folder className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /> : <FileIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />}
                        <span className="truncate">{file.path}</span>
                    </Button>
                ))}
                {/* Add Folder Button (Future enhancement) */}
                {/* <Button variant="outline" size="sm" className="mt-2 w-full h-7 text-xs">
                    <FolderPlus className="w-3.5 h-3.5 mr-1.5" /> Add Folder
                </Button> */}
            </div>
        </ScrollArea>
    );
};


// --- Editable Code Display Component ---
interface EditableCodeDisplayProps {
    content: string | null;
    language: string;
    isLoading: boolean;
    onChange: (newContent: string) => void;
    className?: string;
}

const EditableCodeDisplay: FC<EditableCodeDisplayProps> = ({ content, language, isLoading, onChange, className }) => {

    if (isLoading) {
        return (
            <div className={cn("p-4 space-y-2 h-full", className)}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        );
    }

     if (content === null) {
        return (
            <div className={cn("flex items-center justify-center h-full text-sm text-muted-foreground p-4", className)}>
                Select a file to view or edit its content.
            </div>
        );
    }

    return (
        <Textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`// ${language} code...`}
            className={cn(
                "font-mono text-sm h-full w-full resize-none border rounded-md bg-muted/20 focus-visible:ring-1 focus-visible:ring-ring p-4",
                 "whitespace-pre overflow-auto", // Ensure proper code formatting
                 className
            )}
            spellCheck="false"
        />
    );
};


// --- Input Panel Component ---
interface InputPanelProps {
    description: string;
    setDescription: (value: string) => void;
    userFeedback: string;
    setUserFeedback: (value: string) => void;
    hasGeneratedCode: boolean; // Changed from websiteCode prop
    isLoading: boolean;
    isGenerating: boolean;
    isUpdating: boolean;
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
    hasGeneratedCode, // Use boolean flag
    isLoading,
    isGenerating,
    isUpdating,
    handleGenerateWebsite,
    handleUpdateWebsite,
    error,
    isMobile,
}) => {
    // Keep local state for inputs
    const [localDescription, setLocalDescription] = useState(description);
    const [localFeedback, setLocalFeedback] = useState(userFeedback);

    useEffect(() => {
        setLocalDescription(description);
    }, [description]);

    useEffect(() => {
        setLocalFeedback(userFeedback);
    }, [userFeedback]);

    // Update parent state on change (simpler approach)
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalDescription(e.target.value);
        setDescription(e.target.value); // Update parent immediately
    };
    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalFeedback(e.target.value);
        setUserFeedback(e.target.value); // Update parent immediately
    };

   return (
    <div className={cn(
        "flex flex-col h-full space-y-4",
        isMobile ? 'p-2' : 'p-4'
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
                        placeholder="e.g., A landing page for a coffee shop..."
                        value={localDescription}
                        onChange={handleDescriptionChange} // Use immediate update
                        className="flex-grow min-h-[150px] resize-none text-sm"
                        disabled={isLoading}
                    />
                </div>
                {/* Update Section */}
                {hasGeneratedCode && ( // Check boolean flag
                    <div className="pt-4 border-t space-y-2">
                        <Label htmlFor="feedback">Request Updates (Optional)</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="feedback"
                                placeholder="e.g., Change the background to light blue"
                                value={localFeedback}
                                onChange={handleFeedbackChange} // Use immediate update
                                disabled={isLoading}
                                className="flex-grow h-10 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && localFeedback.trim()) {
                                        e.preventDefault();
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
                    size={isMobile ? "lg" : "default"}
                >
                    {/* Loading indicators remain the same */}
                    {isGenerating ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</>
                    ) : isUpdating ? (
                        <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Updating...</>
                    ) : (
                        hasGeneratedCode ? 'Generate / Regenerate' : 'Generate Website'
                    )}
                </Button>
                 {hasGeneratedCode && !isLoading && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                        Modifying the description and clicking again will regenerate the entire site.
                    </p>
                 )}
            </CardFooter>
        </Card>

        {error && (
            <Alert variant="destructive" className="mt-auto">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
    </div>
   );
};

// --- Output Panel Component (Modified) ---
interface OutputPanelProps {
    files: FileNode[] | null;
    isLoading: boolean;
    previewSrcDoc: string;
    error: string | null;
    isMobile: boolean;
    activeOutputTab: string;
    setActiveOutputTab: (value: string) => void;
    selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
    onFileContentChange: (path: string, newContent: string) => void;
    onRunCode: () => void; // Add callback for run button
}

const OutputPanelContent: FC<OutputPanelProps> = ({
    files,
    isLoading,
    previewSrcDoc,
    error,
    isMobile,
    activeOutputTab,
    setActiveOutputTab,
    selectedFilePath,
    onSelectFile,
    onFileContentChange,
    onRunCode,
}) => {
    const showContent = !!files || isLoading || !!error;
    const selectedFile = useMemo(() => files?.find(f => f.path === selectedFilePath), [files, selectedFilePath]);

    // Determine which tab should host the editor (Files or specific code tabs)
    const isEditorTabActive = ['files', 'html', 'css', 'js'].includes(activeOutputTab);
    const editorLanguage = selectedFile ? getLanguageFromPath(selectedFile.path) : 'plaintext';

    // Extracted code for HTML/CSS/JS tabs (if needed, but primarily using Files tab now)
    const { html, css, javascript } = useMemo(() => files ? extractCodeFromFiles(files) : { html: '', css: '', javascript: '' }, [files]);

    // Get content for the currently selected file or the specific code tab
    const editorContent = useMemo(() => {
        if (activeOutputTab === 'html') return html;
        if (activeOutputTab === 'css') return css;
        if (activeOutputTab === 'js') return javascript;
        if (activeOutputTab === 'files' && selectedFile) return selectedFile.content;
        return null; // No content if not a code tab or no file selected in 'files' tab
    }, [activeOutputTab, selectedFile, html, css, javascript]);

    const handleEditorChange = useCallback((newContent: string) => {
        if (activeOutputTab === 'html') onFileContentChange('index.html', newContent);
        else if (activeOutputTab === 'css') onFileContentChange('style.css', newContent);
        else if (activeOutputTab === 'js') onFileContentChange('script.js', newContent);
        else if (activeOutputTab === 'files' && selectedFilePath) {
            onFileContentChange(selectedFilePath, newContent);
        }
    }, [activeOutputTab, selectedFilePath, onFileContentChange]);


    return (
        <div className={cn(
            "flex flex-col h-full",
             isMobile ? 'p-0' : 'p-4'
        )}>
             <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab} className="flex-grow flex flex-col h-full overflow-hidden border-none bg-transparent md:border md:bg-card md:border-border md:rounded-lg md:shadow-sm">
                 <CardHeader className={cn(
                     "flex flex-row items-center justify-between pb-2 pt-2 md:pt-4",
                     isMobile ? 'border-b' : '',
                     "relative" // Make header relative for absolute positioning of Run button
                 )}>
                    {!isMobile && (
                        <div>
                            <CardTitle className="text-lg md:text-xl">Output</CardTitle>
                            <CardDescription>
                                Preview, explore files, or edit code. Click 'Run' to apply edits.
                            </CardDescription>
                        </div>
                     )}
                     <div className={cn(
                         "flex items-center gap-1",
                          isMobile ? 'w-full justify-between' : 'ml-auto' // Take full width on mobile
                      )}>
                         <TabsList className={cn(
                             "grid grid-cols-5 gap-1 h-9", // Increased to 5 cols
                             isMobile ? 'flex-grow' : ''
                         )}>
                            {/* Adjusted TabsTrigger */}
                             <TabsTrigger value="preview" className="text-xs px-2 h-full" disabled={!previewSrcDoc && !isLoading && !error}>
                                 <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                             </TabsTrigger>
                             <TabsTrigger value="files" className="text-xs px-2 h-full" disabled={!files && !isLoading}>
                                 <Folder className="w-3.5 h-3.5 mr-1" /> Files
                             </TabsTrigger>
                              <TabsTrigger value="html" className="text-xs px-2 h-full" disabled={!files && !isLoading}>
                                 <FileCode className="w-3.5 h-3.5 mr-1" /> HTML
                             </TabsTrigger>
                             <TabsTrigger value="css" className="text-xs px-2 h-full" disabled={!files && !isLoading}>
                                 <FileType className="w-3.5 h-3.5 mr-1" /> CSS
                             </TabsTrigger>
                             <TabsTrigger value="js" className="text-xs px-2 h-full" disabled={!files && !isLoading}>
                                 <FileJson className="w-3.5 h-3.5 mr-1" /> JS
                             </TabsTrigger>
                         </TabsList>
                         <Button
                            onClick={onRunCode}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 flex-shrink-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                            disabled={!files || isLoading}
                            aria-label="Run Code Changes"
                          >
                            <Play className="w-5 h-5" />
                          </Button>
                    </div>

                 </CardHeader>

                 <CardContent className="flex-grow p-0 overflow-auto relative">
                     {/* Preview Tab */}
                     <TabsContent value="preview" className="mt-0 h-full w-full absolute inset-0" hidden={activeOutputTab !== 'preview'}>
                        {isLoading && !files && ( // Loading skeleton only if no files yet
                            <div className="flex items-center justify-center h-full bg-background">
                                {/* Skeleton remains the same */}
                                <div className="space-y-4 p-4 w-full max-w-md"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-5/6" /><Skeleton className="h-24 w-full" /><Skeleton className="h-6 w-1/2" /></div>
                            </div>
                        )}
                        {!isLoading && !files && !error && (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center bg-background">
                                <p>Enter a description and click "Generate Website" to see the output.</p>
                            </div>
                        )}
                        {previewSrcDoc && !isLoading && ( // Show iframe only if not loading
                            <iframe
                                srcDoc={previewSrcDoc}
                                title="Website Preview"
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts allow-same-origin"
                            />
                        )}
                        {/* Show loading overlay on top of existing preview during run/update */}
                        {isLoading && files && (
                             <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                             </div>
                         )}
                        {error && !files && ( // Error shown only if generation failed initially
                             <div className="flex items-center justify-center h-full text-destructive p-4 text-center bg-background">
                                <p>An error occurred. Please check the input panel.</p>
                            </div>
                        )}
                     </TabsContent>

                    {/* Files Tab - Contains Explorer and Editor */}
                    <TabsContent value="files" className="mt-0 h-full w-full absolute inset-0 flex flex-col md:flex-row" hidden={activeOutputTab !== 'files'}>
                        <FileExplorer
                            files={files}
                            selectedFilePath={selectedFilePath}
                            onSelectFile={onSelectFile}
                            isLoading={isLoading && !files}
                            className="w-full md:w-1/4 md:max-w-[250px] border-b md:border-b-0 md:border-r shrink-0 h-1/3 md:h-full"
                        />
                         <div className="flex-grow relative min-h-0">
                            <EditableCodeDisplay
                                content={selectedFile?.content ?? null}
                                language={editorLanguage}
                                isLoading={isLoading && !selectedFile} // Loading if fetching or no file selected yet
                                onChange={handleEditorChange}
                                className="absolute inset-0"
                            />
                         </div>
                    </TabsContent>

                     {/* HTML/CSS/JS Tabs - Now just display content, editing happens via Files tab */}
                    <TabsContent value="html" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'html'}>
                       <EditableCodeDisplay
                           content={html}
                           language="html"
                           isLoading={isLoading && !files}
                           onChange={(newContent) => onFileContentChange('index.html', newContent)}
                           className="h-full"
                       />
                    </TabsContent>
                     <TabsContent value="css" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'css'}>
                       <EditableCodeDisplay
                           content={css}
                           language="css"
                           isLoading={isLoading && !files}
                           onChange={(newContent) => onFileContentChange('style.css', newContent)}
                           className="h-full"
                       />
                    </TabsContent>
                     <TabsContent value="js" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'js'}>
                       <EditableCodeDisplay
                           content={javascript}
                           language="javascript"
                           isLoading={isLoading && !files}
                           onChange={(newContent) => onFileContentChange('script.js', newContent)}
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
  // Store files instead of separate html, css, js
  const [files, setFiles] = useState<FileNode[] | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<string>('chat');
  const [activeOutputTab, setActiveOutputTab] = useState<string>('preview'); // Default to preview
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Create srcDoc from current files state
  const updatePreview = useCallback((currentFiles: FileNode[] | null) => {
    if (!currentFiles) {
        setPreviewSrcDoc('');
        return;
    }

    const { html, css, javascript } = extractCodeFromFiles(currentFiles);

    const srcDoc = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
              body { margin: 0; font-family: sans-serif; background-color: white !important; }
              html { scroll-behavior: smooth; }
              ${css}
            </style>
          </head>
          <body>
            ${html}
            <script>${javascript}</script>
          </body>
        </html>
      `;
      setPreviewSrcDoc(srcDoc);

      // Determine if we should switch tabs after update/generation
      const shouldSwitchToOutput = isMobile && activeMobileTab === 'chat' && (html || css || javascript);
      const shouldSwitchToPreview = html || css || javascript; // Switch to preview if there's content

      if (shouldSwitchToOutput) {
          setActiveMobileTab('output');
          setActiveOutputTab('preview'); // Always default output to preview after generation/update
      } else if (!isMobile && shouldSwitchToPreview) {
           setActiveOutputTab('preview');
      } else if (!shouldSwitchToPreview) {
          // If generation/update results in empty code, maybe switch to files tab?
          setActiveOutputTab('files');
      }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, activeMobileTab]); // Dependencies for tab switching logic


  // Handler for selecting a file in the explorer
  const handleSelectFile = useCallback((path: string) => {
      setSelectedFilePath(path);
      // Optionally switch to 'files' tab if another code tab was active
      if (['html', 'css', 'js'].includes(activeOutputTab)) {
          setActiveOutputTab('files');
      } else {
          // If preview or files tab was already active, stay there
          setActiveOutputTab(activeOutputTab);
      }
  }, [activeOutputTab]);

  // Handler for updating file content from the editor
  const handleFileContentChange = useCallback((path: string, newContent: string) => {
      setFiles(currentFiles => {
          if (!currentFiles) return null;
          return currentFiles.map(file =>
              file.path === path ? { ...file, content: newContent } : file
          );
      });
      // We don't update preview here automatically, wait for Run button
  }, []);

   // Handler for the "Run" button
    const handleRunCode = useCallback(() => {
        if (!files) {
            toast({ variant: 'destructive', title: 'Run Error', description: 'No code to run.' });
            return;
        }
        setIsLoading(true); // Show loading indicator on preview
        setError(null);
        // Simulate a short delay for visual feedback, then update preview
        setTimeout(() => {
            try {
                updatePreview(files); // Update preview with current state of files
                toast({ title: 'Preview Updated', description: 'Changes applied to the preview.' });
                 setActiveOutputTab('preview'); // Switch to preview after running
            } catch (err) {
                 console.error('Error updating preview:', err);
                 setError('Failed to update preview.');
                 toast({ variant: 'destructive', title: 'Preview Error', description: 'Could not update preview.' });
            } finally {
                setIsLoading(false);
            }
        }, 300); // Small delay
    }, [files, updatePreview, toast]);


  const handleGenerateWebsite = useCallback(async () => {
    if (!description.trim()) {
      setError('Please enter a description for the website.');
      return;
    }
    setIsLoading(true);
    setIsGenerating(true);
    setIsUpdating(false);
    setError(null);
    // Don't clear files, allow regeneration over existing
    // setPreviewSrcDoc(''); // Clear preview immediately

    try {
      const result: GenerateWebsiteOutput = await generateWebsite({ description });
       // Validate the result is an array of files
       if (Array.isArray(result)) {
           const newFiles: FileNode[] = result.map(file => ({
               path: file.path,
               content: file.content,
               type: 'file', // Assume all are files for now
           }));
           setFiles(newFiles);
           updatePreview(newFiles); // Update preview after setting files

           // Find index.html or the first HTML file to select
           const htmlFile = newFiles.find(f => f.path === 'index.html') || newFiles.find(f => f.path.endsWith('.html'));
           setSelectedFilePath(htmlFile ? htmlFile.path : (newFiles[0]?.path || null)); // Select HTML or first file

           toast({ title: 'Website Generated', description: 'Files created successfully!' });
       } else {
           throw new Error('AI response was not in the expected format (array of files).');
       }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate website. ${errorMessage}`);
      setFiles(null); // Clear files on error
      updatePreview(null);
      toast({ variant: 'destructive', title: 'Generation Failed', description: `Error: ${errorMessage}` });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [description, toast, updatePreview]);


    const handleUpdateWebsite = useCallback(async () => {
        if (!files) {
            setError('Generate a website first.');
            toast({ variant: 'destructive', title: 'Update Error', description: 'Generate a website first.' });
            return;
        }
        if (!userFeedback.trim()) {
            setError('Please provide feedback.');
             toast({ variant: 'destructive', title: 'Update Error', description: 'Enter your update request.' });
            return;
        }

        setIsLoading(true);
        setIsUpdating(true);
        setIsGenerating(false);
        setError(null);

        try {
            // Pass the current file structure to the update flow
            const result: SuggestWebsiteUpdatesOutput = await suggestWebsiteUpdates({
                currentFiles: files.map(f => ({ path: f.path, content: f.content })), // Map to the expected input type
                userFeedback,
            });

             // Validate the result is an array of files
            if (!Array.isArray(result)) {
                throw new Error('AI response was not in the expected format (array of files).');
            }

            // Map the result back to FileNode[]
             const updatedFilesResult: FileNode[] = result.map((file: UpdateFileSchema) => ({ // Use imported type
                path: file.path,
                content: file.content,
                type: 'file', // Assume all are files for now
             }));


            setFiles(updatedFilesResult);
            updatePreview(updatedFilesResult); // Update preview after setting files
            setUserFeedback(''); // Clear feedback input

            // Reselect the currently selected file if it still exists
            const currentSelected = selectedFilePath;
            if (currentSelected && !updatedFilesResult.some(f => f.path === currentSelected)) {
                // If the previously selected file is gone, select the first one
                 setSelectedFilePath(updatedFilesResult[0]?.path || null);
            }

            toast({ title: 'Website Updated', description: 'Changes applied based on feedback.' });

        } catch (err) {
            console.error('Error updating website:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to update website. ${errorMessage}`);
            // Don't clear files on update error, keep previous state
            toast({ variant: 'destructive', title: 'Update Failed', description: `Error: ${errorMessage}` });
        } finally {
            setIsLoading(false);
            setIsUpdating(false);
        }
    }, [files, userFeedback, toast, updatePreview, selectedFilePath]);


  const handleDownloadCode = useCallback(() => {
    if (!files || files.length === 0) {
      setError('No website code to download.');
      toast({ variant: 'destructive', title: 'Download Error', description: 'Generate a website first.' });
      return;
    }

    // Find the primary HTML file (index.html or first .html)
     const htmlFile = files.find(f => f.path === 'index.html') || files.find(f => f.path.endsWith('.html'));
    if (!htmlFile) {
        toast({ variant: 'destructive', title: 'Download Error', description: 'Could not find an HTML file to download.' });
        return;
    }

    // Find CSS and JS files (prefer standard names)
    const cssFile = files.find(f => f.path === 'style.css') || files.find(f => f.path.endsWith('.css'));
    const jsFile = files.find(f => f.path === 'script.js') || files.find(f => f.path.endsWith('.js'));

     const fullHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
    ${cssFile ? `<link rel="stylesheet" href="${cssFile.path}">` : (extractCodeFromFiles(files).css ? `<style>\n${extractCodeFromFiles(files).css}\n    </style>` : '')}
</head>
<body>
${htmlFile.content || '<!-- No HTML content -->'}
    ${jsFile ? `<script src="${jsFile.path}"></script>` : (extractCodeFromFiles(files).javascript ? `<script>\n${extractCodeFromFiles(files).javascript}\n    </script>` : '')}
</body>
</html>
    `;

     // For simplicity in this example, we download only the main HTML file with embedded or linked resources.
     // A more robust solution would involve zipping all files.
    const blob = new Blob([fullHtmlContent.trim()], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = htmlFile.path; // Use the original HTML filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ title: 'Code Downloaded', description: `Main file ${htmlFile.path} downloaded. Note: Linked CSS/JS files are not included in this single download.` });
  }, [files, toast]);


  // --- Main Render ---

  return (
    <div className={cn(
        "flex flex-col h-screen bg-muted/20 overflow-hidden",
        isMobile ? 'p-0' : 'p-4 gap-4'
        )}>
       <header className={cn(
           "flex justify-between items-center shrink-0 border-b",
           isMobile ? 'px-3 py-2' : 'px-0 pb-3'
        )}>
        <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
          <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> WebGenius
        </h1>
        <Button
          onClick={handleDownloadCode}
          disabled={!files || isLoading} // Simpler disabled logic
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </header>

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
                        hasGeneratedCode={!!files} // Pass boolean
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
                     <OutputPanelContent
                        files={files}
                        isLoading={isLoading}
                        previewSrcDoc={previewSrcDoc}
                        error={error}
                        isMobile={isMobile}
                        activeOutputTab={activeOutputTab}
                        setActiveOutputTab={setActiveOutputTab}
                        selectedFilePath={selectedFilePath}
                        onSelectFile={handleSelectFile}
                        onFileContentChange={handleFileContentChange}
                        onRunCode={handleRunCode}
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
                             disabled={!isLoading && !error && !files} // Disabled if nothing generated/loading/error
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
                    hasGeneratedCode={!!files} // Pass boolean
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
                 <OutputPanelContent
                    files={files}
                    isLoading={isLoading}
                    previewSrcDoc={previewSrcDoc}
                    error={error}
                    isMobile={isMobile}
                    activeOutputTab={activeOutputTab}
                    setActiveOutputTab={setActiveOutputTab}
                    selectedFilePath={selectedFilePath}
                    onSelectFile={handleSelectFile}
                    onFileContentChange={handleFileContentChange}
                    onRunCode={handleRunCode}
                 />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
      </div>
    </div>
  );
};

export default WebGeniusApp;
