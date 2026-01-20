import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText, PenTool, Type, Settings2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OCRMode, PreprocessingOptions } from '@/lib/ocr';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BatchQueue, OCR_LANGUAGES } from '@/components/BatchQueue';
import { useBatchQueue } from '@/hooks/useBatchQueue';

interface UploadZoneProps {
  onComplete?: () => void;
}

export function UploadZone({ onComplete }: UploadZoneProps) {
  const [ocrMode, setOcrMode] = useState<OCRMode>('printed');
  const [defaultLanguage, setDefaultLanguage] = useState('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preprocessingOptions, setPreprocessingOptions] = useState<PreprocessingOptions>({
    grayscale: true,
    denoise: true,
    contrast: true,
    sharpen: true,
    deskew: false,
    adaptiveThreshold: false,
    morphology: false,
  });

  const {
    items,
    isProcessing,
    isPaused,
    addFiles,
    updateLanguage,
    removeItem,
    clearCompleted,
    startProcessing,
    pauseProcessing,
    resumeProcessing,
    retryItem,
    retryAllFailed,
  } = useBatchQueue({ preprocessingOptions, ocrMode, onComplete });

  const handleModeChange = (mode: OCRMode) => {
    setOcrMode(mode);
    if (mode === 'handwritten') {
      setPreprocessingOptions({
        grayscale: true,
        denoise: true,
        contrast: true,
        sharpen: false,
        deskew: true,
        adaptiveThreshold: true,
        morphology: true,
      });
    } else {
      setPreprocessingOptions({
        grayscale: true,
        denoise: true,
        contrast: true,
        sharpen: true,
        deskew: false,
        adaptiveThreshold: false,
        morphology: false,
      });
    }
  };

  const toggleOption = (key: keyof PreprocessingOptions) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      addFiles(acceptedFiles, defaultLanguage);
    }
  }, [addFiles, defaultLanguage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div className="space-y-6">
      {/* Default Language Selection */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Default Language for New Files:</span>
        </div>
        <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select language" />
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

      {/* OCR Mode Selection */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">OCR Mode:</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange('printed')}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
              ocrMode === 'printed'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg',
              ocrMode === 'printed' ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Type className={cn(
                'w-5 h-5',
                ocrMode === 'printed' ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-left">
              <p className={cn(
                'font-medium',
                ocrMode === 'printed' ? 'text-primary' : 'text-foreground'
              )}>
                Printed Text
              </p>
              <p className="text-xs text-muted-foreground">
                Books, documents, articles
              </p>
            </div>
          </button>
          <button
            onClick={() => handleModeChange('handwritten')}
            className={cn(
              'flex items-center gap-3 p-4 rounded-lg border-2 transition-all',
              ocrMode === 'handwritten'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className={cn(
              'p-2 rounded-lg',
              ocrMode === 'handwritten' ? 'bg-primary/10' : 'bg-muted'
            )}>
              <PenTool className={cn(
                'w-5 h-5',
                ocrMode === 'handwritten' ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-left">
              <p className={cn(
                'font-medium',
                ocrMode === 'handwritten' ? 'text-primary' : 'text-foreground'
              )}>
                Handwritten
              </p>
              <p className="text-xs text-muted-foreground">
                Notes, letters, forms
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Advanced Preprocessing Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Advanced Preprocessing Options
            <motion.span
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              <Switch
                id="grayscale"
                checked={preprocessingOptions.grayscale}
                onCheckedChange={() => toggleOption('grayscale')}
              />
              <Label htmlFor="grayscale" className="text-sm">Grayscale</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="denoise"
                checked={preprocessingOptions.denoise}
                onCheckedChange={() => toggleOption('denoise')}
              />
              <Label htmlFor="denoise" className="text-sm">Noise Reduction</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="contrast"
                checked={preprocessingOptions.contrast}
                onCheckedChange={() => toggleOption('contrast')}
              />
              <Label htmlFor="contrast" className="text-sm">Contrast Enhancement</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sharpen"
                checked={preprocessingOptions.sharpen}
                onCheckedChange={() => toggleOption('sharpen')}
              />
              <Label htmlFor="sharpen" className="text-sm">Sharpen</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="deskew"
                checked={preprocessingOptions.deskew}
                onCheckedChange={() => toggleOption('deskew')}
              />
              <Label htmlFor="deskew" className="text-sm">Auto Deskew</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="adaptiveThreshold"
                checked={preprocessingOptions.adaptiveThreshold}
                onCheckedChange={() => toggleOption('adaptiveThreshold')}
              />
              <Label htmlFor="adaptiveThreshold" className="text-sm">Adaptive Threshold</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="morphology"
                checked={preprocessingOptions.morphology}
                onCheckedChange={() => toggleOption('morphology')}
              />
              <Label htmlFor="morphology" className="text-sm">Stroke Enhancement</Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {ocrMode === 'handwritten' 
              ? 'Handwriting mode: Adaptive threshold and deskew are recommended for best results.'
              : 'Printed text mode: Standard preprocessing works well for most documents.'}
          </p>
        </CollapsibleContent>
      </Collapsible>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'upload-zone p-8 cursor-pointer',
          isDragActive && 'upload-zone-active'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            className={cn(
              'p-4 rounded-full',
              isDragActive ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            {isDragActive ? (
              <Image className="w-8 h-8 text-primary" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </motion.div>
          <div>
            <p className="font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag & drop images or PDFs'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • PNG, JPG, GIF, BMP, TIFF, WebP, PDF up to 50MB
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Each file can have different language settings
            </p>
          </div>
        </div>
      </div>

      {/* Batch Queue */}
      <BatchQueue
        items={items}
        isProcessing={isProcessing}
        isPaused={isPaused}
        onUpdateLanguage={updateLanguage}
        onRemoveItem={removeItem}
        onClearCompleted={clearCompleted}
        onStartProcessing={startProcessing}
        onPauseProcessing={pauseProcessing}
        onResumeProcessing={resumeProcessing}
        onRetryItem={retryItem}
        onRetryAllFailed={retryAllFailed}
      />
    </div>
  );
}
