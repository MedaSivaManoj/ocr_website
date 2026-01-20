import { useState, useCallback, useRef } from 'react';
import { QueueItem, QueueItemStatus } from '@/components/BatchQueue';
import { performOCR, PreprocessingOptions, OCRMode } from '@/lib/ocr';
import { detectLanguage, getLanguageName } from '@/lib/languageDetection';
import { useCreateDocument, useUpdateDocument, useUploadFile } from '@/hooks/useDocuments';
import { toast } from '@/hooks/use-toast';

let queueItemId = 0;

interface UseBatchQueueOptions {
  preprocessingOptions: PreprocessingOptions;
  ocrMode: OCRMode;
  onComplete?: () => void;
}

export function useBatchQueue({ preprocessingOptions, ocrMode, onComplete }: UseBatchQueueOptions) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const pauseRef = useRef(false);
  const abortRef = useRef(false);

  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const uploadFile = useUploadFile();

  const addFiles = useCallback((files: File[], defaultLanguage: string = 'eng') => {
    const newItems: QueueItem[] = files.map(file => ({
      id: `queue-${++queueItemId}`,
      file,
      preview: URL.createObjectURL(file),
      language: defaultLanguage,
      status: 'pending' as QueueItemStatus,
      progress: 0,
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const updateLanguage = useCallback((id: string, language: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, language } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(item => item.id !== id);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setItems(prev => {
      prev.filter(item => item.status === 'completed' || item.status === 'failed')
        .forEach(item => URL.revokeObjectURL(item.preview));
      return prev.filter(item => item.status !== 'completed' && item.status !== 'failed');
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const retryItem = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'pending' as QueueItemStatus, progress: 0, error: undefined } : item
    ));
  }, []);

  const retryAllFailed = useCallback(() => {
    setItems(prev => prev.map(item =>
      item.status === 'failed' ? { ...item, status: 'pending' as QueueItemStatus, progress: 0, error: undefined } : item
    ));
  }, []);

  const processItem = async (item: QueueItem): Promise<void> => {
    const startTime = Date.now();

    try {
      updateItem(item.id, { status: 'processing', progress: 0, progressMessage: 'Starting...' });

      // Create document record
      const doc = await createDocument.mutateAsync({
        file_name: item.file.name,
        file_size: item.file.size,
        file_type: item.file.type,
      });

      updateItem(item.id, { progress: 5, progressMessage: 'Uploading file...' });

      // Upload file
      let fileUrl: string | undefined;
      try {
        const { url } = await uploadFile.mutateAsync(item.file);
        fileUrl = url;
      } catch (error) {
        console.warn('File upload failed, continuing without storage:', error);
      }

      // Detect language if set to auto
      let ocrLanguage = item.language;
      let detectedLanguage: string | undefined;
      
      if (item.language === 'auto') {
        updateItem(item.id, { progress: 10, progressMessage: 'Detecting language...' });
        
        const detection = await detectLanguage(item.file, (msg) => {
          updateItem(item.id, { progressMessage: msg });
        });
        
        ocrLanguage = detection.language;
        detectedLanguage = detection.language;
        
        updateItem(item.id, { 
          progress: 15, 
          progressMessage: `Detected: ${getLanguageName(detection.language)}`,
          detectedLanguage
        });
        
        // Small delay to show the detected language
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      updateItem(item.id, { progress: 20, progressMessage: 'Preprocessing...' });

      // Perform OCR with detected or selected language
      const result = await performOCR(item.file, (prog) => {
        const ocrProgress = 20 + (prog.progress * 70);
        updateItem(item.id, { 
          progress: ocrProgress, 
          progressMessage: prog.status 
        });
      }, ocrLanguage, { ...preprocessingOptions, mode: ocrMode });

      const processingTime = Date.now() - startTime;

      // Update document with results
      await updateDocument.mutateAsync({
        id: doc.id,
        extracted_text: result.text,
        confidence: result.confidence,
        processing_time_ms: processingTime,
        original_file_url: fileUrl,
        status: 'completed',
      });

      updateItem(item.id, { 
        status: 'completed', 
        progress: 100, 
        confidence: result.confidence,
        detectedLanguage,
        progressMessage: undefined 
      });

    } catch (error) {
      console.error('Processing failed:', error);
      updateItem(item.id, { 
        status: 'failed', 
        progress: 0, 
        error: error instanceof Error ? error.message : 'Processing failed',
        progressMessage: undefined
      });
    }
  };

  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    setIsPaused(false);
    pauseRef.current = false;
    abortRef.current = false;

    const pendingItems = items.filter(item => item.status === 'pending');
    let processedCount = 0;
    
    for (const item of pendingItems) {
      // Check if paused or aborted
      while (pauseRef.current && !abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (abortRef.current) {
        break;
      }

      await processItem(item);
      processedCount++;
    }

    setIsProcessing(false);
    setIsPaused(false);
    
    if (processedCount > 0) {
      toast({
        title: 'Batch processing complete',
        description: `${processedCount} document${processedCount > 1 ? 's' : ''} processed`,
      });
      onComplete?.();
    }
  }, [items, preprocessingOptions, ocrMode, onComplete]);

  const pauseProcessing = useCallback(() => {
    pauseRef.current = true;
    setIsPaused(true);
    toast({
      title: 'Processing paused',
      description: 'Click Resume to continue',
    });
  }, []);

  const resumeProcessing = useCallback(() => {
    pauseRef.current = false;
    setIsPaused(false);
    toast({
      title: 'Processing resumed',
    });
  }, []);

  const stopProcessing = useCallback(() => {
    abortRef.current = true;
    pauseRef.current = false;
    setIsProcessing(false);
    setIsPaused(false);
  }, []);

  const clearAll = useCallback(() => {
    stopProcessing();
    items.forEach(item => URL.revokeObjectURL(item.preview));
    setItems([]);
  }, [items, stopProcessing]);

  return {
    items,
    isProcessing,
    isPaused,
    addFiles,
    updateLanguage,
    removeItem,
    clearCompleted,
    clearAll,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    stopProcessing,
    retryItem,
    retryAllFailed,
  };
}
