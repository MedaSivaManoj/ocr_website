import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceIndicatorProps {
  confidence: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

export function getConfidenceLevel(confidence: number | null): {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  if (confidence === null) {
    return {
      level: 'unknown',
      label: 'Unknown',
      description: 'Confidence score not available',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    };
  }

  if (confidence >= 90) {
    return {
      level: 'excellent',
      label: 'Excellent',
      description: 'High accuracy - text was clearly recognized',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500',
    };
  }

  if (confidence >= 75) {
    return {
      level: 'good',
      label: 'Good',
      description: 'Good accuracy - minor errors possible',
      color: 'text-success',
      bgColor: 'bg-success',
    };
  }

  if (confidence >= 50) {
    return {
      level: 'fair',
      label: 'Fair',
      description: 'Moderate accuracy - review recommended',
      color: 'text-warning',
      bgColor: 'bg-warning',
    };
  }

  return {
    level: 'poor',
    label: 'Poor',
    description: 'Low accuracy - manual correction needed',
    color: 'text-destructive',
    bgColor: 'bg-destructive',
  };
}

const ConfidenceIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'excellent':
      return <ShieldCheck className="w-full h-full" />;
    case 'good':
      return <Shield className="w-full h-full" />;
    case 'fair':
      return <ShieldAlert className="w-full h-full" />;
    case 'poor':
      return <ShieldQuestion className="w-full h-full" />;
    default:
      return <Shield className="w-full h-full" />;
  }
};

export function ConfidenceIndicator({
  confidence,
  size = 'md',
  showLabel = true,
  showIcon = true,
}: ConfidenceIndicatorProps) {
  const { level, label, description, color, bgColor } = getConfidenceLevel(confidence);

  const sizeClasses = {
    sm: { icon: 'w-4 h-4', text: 'text-xs', bar: 'h-1' },
    md: { icon: 'w-5 h-5', text: 'text-sm', bar: 'h-1.5' },
    lg: { icon: 'w-6 h-6', text: 'text-base', bar: 'h-2' },
  };

  const sizes = sizeClasses[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            {showIcon && (
              <div className={cn(sizes.icon, color)}>
                <ConfidenceIcon level={level} />
              </div>
            )}
            <div className="flex flex-col gap-1 min-w-[60px]">
              <div className="flex items-center justify-between gap-2">
                {showLabel && (
                  <span className={cn(sizes.text, 'font-medium', color)}>
                    {confidence !== null ? `${confidence.toFixed(0)}%` : '-'}
                  </span>
                )}
                {showLabel && (
                  <span className={cn(sizes.text, 'text-muted-foreground')}>
                    {label}
                  </span>
                )}
              </div>
              <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizes.bar)}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence ?? 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', bgColor)}
                />
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{label} Quality</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface QualityMetricsProps {
  confidence: number | null;
  processingTimeMs: number | null;
  characterCount: number;
  wordCount: number;
  lineCount: number;
}

export function QualityMetrics({
  confidence,
  processingTimeMs,
  characterCount,
  wordCount,
  lineCount,
}: QualityMetricsProps) {
  const { color } = getConfidenceLevel(confidence);

  const metrics = [
    {
      label: 'Characters',
      value: characterCount.toLocaleString(),
      icon: '📝',
    },
    {
      label: 'Words',
      value: wordCount.toLocaleString(),
      icon: '📖',
    },
    {
      label: 'Lines',
      value: lineCount.toLocaleString(),
      icon: '📄',
    },
    {
      label: 'Speed',
      value: processingTimeMs 
        ? characterCount > 0 
          ? `${Math.round(characterCount / (processingTimeMs / 1000))}/s`
          : '-'
        : '-',
      icon: '⚡',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Confidence Display */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">OCR Confidence</span>
          <span className={cn('text-2xl font-bold', color)}>
            {confidence !== null ? `${confidence.toFixed(1)}%` : '-'}
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence ?? 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full transition-all',
              confidence !== null && confidence >= 90
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : confidence !== null && confidence >= 75
                ? 'bg-gradient-to-r from-success to-emerald-500'
                : confidence !== null && confidence >= 50
                ? 'bg-gradient-to-r from-warning to-amber-400'
                : 'bg-gradient-to-r from-destructive to-red-400'
            )}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {getConfidenceLevel(confidence).description}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{metric.icon}</span>
              <span className="text-xs text-muted-foreground">{metric.label}</span>
            </div>
            <p className="text-lg font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Processing Time */}
      {processingTimeMs !== null && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm text-muted-foreground">Processing Time</span>
          <span className="font-medium">
            {processingTimeMs < 1000
              ? `${processingTimeMs}ms`
              : `${(processingTimeMs / 1000).toFixed(2)}s`}
          </span>
        </div>
      )}
    </div>
  );
}
