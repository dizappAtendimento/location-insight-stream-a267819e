import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, FolderOpen, Loader2, GripVertical, Paperclip } from 'lucide-react';
import { VideoAnexosManager } from './VideoAnexosManager';

interface Modulo {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

interface VideoItem {
  id: number;
  idmodulo: number;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
  ordem: number;
  ativo: boolean;
}

export function AdminVideos() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Module form
  const [isModuloDialogOpen, setIsModuloDialogOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  const [moduloForm, setModuloForm] = useState({ nome: '', descricao: '', ordem: 0 });
  const [isSavingModulo, setIsSavingModulo] = useState(false);
  
  // Video form
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [videoForm, setVideoForm] = useState({ idModulo: 0, titulo: '', descricao: '', youtube_url: '', ordem: 0 });
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  
  // Anexos manager
  const [anexosVideoId, setAnexosVideoId] = useState<number | null>(null);
  const [anexosVideoTitulo, setAnexosVideoTitulo] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modulosRes, videosRes] = await Promise.all([
        supabase.functions.invoke('videos-api', { body: { action: 'admin-get-modulos' } }),
        supabase.functions.invoke('videos-api', { body: { action: 'admin-get-videos' } })
      ]);

      if (!modulosRes.error && modulosRes.data?.modulos) {
        setModulos(modulosRes.data.modulos);
      }
      if (!videosRes.error && videosRes.data?.videos) {
        setVideos(videosRes.data.videos);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== MODULE HANDLERS ==========
  
  const openModuloDialog = (modulo?: Modulo) => {
    if (modulo) {
      setEditingModulo(modulo);
      setModuloForm({ nome: modulo.nome, descricao: modulo.descricao || '', ordem: modulo.ordem });
    } else {
      setEditingModulo(null);
      setModuloForm({ nome: '', descricao: '', ordem: modulos.length });
    }
    setIsModuloDialogOpen(true);
  };

  const saveModulo = async () => {
    if (!moduloForm.nome.trim()) {
      toast.error('Nome do módulo é obrigatório');
      return;
    }

    setIsSavingModulo(true);
    try {
      const action = editingModulo ? 'update-modulo' : 'create-modulo';
      const payload = editingModulo 
        ? { action, id: editingModulo.id, ...moduloForm, ativo: editingModulo.ativo }
        : { action, ...moduloForm };

      const { error } = await supabase.functions.invoke('videos-api', { body: payload });

      if (error) throw error;

      toast.success(editingModulo ? 'Módulo atualizado!' : 'Módulo criado!');
      setIsModuloDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving module:', error);
      toast.error('Erro ao salvar módulo');
    } finally {
      setIsSavingModulo(false);
    }
  };

  const toggleModuloAtivo = async (modulo: Modulo) => {
    try {
      await supabase.functions.invoke('videos-api', {
        body: { action: 'update-modulo', id: modulo.id, nome: modulo.nome, descricao: modulo.descricao, ordem: modulo.ordem, ativo: !modulo.ativo }
      });
      toast.success(modulo.ativo ? 'Módulo desativado' : 'Módulo ativado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar módulo');
    }
  };

  const deleteModulo = async (id: number) => {
    if (!confirm('Excluir este módulo? Todos os vídeos serão excluídos também.')) return;

    try {
      await supabase.functions.invoke('videos-api', { body: { action: 'delete-modulo', id } });
      toast.success('Módulo excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir módulo');
    }
  };

  // ========== VIDEO HANDLERS ==========
  
  const openVideoDialog = (video?: VideoItem, moduloId?: number) => {
    if (video) {
      setEditingVideo(video);
      setVideoForm({ 
        idModulo: video.idmodulo, 
        titulo: video.titulo, 
        descricao: video.descricao || '', 
        youtube_url: video.youtube_url, 
        ordem: video.ordem 
      });
    } else {
      setEditingVideo(null);
      const videosDoModulo = videos.filter(v => v.idmodulo === moduloId);
      setVideoForm({ 
        idModulo: moduloId || modulos[0]?.id || 0, 
        titulo: '', 
        descricao: '', 
        youtube_url: '', 
        ordem: videosDoModulo.length 
      });
    }
    setIsVideoDialogOpen(true);
  };

  const saveVideo = async () => {
    if (!videoForm.titulo.trim() || !videoForm.youtube_url.trim() || !videoForm.idModulo) {
      toast.error('Título, link do YouTube e módulo são obrigatórios');
      return;
    }

    setIsSavingVideo(true);
    try {
      const action = editingVideo ? 'update-video' : 'create-video';
      const payload = editingVideo 
        ? { action, id: editingVideo.id, ...videoForm, ativo: editingVideo.ativo }
        : { action, ...videoForm };

      const { error } = await supabase.functions.invoke('videos-api', { body: payload });

      if (error) throw error;

      toast.success(editingVideo ? 'Vídeo atualizado!' : 'Vídeo adicionado!');
      setIsVideoDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('Erro ao salvar vídeo');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const toggleVideoAtivo = async (video: VideoItem) => {
    try {
      await supabase.functions.invoke('videos-api', {
        body: { action: 'update-video', id: video.id, ...video, ativo: !video.ativo }
      });
      toast.success(video.ativo ? 'Vídeo desativado' : 'Vídeo ativado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar vídeo');
    }
  };

  const deleteVideo = async (id: number) => {
    if (!confirm('Excluir este vídeo?')) return;

    try {
      await supabase.functions.invoke('videos-api', { body: { action: 'delete-video', id } });
      toast.success('Vídeo excluído');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir vídeo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Gerenciar Vídeos</h2>
          <p className="text-sm text-slate-400">Organize módulos e vídeos tutoriais</p>
        </div>
        <Dialog open={isModuloDialogOpen} onOpenChange={setIsModuloDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openModuloDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Módulo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>{editingModulo ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Módulo</Label>
                <Input
                  value={moduloForm.nome}
                  onChange={(e) => setModuloForm({ ...moduloForm, nome: e.target.value })}
                  placeholder="Ex: Introdução"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={moduloForm.descricao}
                  onChange={(e) => setModuloForm({ ...moduloForm, descricao: e.target.value })}
                  placeholder="Descrição do módulo..."
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={moduloForm.ordem}
                  onChange={(e) => setModuloForm({ ...moduloForm, ordem: parseInt(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <Button onClick={saveModulo} disabled={isSavingModulo} className="w-full">
                {isSavingModulo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingModulo ? 'Salvar Alterações' : 'Criar Módulo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modules Accordion */}
      {modulos.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Nenhum módulo criado ainda</p>
            <p className="text-sm text-slate-500">Crie um módulo para começar a adicionar vídeos</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {modulos.map((modulo) => {
            const moduloVideos = videos.filter(v => v.idmodulo === modulo.id);
            return (
              <AccordionItem 
                key={modulo.id} 
                value={modulo.id.toString()}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-700/30">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="h-4 w-4 text-slate-500" />
                    <FolderOpen className={`h-5 w-5 ${modulo.ativo ? 'text-primary' : 'text-slate-500'}`} />
                    <div className="text-left flex-1">
                      <span className={`font-medium ${modulo.ativo ? 'text-white' : 'text-slate-500'}`}>
                        {modulo.nome}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({moduloVideos.length} vídeos)
                      </span>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch 
                        checked={modulo.ativo} 
                        onCheckedChange={() => toggleModuloAtivo(modulo)}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openModuloDialog(modulo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => deleteModulo(modulo.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {modulo.descricao && (
                    <p className="text-sm text-slate-400 mb-4">{modulo.descricao}</p>
                  )}
                  
                  <div className="space-y-2">
                    {moduloVideos.map((video) => (
                      <div 
                        key={video.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${video.ativo ? 'bg-slate-700/30 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}
                      >
                        <GripVertical className="h-4 w-4 text-slate-500" />
                        <Video className={`h-4 w-4 ${video.ativo ? 'text-red-500' : 'text-slate-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{video.titulo}</p>
                          <p className="text-xs text-slate-500 truncate">{video.youtube_url}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={video.ativo} 
                            onCheckedChange={() => toggleVideoAtivo(video)}
                          />
                          <Button size="icon" variant="ghost" onClick={() => { setAnexosVideoId(video.id); setAnexosVideoTitulo(video.titulo); }}>
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openVideoDialog(video)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteVideo(video.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-2 border-dashed border-slate-600 text-slate-400 hover:text-white"
                      onClick={() => openVideoDialog(undefined, modulo.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Vídeo
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Editar Vídeo' : 'Novo Vídeo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select 
                value={videoForm.idModulo.toString()} 
                onValueChange={(v) => setVideoForm({ ...videoForm, idModulo: parseInt(v) })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modulos.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título do Vídeo</Label>
              <Input
                value={videoForm.titulo}
                onChange={(e) => setVideoForm({ ...videoForm, titulo: e.target.value })}
                placeholder="Ex: Como criar uma lista"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do YouTube</Label>
              <Input
                value={videoForm.youtube_url}
                onChange={(e) => setVideoForm({ ...videoForm, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={videoForm.descricao}
                onChange={(e) => setVideoForm({ ...videoForm, descricao: e.target.value })}
                placeholder="Descrição do vídeo..."
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={videoForm.ordem}
                onChange={(e) => setVideoForm({ ...videoForm, ordem: parseInt(e.target.value) || 0 })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button onClick={saveVideo} disabled={isSavingVideo} className="w-full">
              {isSavingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingVideo ? 'Salvar Alterações' : 'Adicionar Vídeo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Anexos Manager */}
      <VideoAnexosManager
        videoId={anexosVideoId || 0}
        videoTitulo={anexosVideoTitulo}
        isOpen={anexosVideoId !== null}
        onClose={() => setAnexosVideoId(null)}
      />
    </div>
  );
}
