import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Play, FolderOpen, Video } from 'lucide-react';

interface VideoItem {
  id: number;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
  ordem: number;
}

interface Modulo {
  id: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  videos: VideoItem[];
}

// Helper to extract YouTube video ID
const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function VideosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  // Reset playing state when video changes
  useEffect(() => {
    setIsPlaying(false);
  }, [selectedVideo?.id]);

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('videos-api', {
        body: { action: 'get-public-videos' }
      });

      if (!error && data?.modulos) {
        setModulos(data.modulos);
        // Auto-select first video
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

  const handlePlayClick = () => {
    setIsPlaying(true);
  };

  const totalVideos = modulos.reduce((acc, m) => acc + m.videos.length, 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
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
            {/* Video Player */}
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
                        {/* Thumbnail */}
                        {getYouTubeId(selectedVideo.youtube_url) && (
                          <img
                            src={`https://img.youtube.com/vi/${getYouTubeId(selectedVideo.youtube_url)}/maxresdefault.jpg`}
                            alt={selectedVideo.titulo}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to lower quality thumbnail if maxres doesn't exist
                              e.currentTarget.src = `https://img.youtube.com/vi/${getYouTubeId(selectedVideo.youtube_url)}/hqdefault.jpg`;
                            }}
                          />
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
                        
                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-primary/90 group-hover:bg-primary group-hover:scale-110 transition-all flex items-center justify-center shadow-xl">
                            <Play className="h-10 w-10 text-primary-foreground ml-1" fill="currentColor" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedVideo.titulo}</h2>
                    {selectedVideo.descricao && (
                      <p className="text-muted-foreground mt-2">{selectedVideo.descricao}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-card/50 rounded-xl flex items-center justify-center border border-border">
                  <p className="text-muted-foreground">Selecione um vídeo para assistir</p>
                </div>
              )}
            </div>

            {/* Video List */}
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
                            <span className={`text-sm truncate ${selectedVideo?.id === video.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {video.titulo}
                            </span>
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
