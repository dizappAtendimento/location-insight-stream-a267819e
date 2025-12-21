import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Linkedin, Search, FileDown, Mail, User, Loader2, Users, Phone, Building2, MapPin, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import * as XLSX from 'xlsx';

interface LinkedInLead {
  name: string;
  headline: string;
  profileLink: string;
  email: string;
  phone: string;
  company: string;
  location: string;
}

const LinkedInExtractor = () => {
  const { toast } = useToast();
  const { addRecord } = useExtractionHistory();
  const [segment, setSegment] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<LinkedInLead[]>([]);
  const [searchedSegment, setSearchedSegment] = useState('');

  const extractLeads = async () => {
    if (!segment.trim()) {
      toast({ title: "Erro", description: "Digite o segmento que deseja buscar", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setSearchedSegment(segment);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-linkedin', {
        body: { segment: segment.trim(), location: location.trim(), maxResults: parseInt(maxResults) }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const profiles = data.profiles || [];
      setLeads(profiles);
      
      addRecord({
        type: 'linkedin',
        segment: segment.trim(),
        location: location.trim() || undefined,
        totalResults: profiles.length,
        emailsFound: profiles.filter((p: LinkedInLead) => p.email).length,
        phonesFound: profiles.filter((p: LinkedInLead) => p.phone).length,
        results: profiles.map((p: LinkedInLead) => ({
          name: p.name,
          title: p.headline,
          company: p.company,
          location: p.location,
          email: p.email || undefined,
          phone: p.phone || undefined,
          link: p.profileLink,
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
      'Nome': lead.name,
      'Cargo/Título': lead.headline,
      'Empresa': lead.company,
      'Localização': lead.location,
      'Link do Perfil': lead.profileLink,
      'Email': lead.email || '',
      'Telefone': lead.phone || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads LinkedIn');
    worksheet['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 25 }, { wch: 50 }, { wch: 35 }, { wch: 20 }];
    XLSX.writeFile(workbook, `leads_linkedin_${searchedSegment.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const emailCount = leads.filter(l => l.email).length;
  const phoneCount = leads.filter(l => l.phone).length;
  const companyCount = leads.filter(l => l.company).length;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">LinkedIn Extractor</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Encontre profissionais por segmento</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Search Card */}
          <Card className="opacity-0 animate-fade-in-up overflow-hidden relative" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-[#0A66C2]" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0A66C2]" />
                Buscar Profissionais
              </CardTitle>
              <CardDescription>Digite a profissão ou segmento para encontrar perfis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/90">Profissão / Segmento</Label>
                <div className="relative group">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-linkedin" />
                  <Input
                    placeholder="Ex: advogado, desenvolvedor, marketing..."
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-linkedin/50 focus:bg-secondary/70 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/90">Localização (opcional)</Label>
                <div className="relative group">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-linkedin" />
                  <Input
                    placeholder="Ex: São Paulo, Brasília..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-linkedin/50 focus:bg-secondary/70 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/90">Quantidade de Resultados</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger className="h-11 bg-secondary/50 border-border/50 focus:border-linkedin/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="50">50 perfis</SelectItem>
                    <SelectItem value="100">100 perfis</SelectItem>
                    <SelectItem value="200">200 perfis</SelectItem>
                    <SelectItem value="500">500 perfis</SelectItem>
                    <SelectItem value="1000">1000 perfis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={extractLeads} 
                className="w-full h-11 bg-gradient-linkedin hover:opacity-90 shadow-lg shadow-linkedin/25 transition-all duration-300 hover:shadow-linkedin/40 hover:scale-[1.02]"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {isLoading ? 'Buscando profissionais...' : 'Iniciar Busca'}
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
                      <span className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-medium">
                          {leads.length} perfis
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {emailCount} emails
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                          {phoneCount} telefones
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                          {companyCount} empresas
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
                  {leads.map((lead, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:border-[#0A66C2]/30 hover:bg-secondary/50 transition-all duration-200"
                    >
                      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0A66C2] text-white text-sm font-bold shrink-0 shadow-sm">
                        {index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{lead.name}</span>
                        </div>
                        {lead.headline && (
                          <p className="text-xs text-muted-foreground truncate pl-5">{lead.headline}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground pl-5">
                          {lead.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{lead.company}</span>
                            </span>
                          )}
                          {lead.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">{lead.location}</span>
                            </span>
                          )}
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{lead.email}</span>
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a 
                          href={lead.profileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-[#0A66C2]/10 transition-colors"
                        >
                          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                        </a>
                        {lead.email && (
                          <a 
                            href={`mailto:${lead.email}`}
                            className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                          >
                            <Mail className="w-4 h-4 text-primary" />
                          </a>
                        )}
                        {lead.phone && (
                          <a 
                            href={`tel:${lead.phone.replace(/\D/g, '')}`}
                            className="p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                          >
                            <Phone className="w-4 h-4 text-emerald-500" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0A66C2]/10 flex items-center justify-center">
                    <Linkedin className="w-8 h-8 text-[#0A66C2]/50" />
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

export default LinkedInExtractor;