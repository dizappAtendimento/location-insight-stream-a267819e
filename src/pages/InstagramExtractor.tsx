import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Search, FileDown, Mail, Loader2, Phone, MapPin, Users, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import * as XLSX from 'xlsx';

interface InstagramLead {
  username: string;
  profileLink: string;
  email: string;
  phone: string;
  bioLink: string;
}

const InstagramExtractor = () => {
  const { toast } = useToast();
  const { addRecord } = useExtractionHistory();
  const [segment, setSegment] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const [searchedSegment, setSearchedSegment] = useState('');

  const extractLeads = async () => {
    if (!segment.trim()) {
      toast({ title: "Erro", description: "Digite o segmento que deseja buscar", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSearchedSegment(segment);
    try {
      const { data, error } = await supabase.functions.invoke('search-instagram', {
        body: { segment: segment.trim(), location: location.trim(), maxResults: parseInt(maxResults) }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      const profiles = data.profiles || [];
      setLeads(profiles);
      addRecord({
        type: 'instagram', segment: segment.trim(), location: location.trim() || undefined,
        totalResults: profiles.length,
        emailsFound: profiles.filter((p: InstagramLead) => p.email).length,
        phonesFound: profiles.filter((p: InstagramLead) => p.phone).length,
        results: profiles.map((p: InstagramLead) => ({
          name: p.username,
          username: p.username,
          email: p.email || undefined,
          phone: p.phone || undefined,
          link: p.profileLink,
          bio: p.bioLink || undefined,
        })),
      });
      toast({ title: "Extração concluída", description: `${profiles.length} perfis encontrados` });
    } catch (error) {
      toast({ title: "Erro na extração", description: error instanceof Error ? error.message : "Erro", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = () => {
    if (leads.length === 0) return;
    const data = leads.map(lead => ({
      'Username': lead.username, 'Link do Perfil': lead.profileLink, 'Email': lead.email || '',
      'Telefone': lead.phone || '', 'Link da Bio': lead.bioLink || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Instagram');
    XLSX.writeFile(workbook, `leads_instagram_${searchedSegment.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const emailCount = leads.filter(l => l.email).length;
  const phoneCount = leads.filter(l => l.phone).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/20">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Instagram Extractor</h1>
              <p className="text-muted-foreground text-sm">Encontre perfis por segmento e nicho</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Search Card */}
          <Card className="opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                Buscar Perfis
              </CardTitle>
              <CardDescription>Digite o segmento para encontrar perfis do Instagram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Segmento / Nicho</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: mecanica, dentista, restaurante..." 
                    value={segment} 
                    onChange={(e) => setSegment(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Localização (opcional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: São Paulo, Rio de Janeiro..." 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantidade de Resultados</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 perfis</SelectItem>
                    <SelectItem value="100">100 perfis</SelectItem>
                    <SelectItem value="200">200 perfis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={extractLeads} 
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-pink-500/20 transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isLoading ? 'Buscando perfis...' : 'Iniciar Busca'}
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
                    {leads.length > 0 ? (
                      <span className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 text-xs font-medium">
                          {leads.length} perfis
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {emailCount} emails
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                          {phoneCount} telefones
                        </span>
                      </span>
                    ) : '0 leads extraídos'}
                  </CardDescription>
                </div>
                {leads.length > 0 && (
                  <Button size="sm" onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-700">
                    <FileDown className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {leads.length > 0 ? (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                  {leads.map((lead, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-pink-500/30 hover:bg-secondary/50 transition-all duration-200"
                    >
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center shadow-sm">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">@{lead.username}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {lead.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />{lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />{lead.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <a 
                        href={lead.profileLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-pink-500/10 transition-colors"
                      >
                        <Instagram className="w-4 h-4 text-pink-500" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-pink-500/50" />
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

export default InstagramExtractor;