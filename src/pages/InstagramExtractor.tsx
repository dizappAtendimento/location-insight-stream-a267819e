import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Search, FileDown, Mail, User, Loader2, Phone, ExternalLink } from 'lucide-react';
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Instagram className="w-6 h-6 text-pink-500" />
            Extrator de Leads Instagram
          </h1>
          <p className="text-muted-foreground">Encontre perfis por segmento/nicho</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Buscar Perfis</CardTitle>
              <CardDescription>Digite o segmento para encontrar perfis do Instagram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Segmento/Nicho</Label>
                <Input placeholder="Ex: mecanica, dentista..." value={segment} onChange={(e) => setSegment(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Localização (opcional)</Label>
                <Input placeholder="Ex: São Paulo..." value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={extractLeads} className="w-full bg-gradient-to-r from-pink-500 to-purple-500" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isLoading ? 'Buscando...' : 'Buscar'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados</CardTitle>
                  <CardDescription>{leads.length} perfis • {emailCount} emails • {phoneCount} telefones</CardDescription>
                </div>
                {leads.length > 0 && <Button size="sm" onClick={downloadExcel}><FileDown className="w-4 h-4 mr-2" />Excel</Button>}
              </div>
            </CardHeader>
            <CardContent>
              {leads.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {leads.map((lead, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                      <span className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-500 text-sm font-bold flex items-center justify-center">{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">@{lead.username}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                        </div>
                      </div>
                      <a href={lead.profileLink} target="_blank" rel="noopener noreferrer"><Instagram className="w-4 h-4" /></a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Instagram className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>Digite um segmento e busque</p></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InstagramExtractor;
