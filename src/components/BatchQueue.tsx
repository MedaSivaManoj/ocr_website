import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Trash2, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Tesseract.js supported languages
export const OCR_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect', flag: '🔍' },
  { code: 'eng', name: 'English', flag: '🇺🇸' },
  { code: 'spa', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fra', name: 'French', flag: '🇫🇷' },
  { code: 'deu', name: 'German', flag: '🇩🇪' },
  { code: 'ita', name: 'Italian', flag: '🇮🇹' },
  { code: 'por', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nld', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pol', name: 'Polish', flag: '🇵🇱' },
  { code: 'rus', name: 'Russian', flag: '🇷🇺' },
  { code: 'jpn', name: 'Japanese', flag: '🇯🇵' },
  { code: 'chi_sim', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'chi_tra', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'kor', name: 'Korean', flag: '🇰🇷' },
  { code: 'ara', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hin', name: 'Hindi', flag: '🇮🇳' },
  { code: 'tur', name: 'Turkish', flag: '🇹🇷' },
  { code: 'vie', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tha', name: 'Thai', flag: '🇹🇭' },
  { code: 'ukr', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ces', name: 'Czech', flag: '🇨🇿' },
  { code: 'swe', name: 'Swedish', flag: '🇸🇪' },
  { code: 'dan', name: 'Danish', flag: '🇩🇰' },
  { code: 'nor', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fin', name: 'Finnish', flag: '🇫🇮' },
  { code: 'ell', name: 'Greek', flag: '🇬🇷' },
  { code: 'heb', name: 'Hebrew', flag: '🇮🇱' },
];

export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  file: File;
  preview: string;
  language: string;
  detectedLanguage?: string;
  status: QueueItemStatus;
  progress: number;
  progressMessage?: string;
  error?: string;
  confidence?: number;
}

interface BatchQueueProps {
  items: QueueItem[];
  isProcessing: boolean;
  isPaused: boolean;
  onUpdateLanguage: (id: string, language: string) => void;
  onRemoveItem: (id: string) => void;
  onClearCompleted: () => void;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
  onRetryItem: (id: string) => void;
  onRetryAllFailed: () => void;
}

export function BatchQueue({
  items,
  isProcessing,
  isPaused,
  onUpdateLanguage,
  onRemoveItem,
  onClearCompleted,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
  onRetryItem,
  onRetryAllFailed,
}: BatchQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending').length;
    const processing = items.filter(i => i.status === 'processing').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'failed').length;
    return { pending, processing, completed, failed, total: items.length };
  }, [items]);

  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const totalProgress = items.reduce((sum, item) => {
      if (item.status === 'completed') return sum + 100;
      if (item.status === 'failed') return sum + 100;
      return sum + item.progress;
    }, 0);
    return Math.round(totalProgress / items.length);
  }, [items]);

  if (items.length === 0) return null;

  const getLanguageInfo = (code: string) => {
    return OCR_LANGUAGES.find(l => l.code === code) || OCR_LANGUAGES[0];
  };

  const getStatusIcon = (status: QueueItemStatus) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: QueueItemStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-muted text-muted-foreground';
      case 'processing':
        return 'bg-primary/10 text-primary';
      case 'completed':
        return 'bg-green-500/10 text-green-600';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
    }
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">Batch Queue</h3>
          <div className="flex gap-2">
            {stats.pending > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.pending} pending
              </Badge>
            )}
            {stats.processing > 0 && (
              <Badge className="text-xs bg-primary/10 text-primary">
                {stats.processing} processing
              </Badge>
            )}
            {stats.completed > 0 && (
              <Badge className="text-xs bg-green-500/10 text-green-600">
                {stats.completed} done
              </Badge>
            )}
            {stats.failed > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.failed} failed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isProcessing && (
            <span className="text-sm text-muted-foreground">
              {overallProgress}%
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Overall Progress Bar */}
      {isProcessing && (
        <div className="px-4 py-2 bg-muted/20">
          <Progress value={overallProgress} className="h-2" />
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Queue Items */}
            <ScrollArea className="max-h-[300px]">
              <div className="p-4 space-y-3">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        item.status === 'processing' && "border-primary/50 bg-primary/5",
                        item.status === 'completed' && "border-green-500/30 bg-green-500/5",
                        item.status === 'failed' && "border-destructive/30 bg-destructive/5",
                        item.status === 'pending' && "border-border bg-background"
                      )}
                    >
                      {/* Preview Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          {getStatusIcon(item.status)}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </span>
                          {item.status === 'processing' && item.progressMessage && (
                            <span className="text-xs text-primary">
                              {item.progressMessage}
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-xs text-green-600 flex items-center gap-2">
                              {item.confidence !== undefined && `${Math.round(item.confidence)}% confidence`}
                              {item.detectedLanguage && (
                                <span className="text-muted-foreground">
                                  • Detected: {getLanguageInfo(item.detectedLanguage).name}
                                </span>
                              )}
                            </span>
                          )}
                          {item.status === 'failed' && item.error && (
                            <span className="text-xs text-destructive truncate">
                              {item.error}
                            </span>
                          )}
                        </div>
                        {item.status === 'processing' && (
                          <Progress value={item.progress} className="h-1 mt-2" />
                        )}
                      </div>

                      {/* Language Selector */}
                      <div className="flex-shrink-0">
                        <Select
                          value={item.language}
                          onValueChange={(value) => onUpdateLanguage(item.id, value)}
                          disabled={item.status !== 'pending' && item.status !== 'failed'}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue>
                              <span className="flex items-center gap-1">
                                <span>{getLanguageInfo(item.language).flag}</span>
                                <span className="truncate">{getLanguageInfo(item.language).name}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {OCR_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                <span className="flex items-center gap-2">
                                  <span>{lang.flag}</span>
                                  <span>{lang.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Retry Button for failed items */}
                      {item.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => onRetryItem(item.id)}
                          title="Retry"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => onRemoveItem(item.id)}
                        disabled={item.status === 'processing'}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCompleted}
                  disabled={stats.completed === 0 && stats.failed === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Completed
                </Button>
                {stats.failed > 0 && !isProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetryAllFailed}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Failed ({stats.failed})
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {isProcessing ? (
                  isPaused ? (
                    <Button size="sm" onClick={onResumeProcessing}>
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={onPauseProcessing}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )
                ) : (
                  <Button 
                    size="sm" 
                    onClick={onStartProcessing}
                    disabled={stats.pending === 0}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Process All ({stats.pending})
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
