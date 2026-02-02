import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, FileText, Loader2, Upload, Link, ExternalLink } from 'lucide-react';

interface Anexo {
  id: number;
  video_id: number;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  tipo: string | null;
  tamanho: number | null;
  ordem: number;
}

interface VideoAnexosManagerProps {
  videoId: number;
  videoTitulo: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoAnexosManager({ videoId, videoTitulo, isOpen, onClose }: VideoAnexosManagerProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const [anexoForm, setAnexoForm] = useState({ nome: '', descricao: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Link form state
  const [linkForm, setLinkForm] = useState({ nome: '', descricao: '', url: '' });
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    if (isOpen && videoId) {
      loadAnexos();
    }
  }, [isOpen, videoId]);

  const loadAnexos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'admin-get-anexos', videoId }
      });

      if (!error && data?.anexos) {
        setAnexos(data.anexos);
      }
    } catch (error) {
      console.error('Error loading anexos:', error);
      toast.error('Erro ao carregar anexos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!anexoForm.nome) {
        setAnexoForm(prev => ({ ...prev, nome: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const uploadAnexo = async () => {
    if (!selectedFile || !anexoForm.nome.trim()) {
      toast.error('Selecione um arquivo e dê um nome');
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });
      const base64 = await base64Promise;

      // Upload via edge function
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-media', {
        body: {
          file: base64,
          fileName: selectedFile.name,
          bucket: 'video-anexos',
          folder: `video-${videoId}`
        }
      });

      if (uploadError) throw uploadError;

      // Create anexo record
      const fileExt = selectedFile.name.split('.').pop() || '';
      const { error: createError } = await supabase.functions.invoke('videos-api', {
        body: {
          action: 'create-anexo',
          videoId,
          nome: anexoForm.nome.trim(),
          descricao: anexoForm.descricao.trim() || null,
          arquivoUrl: uploadData.url,
          tipo: fileExt,
          tamanho: selectedFile.size,
          ordem: anexos.length
        }
      });

      if (createError) throw createError;

      toast.success('Anexo adicionado!');
      setAnexoForm({ nome: '', descricao: '' });
      setSelectedFile(null);
      loadAnexos();
    } catch (error) {
      console.error('Error uploading anexo:', error);
      toast.error('Erro ao enviar anexo');
    } finally {
      setIsUploading(false);
    }
  };

  const addDriveLink = async () => {
    if (!linkForm.nome.trim() || !linkForm.url.trim()) {
      toast.error('Preencha o nome e o link');
      return;
    }

    // Validate URL
    try {
      new URL(linkForm.url);
    } catch {
      toast.error('URL inválida');
      return;
    }

    setIsAddingLink(true);
    try {
      const { error } = await supabase.functions.invoke('videos-api', {
        body: {
          action: 'create-anexo',
          videoId,
          nome: linkForm.nome.trim(),
          descricao: linkForm.descricao.trim() || null,
          arquivoUrl: linkForm.url.trim(),
          tipo: 'link',
          tamanho: null,
          ordem: anexos.length
        }
      });

      if (error) throw error;

      toast.success('Link adicionado!');
      setLinkForm({ nome: '', descricao: '', url: '' });
      loadAnexos();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Erro ao adicionar link');
    } finally {
      setIsAddingLink(false);
    }
  };

  const deleteAnexo = async (id: number) => {
    if (!confirm('Excluir este anexo?')) return;

    try {
      const { error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'delete-anexo', id }
      });

      if (error) throw error;

      toast.success('Anexo excluído');
      loadAnexos();
    } catch (error) {
      toast.error('Erro ao excluir anexo');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isLink = (anexo: Anexo) => anexo.tipo === 'link' || !anexo.tamanho;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Anexos: {videoTitulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tabs for Upload vs Link */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-2">
                <Link className="h-4 w-4" />
                Link Externo
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 space-y-3">
                <div className="space-y-2">
                  <Label>Arquivo</Label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="bg-card border-border"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                  />
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nome do Anexo</Label>
                  <Input
                    value={anexoForm.nome}
                    onChange={(e) => setAnexoForm({ ...anexoForm, nome: e.target.value })}
                    placeholder="Ex: Material de apoio"
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={anexoForm.descricao}
                    onChange={(e) => setAnexoForm({ ...anexoForm, descricao: e.target.value })}
                    placeholder="Breve descrição..."
                    className="bg-card border-border"
                  />
                </div>
                <Button 
                  onClick={uploadAnexo} 
                  disabled={isUploading || !selectedFile}
                  className="w-full gap-2"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar Anexo
                </Button>
              </div>
            </TabsContent>

            {/* Link Tab */}
            <TabsContent value="link" className="mt-4">
              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 space-y-3">
                <div className="space-y-2">
                  <Label>URL do Link (Drive, Dropbox, etc.)</Label>
                  <Input
                    value={linkForm.url}
                    onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Anexo</Label>
                  <Input
                    value={linkForm.nome}
                    onChange={(e) => setLinkForm({ ...linkForm, nome: e.target.value })}
                    placeholder="Ex: Planilha de Exemplo"
                    className="bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={linkForm.descricao}
                    onChange={(e) => setLinkForm({ ...linkForm, descricao: e.target.value })}
                    placeholder="Breve descrição..."
                    className="bg-card border-border"
                  />
                </div>
                <Button 
                  onClick={addDriveLink} 
                  disabled={isAddingLink || !linkForm.url || !linkForm.nome}
                  className="w-full gap-2"
                >
                  {isAddingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                  Adicionar Link
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* List of Anexos */}
          <div className="space-y-2">
            <Label>Anexos adicionados</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : anexos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum anexo adicionado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {anexos.map((anexo) => (
                  <div 
                    key={anexo.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="p-2 rounded bg-primary/10">
                      {isLink(anexo) ? (
                        <ExternalLink className="h-4 w-4 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{anexo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {isLink(anexo) ? 'Link externo' : `${anexo.tipo?.toUpperCase()} • ${formatFileSize(anexo.tamanho)}`}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteAnexo(anexo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
