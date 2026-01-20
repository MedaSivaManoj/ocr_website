import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  original_file_url: string | null;
  file_size: number | null;
  file_type: string | null;
  extracted_text: string | null;
  confidence: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

export function useDocuments(searchQuery?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents', user?.id, searchQuery],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `file_name.ilike.%${searchQuery}%,extracted_text.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user,
  });
}

export function useDocument(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as Document;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file_name: string;
      original_file_url?: string;
      file_size?: number;
      file_type?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: data.file_name,
          original_file_url: data.original_file_url,
          file_size: data.file_size,
          file_type: data.file_type,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return document as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Document> & { id: string }) => {
      const { data: document, error } = await supabase
        .from('documents')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return document as Document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', data.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Document deleted',
        description: 'The document has been permanently removed.',
      });
    },
  });
}

export function useUploadFile() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return { path: filePath, url: publicUrl };
    },
  });
}
