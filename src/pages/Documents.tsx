import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, FileText, Grid, List, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocuments, Document } from '@/hooks/useDocuments';
import { AppSidebar } from '@/components/AppSidebar';
import { DocumentCard } from '@/components/DocumentCard';
import { DocumentView } from '@/components/DocumentView';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { data: documents, isLoading } = useDocuments(searchQuery);

  const filteredDocuments = documents?.filter((doc) => {
    if (statusFilter === 'all') return true;
    return doc.status === statusFilter;
  });

  // Keep selectedDocument in sync with any updates from the documents query
  useEffect(() => {
    if (!selectedDocument || !documents) return;
    const updated = documents.find((d) => d.id === selectedDocument.id);
    if (updated && updated !== selectedDocument) {
      setSelectedDocument(updated);
    }
  }, [documents, selectedDocument]);

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
              key="documents-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-border bg-card/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Documents</h1>
                    <p className="text-muted-foreground">
                      {filteredDocuments?.length || 0} document
                      {(filteredDocuments?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button asChild className="btn-gradient">
                    <Link to="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Link>
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search by filename or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  >
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => v && setViewMode(v as ViewMode)}
                    className="border border-border rounded-lg"
                  >
                    <ToggleGroupItem value="grid" aria-label="Grid view">
                      <Grid className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view">
                      <List className="w-4 h-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Documents Grid/List */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-4'
                    }
                  >
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : filteredDocuments && filteredDocuments.length > 0 ? (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-4'
                    }
                  >
                    {filteredDocuments.map((doc) => (
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
                    title={
                      searchQuery || statusFilter !== 'all'
                        ? 'No matching documents'
                        : 'No documents yet'
                    }
                    description={
                      searchQuery || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Upload your first document to get started'
                    }
                    action={
                      !searchQuery && statusFilter === 'all' ? (
                        <Button asChild className="btn-gradient">
                          <Link to="/upload">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                        >
                          Clear Filters
                        </Button>
                      )
                    }
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
