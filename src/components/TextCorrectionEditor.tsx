import { useEffect, useCallback } from 'react';
import { Undo2, Redo2, Save, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTextEditor } from '@/hooks/useTextEditor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TextCorrectionEditorProps {
  initialText: string;
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function TextCorrectionEditor({
  initialText,
  onSave,
  onCancel,
  isSaving = false,
}: TextCorrectionEditorProps) {
  const {
    text,
    setText,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength,
  } = useTextEditor({ initialText });

  // Debug: log renders to help trace runtime errors
  try {
    // keep logs non-frequent and lightweight
    console.debug?.('[TextCorrectionEditor] render', { initialTextLen: initialText?.length ?? 0, textLen: text?.length ?? 0 });
  } catch (e) {
    // ignore the debug errors
  }

  // Reset history when initialText changes (e.g., opening editor for a different document)
  useEffect(() => {
    reset(initialText);
  }, [initialText, reset]);

  // Ensure handleSave is defined before it's used in the keyboard shortcuts effect
  const handleSave = useCallback(async () => {
    await onSave(text);
  }, [text, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, text, handleSave]);

  const hasChanges = text !== initialText;

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo (Ctrl+Y or Ctrl+Shift+Z)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <span className="text-xs text-muted-foreground ml-2">
            {historyLength.past > 0 && `${historyLength.past} undo`}
            {historyLength.past > 0 && historyLength.future > 0 && ' • '}
            {historyLength.future > 0 && `${historyLength.future} redo`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Make corrections to the OCR text before exporting.</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Use Ctrl+Z/Y for undo/redo, Ctrl+S to save
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" onClick={onCancel} size="sm">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="btn-gradient"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 pt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-full min-h-[400px] resize-none font-mono text-sm leading-relaxed"
          placeholder="No text extracted..."
        />
      </div>

      {/* Status Bar */}
      <div className="pt-3 border-t border-border mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{text.length.toLocaleString()} characters</span>
            <span>{text.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
            <span>{text.split('\n').length.toLocaleString()} lines</span>
          </div>
          {hasChanges && (
            <span className="text-warning">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
