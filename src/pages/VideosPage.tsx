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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Loader2, Play, BookOpen, GraduationCap, Star, MessageSquare, 
  FileText, Download, Send, Trash2, User, ExternalLink, PlayCircle,
  Clock, Users, Award, ChevronRight
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
              className={`${size} transition-colors ${
                star <= (interactive ? (hoverRating || userRating || 0) : rating) 
                  ? 'text-warning fill-warning' 
                  : 'text-muted-foreground/30'
              }`} 
            />
          </button>
        ))}
      </div>
    );
  };

  const isLink = (anexo: Anexo) => anexo.tipo === 'link' || !anexo.tipo;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Central de Aprendizado
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Domine todas as funcionalidades da plataforma
              </p>
            </div>
          </div>
          
          {/* Stats Bar */}
          {!isLoading && modulos.length > 0 && (
            <div className="flex items-center gap-6 mt-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <span className="text-muted-foreground">{modulos.length} módulos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <PlayCircle className="h-4 w-4 text-success" />
                </div>
                <span className="text-muted-foreground">{totalVideos} vídeos</span>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">Carregando conteúdo...</p>
          </div>
        ) : modulos.length === 0 ? (
          <Card className="premium-card">
            <CardContent className="py-20 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-transparent w-fit mx-auto mb-4">
                <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">Nenhum conteúdo disponível</p>
              <p className="text-sm text-muted-foreground mt-1">Novos vídeos serão adicionados em breve</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2 space-y-5">
              {selectedVideo ? (
                <>
                  {/* Video Player */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-border/50">
                    <div className="aspect-video bg-black">
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-all duration-300" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-primary/95 backdrop-blur-sm group-hover:bg-primary group-hover:scale-110 transition-all duration-300 flex items-center justify-center shadow-2xl shadow-primary/30 border border-primary-foreground/20">
                              <Play className="h-9 w-9 text-primary-foreground ml-1" fill="currentColor" />
                            </div>
                          </div>
                          {/* Video title overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                            <h2 className="text-white text-lg md:text-xl font-semibold drop-shadow-lg line-clamp-2">
                              {selectedVideo.titulo}
                            </h2>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{selectedVideo.titulo}</h2>
                      {selectedVideo.descricao && (
                        <p className="text-muted-foreground mt-2 leading-relaxed">{selectedVideo.descricao}</p>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
                        {renderStars(selectedVideo.media_avaliacao)}
                        <span className="text-sm font-medium text-warning">
                          {selectedVideo.media_avaliacao.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({selectedVideo.total_avaliacoes})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {selectedVideo.total_comentarios} comentários
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs Section */}
                  <Tabs defaultValue="comments" className="mt-6">
                    <TabsList className="bg-muted/30 p-1 rounded-xl border border-border/30 w-full md:w-auto">
                      <TabsTrigger 
                        value="comments" 
                        className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Comentários</span>
                        <span className="sm:hidden">Chat</span>
                      </TabsTrigger>
                      {selectedVideo.anexos.length > 0 && (
                        <TabsTrigger 
                          value="attachments" 
                          className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">Materiais</span>
                          <span className="sm:hidden">Docs</span>
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {selectedVideo.anexos.length}
                          </span>
                        </TabsTrigger>
                      )}
                      <TabsTrigger 
                        value="rating" 
                        className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
                      >
                        <Star className="h-4 w-4" />
                        Avaliar
                      </TabsTrigger>
                    </TabsList>

                    {/* Comments Tab */}
                    <TabsContent value="comments" className="mt-4 space-y-4">
                      {user ? (
                        <div className="flex gap-3 p-4 rounded-xl bg-gradient-to-r from-muted/30 to-transparent border border-border/30">
                          <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarImage src={user?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-3">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Compartilhe sua opinião sobre este vídeo..."
                              className="bg-card/50 border-border/50 resize-none focus:border-primary/50 transition-colors"
                              rows={3}
                            />
                            <Button 
                              onClick={handleSendComment} 
                              disabled={!newComment.trim() || isSendingComment}
                              size="sm"
                              className="gap-2 shadow-lg shadow-primary/20"
                            >
                              {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              Publicar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 rounded-xl border border-dashed border-border/50 bg-muted/10">
                          <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Faça login para comentar</p>
                        </div>
                      )}

                      {isLoadingDetails ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : comentarios.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border border-dashed border-border/50 bg-muted/10">
                          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-muted-foreground">Nenhum comentário ainda</p>
                          <p className="text-sm text-muted-foreground/70 mt-1">Seja o primeiro a comentar!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {comentarios.map((comentario) => (
                            <div 
                              key={comentario.id} 
                              className="group flex gap-3 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-border/50 transition-colors"
                            >
                              <Avatar className="h-10 w-10 border border-border/50">
                                <AvatarImage src={comentario.user_avatar || undefined} />
                                <AvatarFallback className="bg-muted">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">{comentario.user_nome || 'Usuário'}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(comentario.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-1 leading-relaxed">{comentario.comentario}</p>
                                {user?.id === comentario.user_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(comentario.id)}
                                    className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
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

                    {/* Attachments Tab */}
                    <TabsContent value="attachments" className="mt-4">
                      <div className="space-y-2">
                        {selectedVideo.anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                          >
                            <div className={`p-3 rounded-xl shadow-sm ${
                              isLink(anexo)
                                ? 'bg-gradient-to-br from-link/20 to-link/5 border border-link/20'
                                : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20'
                            }`}>
                              {isLink(anexo) ? (
                                <ExternalLink className="h-5 w-5 text-link" />
                              ) : (
                                <FileText className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {anexo.nome}
                              </p>
                              {anexo.descricao && (
                                <p className="text-sm text-muted-foreground truncate mt-0.5">{anexo.descricao}</p>
                              )}
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
                              <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </TabsContent>

                    {/* Rating Tab */}
                    <TabsContent value="rating" className="mt-4">
                      <Card className="bg-gradient-to-br from-card to-card/50 border-border/30">
                        <CardContent className="py-10 text-center">
                          {user ? (
                            <div className="space-y-4">
                              <div className="p-3 rounded-2xl bg-warning/10 w-fit mx-auto">
                                <Award className="h-8 w-8 text-warning" />
                              </div>
                              <p className="text-muted-foreground">
                                {userRating ? 'Você avaliou este vídeo' : 'Avalie este conteúdo'}
                              </p>
                              <div className="flex justify-center py-2">
                                {renderStars(0, true, 'h-10 w-10')}
                              </div>
                              {userRating && (
                                <p className="text-sm text-muted-foreground">
                                  Sua avaliação: <span className="font-medium text-warning">{userRating} estrela{userRating > 1 ? 's' : ''}</span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Award className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                              <p className="text-muted-foreground">Faça login para avaliar</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <div className="aspect-video rounded-2xl flex items-center justify-center border-2 border-dashed border-border/50 bg-muted/10">
                  <div className="text-center">
                    <PlayCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground">Selecione um vídeo para começar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Course Modules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Conteúdo do Curso
                </h3>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  {totalVideos} aulas
                </span>
              </div>
              
              <ScrollArea className="h-[calc(100vh-280px)] pr-2">
                <Accordion type="multiple" defaultValue={modulos.map(m => m.id.toString())} className="space-y-2">
                  {modulos.map((modulo, moduleIndex) => (
                    <AccordionItem 
                      key={modulo.id} 
                      value={modulo.id.toString()}
                      className="bg-card/50 border border-border/30 rounded-xl overflow-hidden hover:border-border/50 transition-colors"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-xs font-bold text-primary">
                            {moduleIndex + 1}
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-foreground text-sm">{modulo.nome}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {modulo.videos.length} {modulo.videos.length === 1 ? 'aula' : 'aulas'}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pb-2">
                        <div className="space-y-1">
                          {modulo.videos.map((video, videoIndex) => (
                            <button
                              key={video.id}
                              onClick={() => setSelectedVideo(video)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                                selectedVideo?.id === video.id 
                                  ? 'bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 shadow-sm' 
                                  : 'hover:bg-muted/30 border border-transparent'
                              }`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                selectedVideo?.id === video.id 
                                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                                  : 'bg-muted/50 text-muted-foreground'
                              }`}>
                                {selectedVideo?.id === video.id ? (
                                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                                ) : (
                                  <span className="text-xs font-medium">{videoIndex + 1}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm truncate block transition-colors ${
                                  selectedVideo?.id === video.id 
                                    ? 'text-foreground font-medium' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {video.titulo}
                                </span>
                                <div className="flex items-center gap-3 mt-1">
                                  {video.media_avaliacao > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 text-warning fill-warning" />
                                      <span className="text-xs text-muted-foreground">{video.media_avaliacao.toFixed(1)}</span>
                                    </div>
                                  )}
                                  {video.total_comentarios > 0 && (
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3 text-muted-foreground/70" />
                                      <span className="text-xs text-muted-foreground">{video.total_comentarios}</span>
                                    </div>
                                  )}
                                  {video.anexos.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <FileText className="h-3 w-3 text-muted-foreground/70" />
                                      <span className="text-xs text-muted-foreground">{video.anexos.length}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedVideo?.id === video.id && (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
