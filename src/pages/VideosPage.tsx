import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Loader2, Play, FolderOpen, Video, Star, MessageSquare, 
  FileText, Download, Send, Trash2, User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Anexo {
  id: number;
  nome: string;
  descricao: string | null;
  arquivo_url: string;
  tipo: string | null;
}

interface VideoItem {
  id: number;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
  ordem: number;
  anexos: Anexo[];
  media_avaliacao: number;
  total_avaliacoes: number;
  total_comentarios: number;
}

interface Modulo {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  videos: VideoItem[];
}

interface Comentario {
  id: number;
  user_id: string;
  user_nome: string | null;
  user_avatar: string | null;
  comentario: string;
  created_at: string;
}

const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function VideosPage() {
  const { user } = useAuth();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    setIsPlaying(false);
    if (selectedVideo) {
      loadVideoDetails(selectedVideo.id);
    }
  }, [selectedVideo?.id]);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'get-public-videos' }
      });

      if (!error && data?.modulos) {
        setModulos(data.modulos);
        if (data.modulos.length > 0 && data.modulos[0].videos?.length > 0) {
          setSelectedVideo(data.modulos[0].videos[0]);
        }
      }
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideoDetails = async (videoId: number) => {
    setIsLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'get-video-details', videoId }
      });

      if (!error) {
        setComentarios(data.comentarios || []);
        setUserRating(data.userRating);
      }
    } catch (error) {
      console.error('Error loading video details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const handleRating = async (nota: number) => {
    if (!user || !selectedVideo) {
      toast.error('Faça login para avaliar');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'rate-video', videoId: selectedVideo.id, userId: user.id, nota }
      });

      if (error) throw error;

      setUserRating(nota);
      toast.success('Avaliação enviada!');
      loadVideos();
    } catch (error) {
      toast.error('Erro ao avaliar');
    }
  };

  const handleSendComment = async () => {
    if (!user || !selectedVideo || !newComment.trim()) {
      toast.error('Escreva um comentário');
      return;
    }

    setIsSendingComment(true);
    try {
      const { data, error } = await supabase.functions.invoke('videos-api', {
        body: { 
          action: 'add-comment', 
          videoId: selectedVideo.id, 
          userId: user.id,
          userNome: user?.nome || user?.Email?.split('@')[0] || 'Usuário',
          userAvatar: user?.avatar_url,
          comentario: newComment.trim()
        }
      });

      if (error) throw error;

      setComentarios(prev => [data.comentario, ...prev]);
      setNewComment('');
      toast.success('Comentário adicionado!');
      loadVideos();
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'delete-comment', commentId, userId: user.id }
      });

      if (error) throw error;

      setComentarios(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comentário excluído');
      loadVideos();
    } catch (error) {
      toast.error('Erro ao excluir comentário');
    }
  };

  const totalVideos = modulos.reduce((acc, m) => acc + m.videos.length, 0);

  const renderStars = (rating: number, interactive = false, size = 'h-4 w-4') => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && handleRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star 
              className={`${size} ${
                star <= (interactive ? (hoverRating || userRating || 0) : rating) 
                  ? 'text-yellow-400 fill-yellow-400' 
                  : 'text-muted-foreground'
              }`} 
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Video className="h-7 w-7 text-primary" />
            Vídeos da Ferramenta
          </h1>
          <p className="text-muted-foreground mt-1">
            Aprenda a usar todas as funcionalidades do DizApp
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modulos.length === 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="py-16 text-center">
              <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Nenhum vídeo disponível ainda</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Novos conteúdos serão adicionados em breve</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {selectedVideo ? (
                <>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative">
                    {isPlaying && getYouTubeId(selectedVideo.youtube_url) ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(selectedVideo.youtube_url)}?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0&fs=1&iv_load_policy=3&cc_load_policy=0`}
                        title={selectedVideo.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <button
                        onClick={handlePlayClick}
                        className="w-full h-full relative group cursor-pointer"
                      >
                        {getYouTubeId(selectedVideo.youtube_url) && (
                          <img
                            src={`https://img.youtube.com/vi/${getYouTubeId(selectedVideo.youtube_url)}/maxresdefault.jpg`}
                            alt={selectedVideo.titulo}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://img.youtube.com/vi/${getYouTubeId(selectedVideo.youtube_url)}/hqdefault.jpg`;
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-primary/90 group-hover:bg-primary group-hover:scale-110 transition-all flex items-center justify-center shadow-xl">
                            <Play className="h-10 w-10 text-primary-foreground ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{selectedVideo.titulo}</h2>
                      {selectedVideo.descricao && (
                        <p className="text-muted-foreground mt-2">{selectedVideo.descricao}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-2">
                        {renderStars(selectedVideo.media_avaliacao)}
                        <span className="text-sm text-muted-foreground">
                          {selectedVideo.media_avaliacao.toFixed(1)} ({selectedVideo.total_avaliacoes} avaliações)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        {selectedVideo.total_comentarios} comentários
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="comments" className="mt-6">
                    <TabsList className="bg-card/50 border border-border">
                      <TabsTrigger value="comments" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Comentários
                      </TabsTrigger>
                      {selectedVideo.anexos.length > 0 && (
                        <TabsTrigger value="attachments" className="gap-2">
                          <FileText className="h-4 w-4" />
                          Anexos ({selectedVideo.anexos.length})
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="rating" className="gap-2">
                        <Star className="h-4 w-4" />
                        Avaliar
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="comments" className="mt-4 space-y-4">
                      {user ? (
                        <div className="flex gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.avatar_url || undefined} />
                            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Escreva um comentário..."
                              className="bg-card border-border resize-none"
                              rows={3}
                            />
                            <Button 
                              onClick={handleSendComment} 
                              disabled={!newComment.trim() || isSendingComment}
                              size="sm"
                              className="gap-2"
                            >
                              {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Enviar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Faça login para comentar
                        </p>
                      )}

                      {isLoadingDetails ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : comentarios.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum comentário ainda. Seja o primeiro!
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {comentarios.map((comentario) => (
                            <div key={comentario.id} className="flex gap-3 p-4 rounded-lg bg-card/50 border border-border">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={comentario.user_avatar || undefined} />
                                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">{comentario.user_nome || 'Usuário'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(comentario.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-1">{comentario.comentario}</p>
                                {user?.id === comentario.user_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comentario.id)}
                                    className="mt-2 text-destructive hover:text-destructive h-8 px-2"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Excluir
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="attachments" className="mt-4">
                      <div className="space-y-2">
                        {selectedVideo.anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{anexo.nome}</p>
                              {anexo.descricao && (
                                <p className="text-sm text-muted-foreground truncate">{anexo.descricao}</p>
                              )}
                            </div>
                            <Download className="h-5 w-5 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="rating" className="mt-4">
                      <Card className="bg-card/50 border-border">
                        <CardContent className="py-8 text-center">
                          {user ? (
                            <>
                              <p className="text-muted-foreground mb-4">
                                {userRating ? 'Você avaliou este vídeo com' : 'Clique nas estrelas para avaliar'}
                              </p>
                              <div className="flex justify-center">
                                {renderStars(0, true, 'h-8 w-8')}
                              </div>
                              {userRating && (
                                <p className="text-sm text-muted-foreground mt-4">
                                  Sua avaliação: {userRating} estrela{userRating > 1 ? 's' : ''}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-muted-foreground">
                              Faça login para avaliar este vídeo
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="aspect-video bg-card/50 rounded-xl flex items-center justify-center border border-border">
                  <p className="text-muted-foreground">Selecione um vídeo para assistir</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{totalVideos} vídeos disponíveis</span>
              </div>
              
              <Accordion type="multiple" defaultValue={modulos.map(m => m.id.toString())} className="space-y-2">
                {modulos.map((modulo) => (
                  <AccordionItem 
                    key={modulo.id} 
                    value={modulo.id.toString()}
                    className="bg-card/50 border border-border rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{modulo.nome}</span>
                        <span className="text-xs text-muted-foreground">({modulo.videos.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      <div className="space-y-1">
                        {modulo.videos.map((video) => (
                          <button
                            key={video.id}
                            onClick={() => setSelectedVideo(video)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                              selectedVideo?.id === video.id 
                                ? 'bg-primary/20 border border-primary/50' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-full ${selectedVideo?.id === video.id ? 'bg-primary' : 'bg-muted'}`}>
                              <Play className="h-3 w-3 text-primary-foreground" fill="currentColor" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm truncate block ${selectedVideo?.id === video.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {video.titulo}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {video.media_avaliacao > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-xs text-muted-foreground">{video.media_avaliacao.toFixed(1)}</span>
                                  </div>
                                )}
                                {video.total_comentarios > 0 && (
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{video.total_comentarios}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
