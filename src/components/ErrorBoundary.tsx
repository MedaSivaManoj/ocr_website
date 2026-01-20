import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // You can log the error to an analytics service here
    console.error('ErrorBoundary caught an error', error, info);
    try {
      toast({ title: 'An error occurred', description: error.message, variant: 'destructive' });
    } catch (e) {
      // ignore toast errors
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-destructive/5 rounded">
          <h3 className="font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred while rendering this view.</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline">Dismiss</Button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
