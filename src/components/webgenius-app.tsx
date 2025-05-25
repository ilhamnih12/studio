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
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useSettings } from "@/stores/settings";
import { SettingsDialog } from "@/components/settings-dialog";
import { useLanguage } from '@/hooks/use-language';
import { Settings, Moon, Sun, Globe } from 'lucide-react';
import { translations } from '@/lib/translations';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
            <style>
                /* Ensure CSS loads even if external file fails */
                ${cssContent}
            </style>
        </head>
        <body>
            ${htmlContent}
            <script>
                // Catch script loading errors
                window.onerror = function(msg, url, line) {
                    console.log('Preview script error:', msg, 'at line:', line);
                    return false;
                };
                // Wrap execution in DOMContentLoaded and error handling
                document.addEventListener('DOMContentLoaded', function() {
                    try {
                        ${jsContent}
                    } catch (error) {
                        console.error("Preview script execution error:", error);
                    }
                });
            </script>
        </body>
        </html>
    `;
}; // Fix: Added missing semicolon


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
            <div className={cn("p-2 space-y-2", className ?? '')}>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
            </div>
        );
    }

    if (!files || files.length === 0) {
        return (
            <div className={cn("p-2 text-sm text-muted-foreground", className ?? '')}>
                Belum ada file yang dibuat.
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
                        className={cn( // Adjusted type: string | null | undefined
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
 content: string | null | undefined;
 language: string;
 isLoading: boolean;
    onChange: (newContent: string) => void;
    className?: string;
}

const EditableCodeDisplay: FC<EditableCodeDisplayProps> = ({ content, language, isLoading, onChange, className }) => {
 // Renamed the language prop
    if (isLoading) {
 // Use isLoading from props
        return (
            <div className={cn("p-4 space-y-2 h-full", className ?? '')}>
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
            <div className={cn("flex items-center justify-center h-full text-sm text-muted-foreground p-4", className || '')}>
                Pilih file buat lihat atau edit isinya.
            </div>
        );
    }

    return (
        <Textarea 
            value={content || ''}
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
                <CardTitle className="text-lg md:text-xl">Jelaskan Website-mu</CardTitle>
                <CardDescription>
                    Masukkan deskripsi atau minta update buat website yang sudah dibuat.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col space-y-4 pt-0 pb-2 md:pb-6">
                <div className="flex-grow flex flex-col">
                    <Label htmlFor="description" className="mb-2">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Contoh: Landing page buat kedai kopi..."
                        value={description}
                        onChange={handleDescriptionChange}
                        className="flex-grow min-h-[150px] resize-none text-sm"
                        disabled={isLoading}
                    />
                </div>
                {hasGeneratedCode && (
                    <div className="pt-4 border-t space-y-2">
                        <Label htmlFor="feedback">Minta Update (Opsional)</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="feedback"
                                placeholder="Contoh: Ganti background jadi biru muda"
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
                                aria-label="Kirim Feedback"
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
                        hasGeneratedCode ? 'Buat / Buat Lagi' : 'Buat Website'
                    )}
                </Button>
                 {hasGeneratedCode && !isLoading && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                        Ubah deskripsi dan klik lagi buat buat ulang seluruh website.
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
 previewSrcDoc: string | null;
 isMobile: boolean;
 activeOutputTab: string;
    setActiveOutputTab: (value: string) => void;
 selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
    onFileContentChange: (path: string, newContent: string) => void;
    onRunCode: () => void;
 previewPath: string | null; // Add previewPath here
    error: string | null; // Add error here
}

const OutputPanelContent: FC<OutputPanelProps> = ({
    files,
    isLoading, // Keep isLoading prop name for internal use
    isMobile,
    activeOutputTab,
    setActiveOutputTab,
    selectedFilePath,
    onSelectFile,
    onFileContentChange,
    onRunCode,
 previewPath,
    previewSrcDoc, error: outputError, // Renamed the prop to outputError
}) => {
    const selectedFile = useMemo(() => files?.find(f => f.path === selectedFilePath), [files, selectedFilePath]);
    const editorLanguage = selectedFile ? getLanguageFromPath(selectedFile.path) : 'plaintext';
 
    const { html: indexHtml, css: styleCss, javascript: scriptJs } = useMemo(() => { // This logic might need adjustment if not all projects have index.html, style.css, script.js
 if (!files) return { html: '', css: '', javascript: '' };
        const html = files.find(f => f.path === previewPath)?.content || ''; // Get content of current preview file
        const css = files.find(f => f.path === 'style.css')?.content || '';
        const javascript = files.find(f => f.path === 'script.js')?.content || '';
        return { html, css, javascript };
 }, [files, previewPath]);

 const editorContent = useMemo(() => {
        if (activeOutputTab === 'html') return indexHtml;
        if (activeOutputTab === 'css') return styleCss;
        if (activeOutputTab === 'js') return scriptJs;
        if (activeOutputTab === 'files' && selectedFile) return selectedFile.content;
        return null;
    }, [activeOutputTab, selectedFile, indexHtml, styleCss, scriptJs]);

    const handleEditorChange = useCallback((newContent: string) => {
 if (activeOutputTab === 'html' && previewPath) { // Update current preview file content
            onFileContentChange(previewPath, newContent);
 }
        else if (activeOutputTab === 'css') onFileContentChange('style.css', newContent);
        else if (activeOutputTab === 'js') onFileContentChange('script.js', newContent); // Assumes a single script.js for now
        else if (activeOutputTab === 'files' && selectedFilePath) {
            onFileContentChange(selectedFilePath, newContent);
        }
 }, [activeOutputTab, selectedFilePath, onFileContentChange, previewPath]); // Added previewPath


    return (
        <div className={cn(
            "flex flex-col h-full",
            isMobile ? 'p-0' : 'p-4',
            outputError ? 'relative' : ''
        )}>
            <Tabs value={activeOutputTab} onValueChange={setActiveOutputTab} className="flex-grow flex flex-col h-full overflow-hidden border-none bg-transparent md:border md:bg-card md:border-border md:rounded-lg md:shadow-sm">
                <CardHeader className={cn(
                    "flex flex-row items-center justify-between pb-2 pt-2 md:pt-4 relative", isMobile && 'border-b', "relative"
                ) as string | undefined}>
                    {!isMobile && files && !isLoading && !outputError && (
                        <div>
                            <CardTitle className="text-lg md:text-xl">Output</CardTitle>
                                                        <CardDescription>
                                Preview ({previewPath || 'N/A'}), lihat file, atau edit kode. Klik 'Jalankan' buat terapkan perubahan.
                                                        </CardDescription>
                        </div>
                    )}
                    <div className={cn(
                        "flex items-center gap-1",
                        isMobile ? 'w-full justify-between' : 'ml-auto'
                    )}>
                        <TabsList
                            className={cn(
                                "grid grid-cols-5 gap-1 h-9",
                                isMobile ? 'flex-grow' : ''
                            )}
                        >
                            <TabsTrigger value="preview" className="text-xs px-2 h-full" disabled={!files && !isLoading && !outputError}>
                                <Eye className="w-3.5 h-3.5 mr-1" /> Preview {previewPath && `(${previewPath})`}
                            </TabsTrigger>
                            <TabsTrigger value="files" className="text-xs px-2 h-full" disabled={(!files || files.length === 0) && !isLoading}>
                                <Folder className="w-3.5 h-3.5 mr-1" /> Files
                            </TabsTrigger>
                            <TabsTrigger value="html" className="text-xs px-2 h-full" disabled={(!files || !indexHtml) && !isLoading}>
                                <FileCode className="w-3.5 h-3.5 mr-1" /> HTML
                            </TabsTrigger>
                            <TabsTrigger value="css" className="text-xs px-2 h-full" disabled={(!files || !styleCss) && !isLoading}>
                                <FileType className="w-3.5 h-3.5 mr-1" /> CSS
                            </TabsTrigger>
                            <TabsTrigger value="js" className="text-xs px-2 h-full" disabled={(!files || !scriptJs) && !isLoading}>
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
                                                        <Play className="w-5 h-5" /> Jalankan
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-grow p-0 overflow-auto relative">
                    <TabsContent value="preview" className="mt-0 h-full w-full absolute inset-0" hidden={activeOutputTab !== 'preview'}>
    {/* Add info text at the top of preview */}
    <div className="absolute top-0 left-0 right-0 bg-yellow-50/90 text-yellow-800 px-3 py-1.5 text-xs border-b border-yellow-200 z-10">
        ℹ️ Preview hanya untuk melihat tampilan. Untuk mencoba interaksi seperti klik tombol, unduh filenya dan buka di browser.
    </div>
    
    {(isLoading && !files && !previewSrcDoc && !outputError) && (
                            <div className="flex items-center justify-center h-full bg-background">
                                <div className="space-y-4 p-4 w-full max-w-md"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-5/6" /><Skeleton className="h-24 w-full" /><Skeleton className="h-6 w-1/2" /></div>
                            </div>
                        )}
                        {(!isLoading && !files && !outputError) && (
                            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center bg-background">
                                <p>Masukkan deskripsi dan klik "Buat Website" buat lihat hasilnya.</p>
                            </div>
                        )}
                        {previewSrcDoc && !isLoading && (
                            <iframe
                                srcDoc={previewSrcDoc}
                                title="Website Preview"
                                className="w-full h-full border-0 bg-white"
                                sandbox="allow-scripts"  // Remove allow-same-origin for better security
                                onError={(e) => console.error('Preview iframe error:', e)}
                                onLoad={() => console.debug("Preview iframe loaded successfully")}
                            />
                        )}
 {
 // If not loading, no files, but there is a previewSrcDoc (shouldn't happen with current logic)
 // Or if there's an outputError
 (!isLoading && !files && previewSrcDoc && activeOutputTab === 'preview' && !outputError) && (
                            <div className="flex items-center justify-center h-full bg-white p-4">
                                <Alert className="w-full max-w-sm text-center" variant="default">
                                    <AlertTitle>Preview Gak Tersedia</AlertTitle>
                                    <AlertDescription>Preview lagi ditutup, silakan klik download dan jalanin lokal ya.</AlertDescription>
                                </Alert>
                            </div>
                        )}
                        {isLoading && files && activeOutputTab === 'preview' && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}
                        {(outputError && !files) && (
                            <div className="flex items-center justify-center h-full text-destructive p-4 text-center bg-background" hidden={activeOutputTab !== 'preview' || !outputError}>
                                <p>Ada error. Cek panel input ya.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="files" className="mt-0 h-full w-full absolute inset-0 flex flex-col md:flex-row" hidden={activeOutputTab !== 'files'}>
                        <FileExplorer
                            files={files}
                            selectedFilePath={selectedFilePath} // Accepts string | null
                            onSelectFile={onSelectFile}
                            isLoading={isLoading} // Pass isLoading
                            className="w-full md:w-1/4 md:max-w-[250px] border-b md:border-b-0 md:border-r shrink-0 h-1/3 md:h-full"
                        />
                        <div className="flex-grow relative min-h-0">
                            <EditableCodeDisplay
                                content={selectedFile?.content as string | null} // Accepts string | null | undefined
                                language={editorLanguage} // Accepts string
                                isLoading={isLoading && !selectedFile}
                                onChange={(newContent) => selectedFilePath && onFileContentChange(selectedFilePath, newContent)} // Check selectedFilePath is not null
                                className="absolute inset-0"
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="html" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'html'}>
                        <EditableCodeDisplay
                            content={indexHtml}
                            language="html" // Accepts string
                            isLoading={isLoading}
                            onChange={(newContent) => previewPath && onFileContentChange(previewPath, newContent)} // Check previewPath is not null
                            className="h-full"
                        />
                    </TabsContent>
                    <TabsContent value="css" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'css'}>
                        <EditableCodeDisplay
                            content={styleCss}
                            language="css" // Accepts string
                            isLoading={isLoading}
                            onChange={(newContent) => onFileContentChange('style.css', newContent)}
                            className="h-full"
                        />
                    </TabsContent>
                    <TabsContent value="js" className="mt-0 h-full w-full absolute inset-0 p-1" hidden={activeOutputTab !== 'js'}>
                        <EditableCodeDisplay
                            content={scriptJs}
                            language="javascript" // Accepts string
                            isLoading={isLoading}
                            onChange={(newContent) => onFileContentChange('script.js', newContent)}
                            className="h-full"
                        />
                    </TabsContent>
                </CardContent>
            </Tabs>
            {outputError && (
                <Alert variant="destructive" className="absolute bottom-4 right-4 w-auto z-20">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Error Output</AlertTitle>
                    <AlertDescription>{outputError}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};


const WebGeniusApp: FC = () => {
  const [description, setDescription] = useState<string>('');
  const [files, setFiles] = useState<FileNode[] | null>(null);
  const [userFeedback, setUserFeedback] = useState<string>(''); 
  const [activeOutputTab, setActiveOutputTab] = useState<string>('preview');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string | null>(null);
 const [previewPath, setPreviewPath] = useState<string>('index.html');
 const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'output'>('chat');
  const [isLoading, setIsLoading] = useState<boolean>(false); // Declare isLoading state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
 const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
 const { theme, setTheme, language, toggleLanguage } = useSettings();
 const t = translations[language];  // Get translations for current language

  const updatePreview = useCallback((currentFiles: FileNode[] | null, targetPath: string = 'index.html', outputError: string | null = null) => {
 console.log("Calling updatePreview", currentFiles, targetPath);
 if (!currentFiles || outputError) {
          setPreviewSrcDoc('');
          setPreviewPath('');
          return;
      }

      const targetHtmlFile = currentFiles.find(f => f.path === targetPath && f.path.endsWith('.html')); // Find the requested HTML file

      if (!targetHtmlFile) {
          const fallbackHtml = currentFiles.find(f => f.path.endsWith('.html'));
 if (fallbackHtml) {
              targetPath = fallbackHtml.path; // Fallback to any HTML if the original target is not found 
              if (targetPath !== (previewPath || 'index.html')) { // Fix: Compare with the original targetPath
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

      const cssFile = currentFiles.find(f => f.path === 'style.css'); // Assumes a single style.css
      const jsFile = currentFiles.find(f => f.path === 'script.js'); // Assumes a single script.js

      const cssContent = cssFile?.content || '';
      const jsContent = jsFile?.content || '';

 // console.log('Building srcDoc with:', { htmlContent: targetHtmlFile?.content, cssContent, jsContent }); // Keep this for internal buildSrcDoc logging
      const srcDoc = buildSrcDoc(targetHtmlFile.content, cssContent, jsContent);
      setPreviewSrcDoc(srcDoc);
      setPreviewPath(targetPath);

      if (isMobile === true && activeMobileTab === 'chat' && !!targetHtmlFile.content) {
 setActiveMobileTab('output');
 setActiveOutputTab('preview');
 console.log('Generated srcDoc:', srcDoc);
      } else if (isMobile === false && !!targetHtmlFile.content) { // Use targetHtmlFile.content
          setActiveOutputTab('preview'); // Correctly set state here
      } else if (!targetHtmlFile.content) {
          setActiveOutputTab('files');
        }
  }, [isMobile, activeMobileTab, toast, setActiveOutputTab]); // Added dependencies

  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          if (event.source !== window && event.data && event.data.type === 'navigatePreview') {
              const targetPath = event.data.path;
              if (files && targetPath) {
                  const targetFile = files.find(f => f.path === targetPath);
                  if (targetFile) {
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
  }, [files, toast]); // Depend on files so that updatePreview uses the latest state and include toast

 // Correctly pass down the state setters to the child components
 const handleSelectFile = useCallback((path: string) => {
      setSelectedFilePath(path);
      if (['html', 'css', 'js'].includes(activeOutputTab)) {
          setActiveOutputTab('files');
      } else {
          setActiveOutputTab(activeOutputTab);
      }
  }, [activeOutputTab, setActiveOutputTab]);
 
  const handleFileContentChange = useCallback((path: string, newContent: string) => {
      setFiles(currentFiles => {
          if (!currentFiles) return null;
          return currentFiles.map(file =>
              file.path === path ? { ...file, content: newContent } : file // Update the file content
          );
      });
 }, [setFiles]); // Added setFiles as dependency

    const handleRunCode = useCallback(() => {
        if (!files) {
            toast({ variant: 'destructive', title: 'Run Error', description: 'No code to run.' });
 return;
        }
        setError(null);

 if (files && previewPath) { // Ensure files and previewPath are not null before updating preview
 updatePreview(files, previewPath, null); // Pass null for outputError
 toast({ title: 'Preview Updated', description: 'Changes applied to the preview.' });
 setActiveOutputTab('preview');
 } else {
 console.error('Error updating preview: files or previewPath is null');
 setError('Failed to update preview.');
 toast({ variant: 'destructive', title: 'Preview Error', description: 'Could not update preview.' });
 // setIsLoading(false); // Removed as it's handled in the main finally block
 // setIsUpdating(false); // Removed as it's handled in the main finally block
 setIsGenerating(false); // Ensure isGenerating is reset too
 }
 }, [files, updatePreview, previewPath, toast, setActiveOutputTab, setIsLoading, setIsGenerating]); // Corrected dependencies


  const handleGenerateWebsite = useCallback(async () => {
    if (!description.trim()) {
      setError('Masukkan deskripsi buat websitenya ya.');
      return;
    }
    setIsLoading(true);
    setIsUpdating(false);
    setError(null);
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate website');
      }
      
      const result = await response.json();
      if (Array.isArray(result)) {
 console.log('Generated files:', result);
        const newFiles: FileNode[] = result.map(file => ({
          path: file.path,
          content: file.content,
          type: 'file',
        }));
        setFiles(newFiles);
        const initialHtmlPath = newFiles.find(f => f.path === 'index.html')?.path 
          || newFiles.find(f => f.path.endsWith('.html'))?.path 
          || 'index.html';
        updatePreview(newFiles, initialHtmlPath);
        setSelectedFilePath(initialHtmlPath || (newFiles[0]?.path || null));
        toast({ title: 'Website Generated', description: 'Files created successfully!' });
      } else {
        throw new Error('AI response was not in the expected format (array of files).');
      }
    } catch (err) {
      console.error('Error generating website:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Gagal buat website. ${errorMessage}`);
      setFiles(null);
      updatePreview(null);
      toast({ 
        variant: 'destructive', 
        title: 'Generation Failed', 
        description: `Error: ${errorMessage}` 
      });
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [description, toast, updatePreview]);

const handleUpdateWebsite = useCallback(async () => {
    if (!files) {
      setError('Generate a website first.');
      toast({ variant: 'destructive', title: 'Error Update', description: 'Buat website dulu ya.' });
      return;
    }
    if (!userFeedback.trim()) {
      setError('Please provide feedback.');
      toast({ variant: 'destructive', title: 'Error Update', description: 'Masukkan permintaan updatemu.' });
 return;
    }
    setIsLoading(true);
    setIsUpdating(true);
    setError(null);
    try {
      const response = await fetch('/api/suggest-website-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFiles: files.map(f => ({ path: f.path, content: f.content })),
          userFeedback,
        }),
      });
      if (!response.ok) {
         throw new Error('Request failed');
      }
      const result = await response.json();
      if (!Array.isArray(result)) {
         throw new Error('AI response was not in the expected format (array of files).');
      }
      const updatedFilesResult: FileNode[] = result.map((file: any) => ({
         content: file.content,
         type: 'file',
         path: file.path,
      }));
      setFiles(updatedFilesResult);
      const initialHtmlPath = updatedFilesResult.find(f => f.path === 'index.html')?.path ||
                              updatedFilesResult.find(f => f.path.endsWith('.html'))?.path ||
                              'index.html';
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
      setError(`Gagal update website. ${errorMessage}`);
      toast({ variant: 'destructive', title: 'Update Failed', description: `Error: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
}, [files, userFeedback, toast, updatePreview, selectedFilePath]);

  const handleDownloadCode = useCallback(() => {
    if (!files || files.length === 0) {
      setError('No website code to download.');
      toast({ variant: 'destructive', title: 'Error Unduh', description: 'Buat website dulu ya.' });
      return;
    }

     const htmlFile = files.find(f => f.path === 'index.html') || files.find(f => f.path.endsWith('.html'));
    if (!htmlFile) {
        toast({ variant: 'destructive', title: 'Error Unduh', description: 'Gak bisa nemuin file HTML buat diunduh.' });
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
     }); // Corrected closing parenthesis for .catch
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
    <div className={cn(// Added comma
      "flex flex-col h-screen bg-muted/20 overflow-hidden",
      isMobile ? 'p-0' : 'p-4'
    )}>
       <header className={cn(
    "flex justify-between items-center shrink-0 border-b bg-gradient-to-r from-background to-primary/5",
    isMobile ? 'px-3 py-2' : 'px-4 py-3'
)}>
    <div className="flex items-center gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> 
            {t.header.title}
        </h1>
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 rounded-md border border-yellow-200 animate-pulse">
            {t.header.demo}
        </span>
    </div>
    <div className="flex items-center gap-2">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="bg-background hover:bg-accent">
                    <Settings className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={toggleLanguage}>
                  <Globe className="mr-2 h-4 w-4" />
                  {language === 'en' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>{language === 'en' ? 'Light Mode' : 'Mode Terang'}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>{language === 'en' ? 'Dark Mode' : 'Mode Gelap'}</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
        </DropdownMenu>
        <Button
            onClick={handleDownloadCode}
            disabled={!files || isLoading}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="bg-background hover:bg-accent"
        >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {t.header.download}
        </Button>
    </div>
</header>

      <div className="flex-grow flex flex-col min-h-0">
          {isMobile ? (
 <Tabs value={activeMobileTab} onValueChange={(value) => setActiveMobileTab(value as 'chat' | 'output')} className="flex flex-col flex-grow overflow-hidden border-none bg-transparent">
 {/* FIX: Add missing closing > and </TabsContent> for chat */}
 <TabsContent value="chat" className="flex-grow mt-0 overflow-auto" hidden={activeMobileTab !== 'chat'}>
   <InputPanelContent
      description={description}
      setDescription={setDescription}
      userFeedback={userFeedback}
      setUserFeedback={setUserFeedback}
      hasGeneratedCode={!!files}
      isLoading={isLoading} // Pass isLoading
      isGenerating={isGenerating}
      isUpdating={isUpdating}
      handleGenerateWebsite={handleGenerateWebsite}
      handleUpdateWebsite={handleUpdateWebsite}
      error={error}
      isMobile={Boolean(isMobile)}
   />
 </TabsContent>
 <TabsContent value="output" className="flex-grow mt-0 overflow-hidden p-0" hidden={activeMobileTab !== 'output'}>
   <OutputPanelContent
      files={files}
      isLoading={isLoading} // Pass isLoading
      previewSrcDoc={previewSrcDoc} // Pass previewSrcDoc as is (can be null)
      isMobile={isMobile}
      activeOutputTab={activeOutputTab} // Pass activeOutputTab
      setActiveOutputTab={setActiveOutputTab} // Pass setActiveOutputTab
      selectedFilePath={selectedFilePath} // Pass selectedFilePath
      onSelectFile={handleSelectFile}
      onFileContentChange={handleFileContentChange}
      onRunCode={handleRunCode}
      error={error} // Pass the missing prop
      previewPath={previewPath} // Ensure previewPath is passed
   />
 </TabsContent>
                 <div className="shrink-0 border-t bg-background shadow-inner px-2 pt-1.5 pb-2">
                     <TabsList className="grid w-full grid-cols-2 h-11">
                         <TabsTrigger value="chat" className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                             <Code className="w-4 h-4 mr-1.5"/> Input
                             Input
                         </TabsTrigger>
                         <TabsTrigger
                             value="output"
                             className="h-full text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                             disabled={Boolean(isLoading || error || !files)} // Ensure boolean
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
                    isLoading={isLoading} // Pass isLoading
                    isGenerating={isGenerating}
                    isUpdating={isUpdating}
                    handleGenerateWebsite={handleGenerateWebsite}
                    handleUpdateWebsite={handleUpdateWebsite}
                    error={error}
 isMobile={Boolean(isMobile)}
                 />
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-border hover:bg-primary/50 active:bg-primary/60 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-none w-1.5 data-[resize-handle-state=drag]:bg-primary/50" />

              <ResizablePanel defaultSize={65} minSize={30} className="min-h-0">
                 <OutputPanelContent
                    files={files}
                    isLoading={isLoading} // Pass isLoading
                    previewSrcDoc={previewSrcDoc} // Pass previewSrcDoc as is
                    isMobile={isMobile}
                    activeOutputTab={activeOutputTab} // Pass activeOutputTab
                    setActiveOutputTab={setActiveOutputTab} // Pass setActiveOutputTab
                    selectedFilePath={selectedFilePath} // Pass selectedFilePath
                    onSelectFile={handleSelectFile}
                    onFileContentChange={handleFileContentChange}
                    onRunCode={handleRunCode} // Pass onRunCode
 previewPath={previewPath} // Ensure previewPath is passed
                    error={error} // Pass the error state to the OutputPanelContent
                 />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
      </div>
    </div>
  );
}

export default WebGeniusApp;