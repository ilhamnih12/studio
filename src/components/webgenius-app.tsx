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
import { Terminal, Download, Bot, Send, Eye, Code, File as FileIcon, Folder, Play, FileCode, FileType, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateWebsite,
  type GenerateWebsiteOutput,
} from '@/ai/flows/generate-website-from-text';
import {
  suggestWebsiteUpdates,
  type SuggestWebsiteUpdatesOutput,
  type FileSchema as UpdateFileSchema,
} from '@/ai/flows/suggest-website-updates';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// --- Types ---
interface FileNode {
    path: string;
    content: string;
    type: 'file' | 'folder'; 
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

const buildSrcDoc = (htmlContent: string, cssContent: string, jsContent: string): string => {
    const navigationScript = `
        <script>
            document.addEventListener('click', function(event) {
                let target = event.target;
                while (target && target.tagName !== 'A') {
                    target = target.parentElement;
                }

                if (target && target.tagName === 'A' && target.href) {
                    const url = new URL(target.href);
                    if (url.origin === window.location.origin && url.pathname !== '/' && url.pathname.includes('.')) {
                         event.preventDefault(); 
                         const targetPath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
                         window.parent.postMessage({ type: 'navigatePreview', path: targetPath }, '*');
                    }
                }
            });
        </script>
    `;

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width-device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
                body { margin: 0; font-family: sans-serif; background-color: white !important; }
                html { scroll-behavior: smooth; }
                ${cssContent}
            </style>
        </head>
        <body>
            ${htmlContent}
            <script>${jsContent}</script>
            ${navigationScript}
        </body>
        </html>
    `;
};


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
                 "whitespace-pre overflow-auto", 
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
    hasGeneratedCode: boolean;
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
    hasGeneratedCode,
    isLoading,
    isGenerating,
    isUpdating,
    handleGenerateWebsite,
    handleUpdateWebsite,
    error,
    isMobile,
}) => {
    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
    };
    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserFeedback(e.target.value);
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
                        value={description}
                        onChange={handleDescriptionChange}
                        className="flex-grow min-h-[150px] resize-none text-sm"
                        disabled={isLoading}
                    />
                </div>
                {hasGeneratedCode && (
                    <div className="pt-4 border-t space-y-2">
                        <Label htmlFor="feedback">Request Updates (Optional)</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="feedback"
                                placeholder="e.g., Change the background to light blue"
                                value={userFeedback}
                                onChange={handleFeedbackChange}
                                disabled={isLoading}
                                className="flex-grow h-10 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && userFeedback.trim()) {
                                        e.preventDefault();
                                        handleUpdateWebsite();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleUpdateWebsite}
                                disabled={isLoading || !userFeedback.trim()}
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
                    disabled={isLoading || !description.trim()}
                    size={isMobile ? "lg" : "default"}
                >
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

// --- Output Panel Component ---
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
    onRunCode: () => void;
    previewPath: string;
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
    previewPath,
}) => {
    const selectedFile = useMemo(() => files?.find(f => f.path === selectedFilePath), [files, selectedFilePath]);
    const editorLanguage = selectedFile ? getLanguageFromPath(selectedFile.path) : 'plaintext';

    const { html: indexHtml, css: styleCss, javascript: scriptJs } = useMemo(() => {
        if (!files) return { html: '', css: '', javascript: '' };
        const html = files.find(f => f.path === 'index.html')?.content || '';
        const css = files.find(f => f.path === 'style.css')?.content || '';
        const javascript = files.find(f => f.path === 'script.js')?.content || '';
        return { html, css, javascript };
    }, [files]);

    const editorContent = useMemo(() => {
        if (activeOutputTab === 'html') return indexHtml;
        if (activeOutputTab === 'css') return styleCss;
        if (activeOutputTab === 'js') return scriptJs;
        if (activeOutputTab === 'files' && selectedFile) return selectedFile.content;
        return null;
    }, [activeOutputTab, selectedFile, indexHtml, styleCss, scriptJs]);

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
                     "relative"
                 )}>
                    {!isMobile && (
                        <div>
                            <CardTitle className="text-lg md:text-xl">Output</CardTitle>
                            <CardDescription>
                                Preview ({previewPath || 'N/A'}), explore files, or edit code. Click 'Run' to apply edits.
                            </CardDescription>
                        </div>
                     )}
                     <div className={cn(
                         "flex items-center gap-1",
                          isMobile ? 'w-full justify-between' : 'ml-auto'
                      )}>
                         <TabsList className={cn(
                             "grid grid-cols-5 gap-1 h-9",
                             isMobile ? 'flex-grow' : ''
                         )}>
                             <TabsTrigger value="preview" className="text-xs px-2 h-full" disabled={!previewSrcDoc && !isLoading && !error}>
                                 <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                             </TabsTrigger>
                             <TabsTrigger value="files" className="text-xs px-2 h-full" disabled={!files && !isLoading}>
                                 <Folder className="w-3.5 h-3.5 mr-1" /> Files
                             </TabsTrigger>
                              <TabsTrigger value="html" className="text-xs px-2 h-full" disabled={!indexHtml && !isLoading}>
                                 <FileCode className="w-3.5 h-3.5 mr-1" /> HTML
                             </TabsTrigger>
                             <TabsTrigger value="css" className="text-xs px-2 h-full" disabled={!styleCss && !isLoading}>
                                 <FileType className="w-3.5 h-3.5 mr-1" /> CSS
                             </TabsTrigger>
                             <TabsTrigger value="js" className="text-xs px-2 h-full" disabled={!scriptJs && !isLoading}>
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
                     <TabsContent value="preview" className="mt-0 h-full w-full absolute inset-0" hidden={activeOutputTab !== 'preview'}>
                        {isLoading && !files && (
                            <div className="flex items-center justify-center h-full bg-background">
                                <div className="space-y-4 p-4 w-full max-w-md"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-5/6" /><Skeleton className="h-24 w-full" /><Skeleton className="h-6 w-1/2" /></div>
                            </div>
                        )}
                        {!isLoading && !files && !error && (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center bg-background">
                                <p>Enter a description and click "Generate Website" to see the output.</p>
                            </div>
                        )}
                        {previewSrcDoc && !isLoading && (
                            <iframe
                                srcDoc={previewSrcDoc}
                                title="Website Preview"
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            />
                        )}
                        {isLoading && files && (
                             <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                             </div>
                         )}
                        {error && !files && (
                             <div className="flex items-center justify-center h-full text-destructive p-4 text-center bg-background">
                                <p>An error occurred. Please check the input panel.</p>
                            </div>
                        )}
                     </TabsContent>

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
                                isLoading={isLoading && !selectedFile}
                                onChange={handleEditorChange}
                                className="absolute inset-0"
                            />
                         </div>
                    </TabsContent>

                    <TabsContent value="html" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'html'}>
                       <EditableCodeDisplay
                           content={indexHtml}
                           language="html"
                           isLoading={isLoading && !files}
                           onChange={(newContent) => onFileContentChange('index.html', newContent)}
                           className="h-full"
                       />
                    </TabsContent>
                     <TabsContent value="css" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'css'}>
                       <EditableCodeDisplay
                           content={styleCss}
                           language="css"
                           isLoading={isLoading && !files}
                           onChange={(newContent) => onFileContentChange('style.css', newContent)}
                           className="h-full"
                       />
                    </TabsContent>
                     <TabsContent value="js" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'js'}>
                       <EditableCodeDisplay
                           content={scriptJs}
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
  const [files, setFiles] = useState<FileNode[] | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string>('index.html');
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<string>('chat');
  const [activeOutputTab, setActiveOutputTab] = useState<string>('preview');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const updatePreview = useCallback((currentFiles: FileNode[] | null, targetPath: string = 'index.html') => {
      if (!currentFiles) {
          setPreviewSrcDoc('');
          setPreviewPath('');
          return;
      }

      const targetHtmlFile = currentFiles.find(f => f.path === targetPath && f.path.endsWith('.html'));

      if (!targetHtmlFile) {
          const fallbackHtml = currentFiles.find(f => f.path.endsWith('.html'));
          if (fallbackHtml) {
              targetPath = fallbackHtml.path;
              // Recursive call with the fallback path, ensure it's not an infinite loop
              // This check prevents recursion if fallback is same as initial targetPath and not found
              if (targetPath !== (arguments[1] || 'index.html')) {
                updatePreview(currentFiles, targetPath);
              } else {
                setPreviewSrcDoc('<html><body>No suitable HTML file found to preview.</body></html>');
                setPreviewPath('');
                toast({ variant: 'destructive', title: 'Preview Error', description: `Target HTML file "${targetPath}" not found and no alternative found.` });
              }
          } else {
              setPreviewSrcDoc('<html><body>No HTML file found to preview.</body></html>');
              setPreviewPath('');
              toast({ variant: 'destructive', title: 'Preview Error', description: 'No HTML file found in the generated files.' });
          }
          return;
      }

      const cssFile = currentFiles.find(f => f.path === 'style.css');
      const jsFile = currentFiles.find(f => f.path === 'script.js');

      const cssContent = cssFile?.content || '';
      const jsContent = jsFile?.content || '';

      const srcDoc = buildSrcDoc(targetHtmlFile.content, cssContent, jsContent);
      setPreviewSrcDoc(srcDoc);
      setPreviewPath(targetPath);

      if (isMobile === true && activeMobileTab === 'chat' && !!targetHtmlFile.content) {
          setActiveMobileTab('output');
          setActiveOutputTab('preview');
      } else if (isMobile === false && !!targetHtmlFile.content) {
           setActiveOutputTab('preview');
      } else if (!targetHtmlFile.content) {
          setActiveOutputTab('files');
      }
  }, [isMobile, activeMobileTab, toast]); 

  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          if (event.source !== window && event.data && event.data.type === 'navigatePreview') {
              const targetPath = event.data.path;
              if (files && targetPath) {
                  const targetExists = files.some(f => f.path === targetPath && f.path.endsWith('.html'));
                  if (targetExists) {
                      updatePreview(files, targetPath);
                  } else {
                      toast({ variant: 'destructive', title: 'Navigation Error', description: `File "${targetPath}" not found.` });
                  }
              }
          }
      };

      window.addEventListener('message', handleMessage);
      return () => {
          window.removeEventListener('message', handleMessage);
      };
  }, [files, updatePreview, toast]);


  const handleSelectFile = useCallback((path: string) => {
      setSelectedFilePath(path);
      if (['html', 'css', 'js'].includes(activeOutputTab)) {
          setActiveOutputTab('files');
      } else {
          setActiveOutputTab(activeOutputTab);
      }
  }, [activeOutputTab]);

  const handleFileContentChange = useCallback((path: string, newContent: string) => {
      setFiles(currentFiles => {
          if (!currentFiles) return null;
          return currentFiles.map(file =>
              file.path === path ? { ...file, content: newContent } : file
          );
      });
  }, []);

    const handleRunCode = useCallback(() => {
        if (!files) {
            toast({ variant: 'destructive', title: 'Run Error', description: 'No code to run.' });
            return;
        }
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                updatePreview(files, previewPath);
                toast({ title: 'Preview Updated', description: 'Changes applied to the preview.' });
                 setActiveOutputTab('preview');
            } catch (err) {
                 console.error('Error updating preview:', err);
                 setError('Failed to update preview.');
                 toast({ variant: 'destructive', title: 'Preview Error', description: 'Could not update preview.' });
            } finally {
                setIsLoading(false);
            }
        }, 300);
    }, [files, updatePreview, previewPath, toast]);


  const handleGenerateWebsite = useCallback(async () => {
    if (!description.trim()) {
      setError('Please enter a description for the website.');
      return;
    }
    setIsLoading(true);
    setIsGenerating(true);
    setIsUpdating(false);
    setError(null);
    
    try {
      const result: GenerateWebsiteOutput = await generateWebsite({ description });
       if (Array.isArray(result)) {
           const newFiles: FileNode[] = result.map(file => ({
               path: file.path,
               content: file.content,
               type: 'file',
           }));
           setFiles(newFiles);
           const initialHtmlPath = newFiles.find(f => f.path === 'index.html')?.path || newFiles.find(f => f.path.endsWith('.html'))?.path || 'index.html';
           updatePreview(newFiles, initialHtmlPath);
           setSelectedFilePath(initialHtmlPath || (newFiles[0]?.path || null));
           toast({ title: 'Website Generated', description: 'Files created successfully!' });
       } else {
           throw new Error('AI response was not in the expected format (array of files).');
       }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate website. ${errorMessage}`);
      setFiles(null);
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
            const result: SuggestWebsiteUpdatesOutput = await suggestWebsiteUpdates({
                currentFiles: files.map(f => ({ path: f.path, content: f.content })),
                userFeedback,
            });

            if (!Array.isArray(result)) {
                throw new Error('AI response was not in the expected format (array of files).');
            }

             const updatedFilesResult: FileNode[] = result.map((file: UpdateFileSchema) => ({
                path: file.path,
                content: file.content,
                type: 'file',
             }));

            setFiles(updatedFilesResult);
            const initialHtmlPath = updatedFilesResult.find(f => f.path === 'index.html')?.path || updatedFilesResult.find(f => f.path.endsWith('.html'))?.path || 'index.html';
            updatePreview(updatedFilesResult, initialHtmlPath);
            setUserFeedback('');

            const currentSelected = selectedFilePath;
            if (currentSelected && !updatedFilesResult.some(f => f.path === currentSelected)) {
                 setSelectedFilePath(updatedFilesResult[0]?.path || null);
            } else if (!currentSelected && updatedFilesResult.length > 0) {
                 setSelectedFilePath(updatedFilesResult[0]?.path || null);
            }
            toast({ title: 'Website Updated', description: 'Changes applied based on feedback.' });
        } catch (err) {
            console.error('Error updating website:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to update website. ${errorMessage}`);
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

     const htmlFile = files.find(f => f.path === 'index.html') || files.find(f => f.path.endsWith('.html'));
    if (!htmlFile) {
        toast({ variant: 'destructive', title: 'Download Error', description: 'Could not find an HTML file to download.' });
        return;
    }

     const getRelativePath = (targetPath: string, basePath: string): string => {
        const targetParts = targetPath.split('/');
        const baseParts = basePath.split('/');
        baseParts.pop(); 

        let commonPrefix = 0;
        while (commonPrefix < targetParts.length && commonPrefix < baseParts.length && targetParts[commonPrefix] === baseParts[commonPrefix]) {
            commonPrefix++;
        }
        const levelsUp = baseParts.length - commonPrefix;
        const remainingPath = targetParts.slice(commonPrefix).join('/');
        return (levelsUp > 0 ? '../'.repeat(levelsUp) : './') + remainingPath;
     }

     const buildFinalHtml = (htmlNode: FileNode, allFiles: FileNode[]): string => {
        let content = htmlNode.content;

        const cssFileToLink = allFiles.find(f => f.path.endsWith('.css'));
        if (cssFileToLink && !content.includes(`<link rel="stylesheet" href="${getRelativePath(cssFileToLink.path, htmlNode.path)}">`)) {
            const cssPathRelative = getRelativePath(cssFileToLink.path, htmlNode.path);
            const linkTag = `<link rel="stylesheet" href="${cssPathRelative}">`;
            if (content.includes('</head>')) {
                content = content.replace('</head>', `    ${linkTag}\n</head>`);
            } else {
                content = `<head>\n    ${linkTag}\n</head>\n${content}`;
            }
        }

        const jsFileToLink = allFiles.find(f => f.path.endsWith('.js'));
         if (jsFileToLink && !content.includes(`<script src="${getRelativePath(jsFileToLink.path, htmlNode.path)}"`)) {
            const jsPathRelative = getRelativePath(jsFileToLink.path, htmlNode.path);
            const scriptTag = `<script src="${jsPathRelative}" defer></script>`;
            if (content.includes('</body>')) {
                 content = content.replace('</body>', `    ${scriptTag}\n</body>`);
             } else {
                 content = `${content}\n${scriptTag}`;
             }
         }
        if (!content.trim().toLowerCase().startsWith('<!doctype html>')) {
            content = `<!DOCTYPE html>\n<html lang="en">\n${content}\n</html>`;
        }
        return content;
     };

     import('jszip').then(async JSZip => {
         const zip = new JSZip.default();

         files.forEach(file => {
            let fileContent = file.content;
             if (file.path === htmlFile.path) {
                fileContent = buildFinalHtml(file, files);
             }
             zip.file(file.path, fileContent);
         });

         const zipBlob = await zip.generateAsync({ type: 'blob' });
         const link = document.createElement('a');
         link.href = URL.createObjectURL(zipBlob);
         link.download = 'website.zip';
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(link.href);
         toast({ title: 'Website Downloaded', description: 'All files downloaded as website.zip.' });

     }).catch(err => {
         console.error("Failed to create zip file:", err);
         toast({ variant: 'destructive', title: 'Download Error', description: 'Failed to create zip file. Check console.' });
         const fallbackContent = buildFinalHtml(htmlFile, files);
         const fallbackBlob = new Blob([fallbackContent], { type: 'text/html;charset=utf-8' });
         const fallbackLink = document.createElement('a');
         fallbackLink.href = URL.createObjectURL(fallbackBlob);
         fallbackLink.download = htmlFile.path;
         document.body.appendChild(fallbackLink);
         fallbackLink.click();
         document.body.removeChild(fallbackLink);
         URL.revokeObjectURL(fallbackLink.href);
         toast({ variant: 'default', title: 'Downloaded HTML Only', description: 'Could not zip files, downloaded main HTML.' });
     });
  }, [files, toast]);


  // --- Main Render ---
  // Wait for isMobile to be determined before rendering the layout
  if (typeof isMobile === 'undefined') {
    return (
        <div className="flex flex-col h-screen bg-muted/20 overflow-hidden items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

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
          disabled={!files || isLoading}
          variant="outline"
          size={isMobile ? "sm" : "default"}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download
        </Button>
      </header>

      <div className="flex-grow flex flex-col min-h-0">
          {isMobile ? (
             <Tabs value={activeMobileTab} onValueChange={setActiveMobileTab} className="flex flex-col flex-grow overflow-hidden border-none bg-transparent">
                 <TabsContent value="chat" className="flex-grow mt-0 overflow-auto" hidden={activeMobileTab !== 'chat'}>
                     <InputPanelContent
                        description={description}
                        setDescription={setDescription}
                        userFeedback={userFeedback}
                        setUserFeedback={setUserFeedback}
                        hasGeneratedCode={!!files}
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
                        previewPath={previewPath}
                     />
                 </TabsContent>

                 <div className="shrink-0 border-t bg-background shadow-inner px-2 pt-1.5 pb-2">
                     <TabsList className="grid w-full grid-cols-2 h-11">
                         <TabsTrigger value="chat" className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                             <Code className="w-4 h-4 mr-1.5"/>
                             Input
                         </TabsTrigger>
                         <TabsTrigger
                             value="output"
                             className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                             disabled={!isLoading && !error && !files}
                         >
                             <Eye className="w-4 h-4 mr-1.5" />
                             Output
                         </TabsTrigger>
                     </TabsList>
                </div>
             </Tabs>

          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-grow rounded-lg border shadow-md bg-background overflow-hidden min-h-0">
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="min-h-0">
                 <InputPanelContent
                    description={description}
                    setDescription={setDescription}
                    userFeedback={userFeedback}
                    setUserFeedback={setUserFeedback}
                    hasGeneratedCode={!!files}
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
                    previewPath={previewPath}
                 />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
      </div>
    </div>
  );
};

export default WebGeniusApp;