import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-10 h-10', text: 'text-2xl' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg" />
        <div className="relative btn-gradient rounded-lg p-2">
          <FileText className={cn('text-primary-foreground', sizes[size].icon)} />
        </div>
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight', sizes[size].text)}>
          <span className="text-gradient">OCR</span>
          <span className="text-foreground">Platform</span>
        </span>
      )}
    </div>
  );
}
