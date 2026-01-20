import { FileText, Clock, CheckCircle, AlertCircle, Loader2, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Document, useDeleteDocument } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ConfidenceIndicator } from './ConfidenceIndicator';

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string; iconClassName?: string }> = {
  pending: {
    icon: Clock,
    label: 'Pending',
    className: 'status-pending',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    className: 'status-processing',
    iconClassName: 'animate-spin',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    className: 'status-completed',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    className: 'status-failed',
  },
};

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  try { console.debug?.('[DocumentCard] render', { id: document.id, name: document.file_name }); } catch (e) {}
  const deleteDocument = useDeleteDocument();
  const status = statusConfig[document.status];
  const StatusIcon = status.icon;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const wordCount = document.extracted_text
    ? document.extracted_text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="document-card cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
      {/* Thumbnail Icon */}
        <div className="w-16 h-16 rounded-lg bg-primary/5 shrink-0 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">
                {document.file_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge className={cn('shrink-0', status.className)}>
              <StatusIcon className={cn('w-3 h-3 mr-1', status.iconClassName)} />
              {status.label}
            </Badge>
          </div>

          {/* Confidence Indicator */}
          {document.status === 'completed' && (
            <div className="mt-3">
              <ConfidenceIndicator 
                confidence={document.confidence} 
                size="sm" 
                showIcon={false}
              />
            </div>
          )}

          {/* Stats */}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            {document.processing_time_ms !== null && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{(document.processing_time_ms / 1000).toFixed(1)}s</span>
              </div>
            )}
            {wordCount > 0 && (
              <span>{wordCount.toLocaleString()} words</span>
            )}
            {document.file_size !== null && (
              <span>{(document.file_size / 1024).toFixed(1)} KB</span>
            )}
          </div>

          {/* Preview */}
          {document.extracted_text && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
              {document.extracted_text}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="outline" className="flex-1" onClick={onClick}>
          <Eye className="w-4 h-4 mr-2" />
          View
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete document?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{document.file_name}" and its extracted text.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDocument.mutate(document.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}
