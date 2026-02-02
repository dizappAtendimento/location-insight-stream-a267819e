import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Play, FolderOpen, Video, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    loadVideos();
  }, []);

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

  const totalVideos = modulos.reduce((acc, m) => acc + m.videos.length, 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Video className="h-7 w-7 text-red-500" />
            Vídeos da Ferramenta
          </h1>
          <p className="text-slate-400 mt-1">
            Aprenda a usar todas as funcionalidades do DizApp
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : modulos.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-16 text-center">
              <Video className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <p className="text-lg text-slate-400">Nenhum vídeo disponível ainda</p>
              <p className="text-sm text-slate-500 mt-1">Novos conteúdos serão adicionados em breve</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-4">
              {selectedVideo ? (
                <>
                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                    {getYouTubeId(selectedVideo.youtube_url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(selectedVideo.youtube_url)}?rel=0`}
                        title={selectedVideo.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <a 
                          href={selectedVideo.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-red-500 hover:text-red-400"
                        >
                          <ExternalLink className="h-5 w-5" />
                          Abrir no YouTube
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{selectedVideo.titulo}</h2>
                    {selectedVideo.descricao && (
                      <p className="text-slate-400 mt-2">{selectedVideo.descricao}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-slate-800/50 rounded-xl flex items-center justify-center border border-slate-700">
                  <p className="text-slate-500">Selecione um vídeo para assistir</p>
                </div>
              )}
            </div>

            {/* Video List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{totalVideos} vídeos disponíveis</span>
              </div>
              
              <Accordion type="multiple" defaultValue={modulos.map(m => m.id.toString())} className="space-y-2">
                {modulos.map((modulo) => (
                  <AccordionItem 
                    key={modulo.id} 
                    value={modulo.id.toString()}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-700/30">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        <span className="font-medium text-white">{modulo.nome}</span>
                        <span className="text-xs text-slate-500">({modulo.videos.length})</span>
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
                                : 'hover:bg-slate-700/50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-full ${selectedVideo?.id === video.id ? 'bg-red-500' : 'bg-slate-600'}`}>
                              <Play className="h-3 w-3 text-white" fill="white" />
                            </div>
                            <span className={`text-sm truncate ${selectedVideo?.id === video.id ? 'text-white font-medium' : 'text-slate-300'}`}>
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
