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
      <DialogContent className="bg-gradient-to-b from-card to-card/95 border-border/50 max-w-lg shadow-2xl backdrop-blur-xl">
        <DialogHeader className="pb-4 border-b border-border/30">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-foreground">Anexos do Vídeo</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate max-w-[280px]">{videoTitulo}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Tabs for Upload vs Link */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl border border-border/30">
              <TabsTrigger 
                value="upload" 
                className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
              >
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger 
                value="link" 
                className="gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
              >
                <Link className="h-4 w-4" />
                Link Externo
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="mt-4">
              <div className="p-5 rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent space-y-4 hover:border-primary/50 transition-colors">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    Arquivo
                  </Label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors file:bg-primary/10 file:text-primary file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 file:font-medium file:text-sm cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="text-xs text-primary font-medium truncate flex-1">
                        {selectedFile.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome do Anexo</Label>
                  <Input
                    value={anexoForm.nome}
                    onChange={(e) => setAnexoForm({ ...anexoForm, nome: e.target.value })}
                    placeholder="Ex: Material de apoio"
                    className="bg-card/50 border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Descrição (opcional)</Label>
                  <Input
                    value={anexoForm.descricao}
                    onChange={(e) => setAnexoForm({ ...anexoForm, descricao: e.target.value })}
                    placeholder="Breve descrição..."
                    className="bg-card/50 border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
                <Button 
                  onClick={uploadAnexo} 
                  disabled={isUploading || !selectedFile}
                  className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all duration-200"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar Anexo
                </Button>
              </div>
            </TabsContent>

            {/* Link Tab */}
            <TabsContent value="link" className="mt-4">
              <div className="p-5 rounded-2xl border border-dashed border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent space-y-4 hover:border-blue-500/50 transition-colors">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Link className="h-3.5 w-3.5 text-blue-500" />
                    URL do Link (Drive, Dropbox, etc.)
                  </Label>
                  <Input
                    value={linkForm.url}
                    onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="bg-card/50 border-border/50 focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nome do Anexo</Label>
                  <Input
                    value={linkForm.nome}
                    onChange={(e) => setLinkForm({ ...linkForm, nome: e.target.value })}
                    placeholder="Ex: Planilha de Exemplo"
                    className="bg-card/50 border-border/50 focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Descrição (opcional)</Label>
                  <Input
                    value={linkForm.descricao}
                    onChange={(e) => setLinkForm({ ...linkForm, descricao: e.target.value })}
                    placeholder="Breve descrição..."
                    className="bg-card/50 border-border/50 focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <Button 
                  onClick={addDriveLink} 
                  disabled={isAddingLink || !linkForm.url || !linkForm.nome}
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 transition-all duration-200"
                >
                  {isAddingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                  Adicionar Link
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* List of Anexos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Anexos adicionados</Label>
              {anexos.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  {anexos.length} {anexos.length === 1 ? 'anexo' : 'anexos'}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Carregando...</span>
                </div>
              </div>
            ) : anexos.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-border/50 bg-muted/10">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum anexo adicionado ainda
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Faça upload de arquivos ou adicione links
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {anexos.map((anexo) => (
                  <div 
                    key={anexo.id}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30 hover:border-primary/30 hover:from-primary/5 hover:to-transparent transition-all duration-200"
                  >
                    <div className={`p-2.5 rounded-xl shadow-sm ${
                      isLink(anexo) 
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20' 
                        : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20'
                    }`}>
                      {isLink(anexo) ? (
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate text-sm">{anexo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {isLink(anexo) ? (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Link externo
                          </span>
                        ) : (
                          <span>{anexo.tipo?.toUpperCase()} • {formatFileSize(anexo.tamanho)}</span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 h-8 w-8"
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
