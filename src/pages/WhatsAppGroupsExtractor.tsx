import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileDown, Loader2, Users, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import * as XLSX from 'xlsx';

// Custom WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface WhatsAppGroup {
  name: string;
  link: string;
  description: string;
}

const WhatsAppGroupsExtractor = () => {
  const { toast } = useToast();
  const { addRecord } = useExtractionHistory();
  const [segment, setSegment] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [searchedSegment, setSearchedSegment] = useState('');

  const extractGroups = async () => {
    if (!segment.trim()) {
      toast({ title: "Erro", description: "Digite o segmento que deseja buscar", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSearchedSegment(segment);
    try {
      const { data, error } = await supabase.functions.invoke('search-whatsapp-groups', {
        body: { segment: segment.trim(), maxResults: parseInt(maxResults) }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      const foundGroups = data.groups || [];
      setGroups(foundGroups);
      addRecord({
        type: 'whatsapp-groups',
        segment: segment.trim(),
        totalResults: foundGroups.length,
        emailsFound: 0,
        phonesFound: 0,
      });
      toast({ title: "Extração concluída", description: `${foundGroups.length} grupos encontrados` });
    } catch (error) {
      toast({ title: "Erro na extração", description: error instanceof Error ? error.message : "Erro", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = () => {
    if (groups.length === 0) return;
    const data = groups.map(group => ({
      'Nome do Grupo': group.name,
      'Link': group.link,
      'Descrição': group.description || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos WhatsApp');
    XLSX.writeFile(workbook, `grupos_whatsapp_${searchedSegment.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-lg shadow-[#25D366]/20">
              <WhatsAppIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Grupos de WhatsApp</h1>
              <p className="text-muted-foreground text-sm">Encontre grupos por segmento e nicho</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Search Card */}
          <Card className="opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#25D366]" />
                Buscar Grupos
              </CardTitle>
              <CardDescription>Digite o segmento para encontrar grupos de WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Segmento / Nicho</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: marketing, vendas, empreendedores..." 
                    value={segment} 
                    onChange={(e) => setSegment(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && extractGroups()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantidade de Resultados</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 grupos</SelectItem>
                    <SelectItem value="100">100 grupos</SelectItem>
                    <SelectItem value="200">200 grupos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={extractGroups} 
                className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20BD5A] hover:to-[#0F7A6D] shadow-lg shadow-[#25D366]/20 transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isLoading ? 'Buscando grupos...' : 'Iniciar Busca'}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados</CardTitle>
                  <CardDescription>
                    {groups.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#25D366]/10 text-[#25D366] text-xs font-medium mt-1">
                        {groups.length} grupos encontrados
                      </span>
                    ) : '0 grupos encontrados'}
                  </CardDescription>
                </div>
                {groups.length > 0 && (
                  <Button size="sm" onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-700">
                    <FileDown className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                  {groups.map((group, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-[#25D366]/30 hover:bg-secondary/50 transition-all duration-200"
                    >
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white text-sm font-bold flex items-center justify-center shadow-sm">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                        )}
                      </div>
                      <a 
                        href={group.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-[#25D366]/10 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-[#25D366]" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/10 flex items-center justify-center">
                    <WhatsAppIcon className="w-8 h-8 text-[#25D366]/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum resultado ainda</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Digite um segmento e clique em buscar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppGroupsExtractor;
