import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Copy, 
  Download, 
  FileText, 
  CheckCircle, 
  Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Document, useUpdateDocument } from '@/hooks/useDocuments';
import { exportAsText, exportAsPDF, exportAsDOCX, copyToClipboard } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { QualityMetrics } from './ConfidenceIndicator';
import { TextCorrectionEditor } from './TextCorrectionEditor';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ErrorBoundary } from './ErrorBoundary';

interface DocumentViewProps {
  document: Document;
  onBack: () => void;
}

export function DocumentView({ document, onBack }: DocumentViewProps) {
  // Debug: track renders
  try {
    console.debug?.('[DocumentView] render', { id: document.id, file: document.file_name });
  } catch (e) {}

  const [isEditing, setIsEditing] = useState(false);
  const [currentText, setCurrentText] = useState(document.extracted_text || '');
  const updateDocument = useUpdateDocument();
  const [openSheet, setOpenSheet] = useState(false);
  const [sheetFontSize, setSheetFontSize] = useState(14);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const matchRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const handleCopy = async () => {
    const success = await copyToClipboard(currentText);
    toast({
      title: success ? 'Copied!' : 'Failed to copy',
      description: success ? 'Text copied to clipboard' : 'Could not copy text',
      variant: success ? 'default' : 'destructive',
    });
  };

  const handleExport = async (format: 'txt' | 'pdf' | 'docx') => {
    const filename = document.file_name.replace(/\.[^/.]+$/, '');
    
    try {
      switch (format) {
        case 'txt':
          exportAsText(currentText, filename);
          break;
        case 'pdf':
          exportAsPDF(currentText, filename);
          break;
        case 'docx':
          await exportAsDOCX(currentText, filename);
          break;
      }
      toast({
        title: 'Export successful',
        description: `Downloaded as ${filename}.${format}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export document',
        variant: 'destructive',
      });
    }
  };

  const handleSave = useCallback(async (newText: string) => {
    await updateDocument.mutateAsync({
      id: document.id,
      extracted_text: newText,
    });
    setCurrentText(newText);
    setIsEditing(false);
    toast({
      title: 'Saved',
      description: 'Document text has been updated',
    });
  }, [document.id, updateDocument]);

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Keep view in sync with updates to the document's extracted text (e.g., when OCR finishes)
  useEffect(() => {
    if (!isEditing) {
      setCurrentText(document.extracted_text || '');
    }
  }, [document.extracted_text, isEditing]);

  const textMetrics = useMemo(() => {
    const text = currentText || '';
    return {
      characterCount: text.length,
      wordCount: text.trim().split(/\s+/).filter(Boolean).length,
      lineCount: text.split('\n').length,
    };
  }, [currentText]);

  // Effects for matches navigation/scrolling
  function scrollToSelected() {
    if (selectedMatch !== null && matchRefs.current[selectedMatch]) {
      matchRefs.current[selectedMatch]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  useEffect(() => {
    // Reset selection when query changes
    if (!searchQuery) {
      setSelectedMatch(null);
      matchRefs.current = [];
      return;
    }

    // If there are matches and no selection, select the first
    if (matchRefs.current.length > 0 && (selectedMatch === null || selectedMatch >= matchRefs.current.length)) {
      setSelectedMatch(0);
    }
  }, [searchQuery, currentText]);

  useEffect(() => {
    scrollToSelected();
  }, [selectedMatch]);

  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="h-full flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pb-4 mb-4">
          <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">Editing: {document.file_name}</h2>
            <p className="text-sm text-muted-foreground">
              Make corrections to the OCR text
            </p>
          </div>
        </div>

        {/* Text Correction Editor */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            <TextCorrectionEditor
              initialText={currentText}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              isSaving={updateDocument.isPending}
            />
          </ErrorBoundary>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{document.file_name}</h2>
            <p className="text-sm text-muted-foreground">
              Processed {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Badge className="status-completed">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      </div>

      {/* Content Layout */}
      <div className="flex-1 flex gap-6 py-4 overflow-hidden">

        {/* Right: Text Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Quality Metrics */}
          <div className="pb-4 border-b border-border mb-4">
            <QualityMetrics
              confidence={document.confidence}
              processingTimeMs={document.processing_time_ms}
              characterCount={textMetrics.characterCount}
              wordCount={textMetrics.wordCount}
              lineCount={textMetrics.lineCount}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pb-4">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Text
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="btn-gradient">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Plain Text (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Document (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('docx')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Word Document (.docx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Extracted Text - Large readable area */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-card border border-border rounded-lg p-6 flex-1 flex flex-col">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4" />
                Extracted Text
              </h3>
              <div className="flex-1 overflow-y-auto" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 350px)' }}>
                {currentText ? (
                  <>
                    <div className="flex justify-end mb-2">
                      <button
                        className="btn-gradient px-3 py-1 text-sm rounded"
                        onClick={() => setOpenSheet(true)}
                      >
                        Open in scroll view
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed bg-transparent p-0 m-0">
                      {currentText}
                    </pre>

                    {/* Sheet scroll view */}
                    <Sheet open={openSheet} onOpenChange={(v) => setOpenSheet(v)}>
                                      <SheetContent side="top" className="h-screen overflow-y-auto">
                        <ErrorBoundary>
                        <SheetHeader className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SheetTitle>Extracted Text - Scroll View</SheetTitle>
                            <span className="text-xs text-muted-foreground">(press Esc to close)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              className="btn-outline px-2 py-1 rounded text-sm"
                              onClick={handleCopy}
                              title="Copy text"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                className="btn-outline px-2 py-1 rounded text-sm"
                                onClick={() => handleExport('txt')}
                                title="Download .txt"
                              >
                                .txt
                              </button>
                              <button
                                className="btn-outline px-2 py-1 rounded text-sm"
                                onClick={() => handleExport('pdf')}
                                title="Download .pdf"
                              >
                                .pdf
                              </button>
                              <button
                                className="btn-outline px-2 py-1 rounded text-sm"
                                onClick={() => handleExport('docx')}
                                title="Download .docx"
                              >
                                .docx
                              </button>
                            </div>

                            <button
                              className="btn-outline px-2 py-1 rounded text-sm"
                              onClick={async () => {
                                // Copy as HTML
                                const html = `<pre style="white-space:pre-wrap;font-family:monospace;">${currentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
                                try {
                                  // Try clipboard.write with HTML if available
                                  if ((navigator as any).clipboard && (navigator as any).clipboard.write) {
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const data = [new ClipboardItem({ 'text/html': blob })];
                                    await (navigator as any).clipboard.write(data);
                                  } else {
                                    await copyToClipboard(html);
                                  }
                                  toast({ title: 'Copied', description: 'Copied HTML to clipboard' });
                                } catch (err) {
                                  await copyToClipboard(html);
                                  toast({ title: 'Copied', description: 'Copied HTML to clipboard' });
                                }
                              }}
                              title="Copy as HTML"
                            >
                              HTML
                            </button>

                            <div className="flex items-center gap-1 border-l pl-3">
                              <button
                                className="btn-outline px-2 py-1 rounded text-sm"
                                onClick={() => setSheetFontSize((s) => Math.max(12, s - 1))}
                                title="Decrease font size"
                              >
                                A-
                              </button>
                              <button
                                className="btn-outline px-2 py-1 rounded text-sm"
                                onClick={() => setSheetFontSize((s) => Math.min(28, s + 1))}
                                title="Increase font size"
                              >
                                A+
                              </button>
                            </div>
                          </div>
                        </SheetHeader>

                        <div className="pt-4 px-4">
                          <div className="flex items-center gap-2 mb-3">
                            <input
                              type="search"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Find in text..."
                              className="input border rounded px-2 py-1 text-sm"
                            />
                            <button
                              className="btn-outline px-2 py-1 rounded text-sm"
                              onClick={() => {
                                if (!searchQuery) return;
                                const count = matchRefs.current.length;
                                if (count > 0) {
                                  const next = (selectedMatch === null ? 0 : (selectedMatch + 1) % count);
                                  setSelectedMatch(next);
                                }
                              }}
                              title="Next match"
                            >
                              Next
                            </button>
                            <button
                              className="btn-outline px-2 py-1 rounded text-sm"
                              onClick={() => {
                                if (!searchQuery) return;
                                const count = matchRefs.current.length;
                                if (count > 0) {
                                  const prev = (selectedMatch === null ? count - 1 : (selectedMatch - 1 + count) % count);
                                  setSelectedMatch(prev);
                                }
                              }}
                              title="Previous match"
                            >
                              Prev
                            </button>
                            <div className="text-xs text-muted-foreground">{matchRefs.current.length} matches</div>
                          </div>

                          <div style={{ fontSize: `${sheetFontSize}px` }} className="whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                            {/** Render highlighted text **/}
                            {searchQuery ? (
                              (() => {
                                // escape regex
                                const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const re = new RegExp(`(${esc(searchQuery)})`, 'i');
                                const parts = currentText.split(new RegExp(`(${esc(searchQuery)})`, 'i'));
                                matchRefs.current = [];
                                let matchIndex = -1;
                                return parts.map((part, i) => {
                                  if (part.toLowerCase() === searchQuery.toLowerCase()) {
                                    matchIndex += 1;
                                    const idx = matchIndex;
                                    return (
                                      <span
                                        key={i}
                                        ref={(el) => (matchRefs.current[idx] = el)}
                                        className={idx === selectedMatch ? 'bg-yellow-300' : 'bg-yellow-200'}
                                      >
                                        {part}
                                      </span>
                                    );
                                  }
                                  return <span key={i}>{part}</span>;
                                });
                              })()
                            ) : (
                              <>{currentText}</>
                            )}
                          </div>
                        </div>
                        </ErrorBoundary>
                      </SheetContent>
                    </Sheet>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">No text extracted</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}