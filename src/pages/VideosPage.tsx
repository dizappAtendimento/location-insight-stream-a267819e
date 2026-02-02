import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Loader2, Play, BookOpen, GraduationCap, Star, MessageSquare, 
  FileText, Download, Send, Trash2, User, ExternalLink, PlayCircle, ChevronRight, ChevronDown, ChevronUp
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

const getGoogleDriveId = (url: string): string | null => {
  // Matches: /file/d/FILE_ID/view, /file/d/FILE_ID, or id=FILE_ID
  const regExp = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=|id=)([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const getLinkType = (url: string): 'youtube' | 'drive' | 'unknown' => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('drive.google.com')) return 'drive';
  return 'unknown';
};

export default function VideosPage() {
  const { user } = useAuth();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isMobileModulesOpen, setIsMobileModulesOpen] = useState(false);
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
        {/* Header - Compact on mobile */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 mb-2">
            <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <GraduationCap className="h-5 w-5 md:h-7 md:w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight">
                Central de Aprendizado
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                Domine todas as funcionalidades da plataforma
              </p>
            </div>
          </div>
          
          {/* Stats Bar - Hidden on mobile */}
          {!isLoading && modulos.length > 0 && (
            <div className="hidden sm:flex items-center gap-6 mt-4 flex-wrap">
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
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2 space-y-4 md:space-y-5 order-1">
              {selectedVideo ? (
                <>
                  {/* Video Player */}
                  <div className="relative group">
                    {/* Glow effect - hidden on mobile */}
                    <div className="hidden md:block absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                    
                    {/* Player container */}
                    <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-background to-muted/20 border border-border/50 shadow-xl md:shadow-2xl">
                      {/* Top bar with source indicator */}
                      <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 md:px-4 md:py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getLinkType(selectedVideo.youtube_url) === 'youtube' ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/20 backdrop-blur-sm border border-destructive/30">
                                <Play className="h-3 w-3 text-destructive fill-destructive" />
                                <span className="text-xs font-medium text-destructive">YouTube</span>
                              </div>
                            ) : getLinkType(selectedVideo.youtube_url) === 'drive' ? (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30">
                                <svg className="h-3 w-3 text-primary" viewBox="0 0 87.3 78" fill="currentColor">
                                  <path d="M6.6 66.85l14.45-25L35.5 66.85H6.6zm21.75-37.7L43.3 3h28.95L57.3 29.15H28.35zm50.6 37.7H49.5l14.45-25 29.45 0-14.45 25z"/>
                                </svg>
                                <span className="text-xs font-medium text-primary">Google Drive</span>
                              </div>
                            ) : null}
                          </div>
                          {selectedVideo.media_avaliacao > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 backdrop-blur-sm border border-warning/30">
                              <Star className="h-3 w-3 text-warning fill-warning" />
                              <span className="text-xs font-medium text-warning">{selectedVideo.media_avaliacao.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video area */}
                      <div className="aspect-video bg-black/95">
                        {(() => {
                          const linkType = getLinkType(selectedVideo.youtube_url);
                          const youtubeId = getYouTubeId(selectedVideo.youtube_url);
                          const driveId = getGoogleDriveId(selectedVideo.youtube_url);
                          
                          if (isPlaying) {
                            if (linkType === 'youtube' && youtubeId) {
                              return (
                                <iframe
                                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=0&fs=1&iv_load_policy=3&cc_load_policy=0`}
                                  title={selectedVideo.titulo}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              );
                            } else if (linkType === 'drive' && driveId) {
                              return (
                                <iframe
                                  src={`https://drive.google.com/file/d/${driveId}/preview`}
                                  title={selectedVideo.titulo}
                                  allow="autoplay; encrypted-media"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                              );
                            }
                          }
                          
                          // Premium thumbnail/play button
                          return (
                            <button
                              onClick={handlePlayClick}
                              className="w-full h-full relative group/play cursor-pointer overflow-hidden"
                            >
                              {linkType === 'youtube' && youtubeId ? (
                                <img
                                  src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                                  alt={selectedVideo.titulo}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover/play:scale-105"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                                  }}
                                />
                              ) : linkType === 'drive' ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background">
                                  <div className="text-center animate-fade-in">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-xl shadow-primary/10">
                                      <svg className="h-12 w-12 text-primary" viewBox="0 0 87.3 78" fill="currentColor">
                                        <path d="M6.6 66.85l14.45-25L35.5 66.85H6.6zm21.75-37.7L43.3 3h28.95L57.3 29.15H28.35zm50.6 37.7H49.5l14.45-25 29.45 0-14.45 25z"/>
                                        <path d="M43.65 66.85H6.6l14.45-25h37.05l-14.45 25zm-8.2-37.7L21.05 3h28.95l14.45 26.15H35.45z" opacity=".5"/>
                                      </svg>
                                    </div>
                                    <p className="text-muted-foreground text-sm font-medium">Vídeo do Google Drive</p>
                                    <p className="text-muted-foreground/60 text-xs mt-1">Clique para reproduzir</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background">
                                  <Play className="h-20 w-20 text-muted-foreground/30" />
                                </div>
                              )}
                              
                              {/* Gradient overlays */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
                              
                              {/* Premium play button */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                  {/* Pulse ring */}
                                  <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                                  {/* Button */}
                                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 group-hover/play:from-primary group-hover/play:to-primary/90 group-hover/play:scale-110 transition-all duration-300 flex items-center justify-center shadow-2xl shadow-primary/40 border-2 border-primary-foreground/20 backdrop-blur-sm">
                                    <Play className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground ml-1" fill="currentColor" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Bottom info bar */}
                              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                                <div className="flex items-end justify-between gap-4">
                                  <div className="flex-1">
                                    <h2 className="text-white text-lg md:text-xl font-bold drop-shadow-lg line-clamp-2">
                                      {selectedVideo.titulo}
                                    </h2>
                                    {selectedVideo.descricao && (
                                      <p className="text-white/70 text-sm mt-1 line-clamp-1 drop-shadow">
                                        {selectedVideo.descricao}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Video Info - Minimalist */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">{selectedVideo.titulo}</h2>
                    {selectedVideo.descricao && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedVideo.descricao}</p>
                    )}
                  </div>

                  {/* Rating Section - Minimalist */}
                  <div className="py-4 border-y border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Avaliação:</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedVideo.media_avaliacao)}
                          <span className="text-sm font-medium text-foreground">
                            {selectedVideo.media_avaliacao.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({selectedVideo.total_avaliacoes})
                          </span>
                        </div>
                      </div>
                      {user && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Sua nota:</span>
                          {renderStars(0, true, 'h-5 w-5')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Materials Section - Minimalist */}
                  {selectedVideo.anexos.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Materiais ({selectedVideo.anexos.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedVideo.anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={anexo.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                          >
                            <div className={`p-2 rounded-lg ${
                              isLink(anexo)
                                ? 'bg-link/10'
                                : 'bg-primary/10'
                            }`}>
                              {isLink(anexo) ? (
                                <ExternalLink className="h-4 w-4 text-link" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                {anexo.nome}
                              </p>
                              {anexo.descricao && (
                                <p className="text-xs text-muted-foreground truncate">{anexo.descricao}</p>
                              )}
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments Section - Minimalist */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comentários ({selectedVideo.total_comentarios})
                    </h3>
                    
                    {user ? (
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-xs">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva um comentário..."
                            className="bg-transparent border-border/50 resize-none text-sm min-h-[60px]"
                            rows={2}
                          />
                          <Button 
                            onClick={handleSendComment} 
                            disabled={!newComment.trim() || isSendingComment}
                            size="sm"
                            variant="outline"
                            className="gap-2"
                          >
                            {isSendingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Enviar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border/30 rounded-lg">
                        Faça login para comentar
                      </p>
                    )}

                    {isLoadingDetails ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : comentarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        Nenhum comentário ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {comentarios.map((comentario) => (
                          <div key={comentario.id} className="flex gap-3 group">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={comentario.user_avatar || undefined} />
                              <AvatarFallback className="bg-muted text-xs">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{comentario.user_nome || 'Usuário'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comentario.created_at), "dd/MM/yy", { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{comentario.comentario}</p>
                              {user?.id === comentario.user_id && (
                                <button
                                  onClick={() => handleDeleteComment(comentario.id)}
                                  className="text-xs text-destructive hover:underline mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
            <div className="space-y-3 md:space-y-4 order-2">
              {/* Mobile: Collapsible */}
              <div className="lg:hidden">
                <Collapsible open={isMobileModulesOpen} onOpenChange={setIsMobileModulesOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/30 hover:border-border/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Conteúdo do Curso</span>
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          {totalVideos} aulas
                        </span>
                      </div>
                      {isMobileModulesOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ScrollArea className="h-[300px] pr-2">
                      <Accordion type="multiple" defaultValue={modulos.map(m => m.id.toString())} className="space-y-2">
                        {modulos.map((modulo, moduleIndex) => (
                          <AccordionItem 
                            key={modulo.id} 
                            value={modulo.id.toString()}
                            className="bg-card/50 border border-border/30 rounded-xl overflow-hidden"
                          >
                            <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-xs font-bold text-primary">
                                  {moduleIndex + 1}
                                </div>
                                <span className="font-medium text-foreground text-sm">{modulo.nome}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2 pb-2">
                              <div className="space-y-1">
                                {modulo.videos.map((video, videoIndex) => (
                                  <button
                                    key={video.id}
                                    onClick={() => {
                                      setSelectedVideo(video);
                                      setIsMobileModulesOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                                      selectedVideo?.id === video.id 
                                        ? 'bg-primary/10 border border-primary/30' 
                                        : 'hover:bg-muted/30'
                                    }`}
                                  >
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
                                      selectedVideo?.id === video.id 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted/50 text-muted-foreground'
                                    }`}>
                                      {selectedVideo?.id === video.id ? (
                                        <Play className="h-3 w-3" fill="currentColor" />
                                      ) : (
                                        <span className="text-xs">{videoIndex + 1}</span>
                                      )}
                                    </div>
                                    <span className={`text-sm truncate flex-1 ${
                                      selectedVideo?.id === video.id 
                                        ? 'text-foreground font-medium' 
                                        : 'text-muted-foreground'
                                    }`}>
                                      {video.titulo}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Desktop: Always visible */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Conteúdo
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
