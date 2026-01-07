import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Clock, TrendingUp, Search, Plus, ArrowRight } from 'lucide-react';
import { useDocuments, Document } from '@/hooks/useDocuments';
import { AppSidebar } from '@/components/AppSidebar';
import { StatsCard } from '@/components/StatsCard';
import { DocumentCard } from '@/components/DocumentCard';
import { DocumentView } from '@/components/DocumentView';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const { data: documents, isLoading } = useDocuments(searchQuery);

  const stats = {
    total: documents?.length || 0,
    completed: documents?.filter((d) => d.status === 'completed').length || 0,
    avgConfidence:
      documents
        ?.filter((d) => d.confidence)
        .reduce((acc, d) => acc + (d.confidence || 0), 0) /
        (documents?.filter((d) => d.confidence).length || 1) || 0,
    recentCount:
      documents?.filter(
        (d) =>
          new Date(d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length || 0,
  };

  const recentDocuments = documents?.slice(0, 5) || [];

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedDocument ? (
            <motion.div
              key="document-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full p-6"
            >
              <DocumentView
                document={selectedDocument}
                onBack={() => setSelectedDocument(null)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-border bg-card/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">
                      Overview of your OCR processing
                    </p>
                  </div>
                  <Button asChild className="btn-gradient">
                    <Link to="/upload">
                      <Plus className="w-4 h-4 mr-2" />
                      New Upload
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Total Documents"
                    value={stats.total}
                    icon={<FileText className="w-6 h-6 text-primary" />}
                    description="All time"
                  />
                  <StatsCard
                    title="Completed"
                    value={stats.completed}
                    icon={<TrendingUp className="w-6 h-6 text-success" />}
                    description="Successfully processed"
                  />
                  <StatsCard
                    title="Avg. Confidence"
                    value={`${stats.avgConfidence.toFixed(1)}%`}
                    icon={<Clock className="w-6 h-6 text-warning" />}
                    description="OCR accuracy"
                  />
                  <StatsCard
                    title="This Week"
                    value={stats.recentCount}
                    icon={<Upload className="w-6 h-6 text-accent" />}
                    description="Last 7 days"
                  />
                </div>

                {/* Recent Documents */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                      Recent Documents
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search documents..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/documents">
                          View all
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                      ))}
                    </div>
                  ) : recentDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recentDocuments.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onClick={() => setSelectedDocument(doc)}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FileText className="w-12 h-12 text-muted-foreground" />}
                      title="No documents yet"
                      description="Upload your first document to get started with OCR text extraction"
                      action={
                        <Button asChild className="btn-gradient">
                          <Link to="/upload">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </Link>
                        </Button>
                      }
                    />
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    to="/upload"
                    className="card-interactive p-6 flex items-center gap-4"
                  >
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Upload Images</h3>
                      <p className="text-sm text-muted-foreground">
                        Drag & drop or browse files
                      </p>
                    </div>
                  </Link>
                  <Link
                    to="/documents"
                    className="card-interactive p-6 flex items-center gap-4"
                  >
                    <div className="p-3 rounded-lg bg-success/10">
                      <FileText className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">View History</h3>
                      <p className="text-sm text-muted-foreground">
                        Browse processed documents
                      </p>
                    </div>
                  </Link>
                  <Link
                    to="/documents"
                    className="card-interactive p-6 flex items-center gap-4"
                  >
                    <div className="p-3 rounded-lg bg-accent/10">
                      <Search className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Search Text</h3>
                      <p className="text-sm text-muted-foreground">
                        Find extracted content
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
