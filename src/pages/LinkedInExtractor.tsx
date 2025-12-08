import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Linkedin, Search, FileDown, Mail, User, Loader2, Users, Phone, Building2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppNavLink } from '@/components/AppNavLink';
import { supabase } from '@/integrations/supabase/client';
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
  const [segment, setSegment] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<LinkedInLead[]>([]);
  const [searchedSegment, setSearchedSegment] = useState('');

  const extractLeads = async () => {
    if (!segment.trim()) {
      toast({
        title: "Erro",
        description: "Digite o segmento que deseja buscar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSearchedSegment(segment);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-linkedin', {
        body: { 
          segment: segment.trim(),
          location: location.trim(),
          maxResults: parseInt(maxResults)
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setLeads(data.profiles || []);
      
      toast({
        title: "Extração concluída",
        description: `${data.profiles?.length || 0} perfis de "${segment}" encontrados`,
      });
    } catch (error) {
      console.error('Error extracting leads:', error);
      toast({
        title: "Erro na extração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
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
    
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 40 },
      { wch: 30 },
      { wch: 25 },
      { wch: 50 },
      { wch: 35 },
      { wch: 20 },
    ];

    XLSX.writeFile(workbook, `leads_linkedin_${searchedSegment.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const emailCount = leads.filter(l => l.email).length;
  const phoneCount = leads.filter(l => l.phone).length;
  const companyCount = leads.filter(l => l.company).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0A66C2] text-white">
                <Linkedin className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Extrator de Leads LinkedIn</h1>
                <p className="text-sm text-muted-foreground">Encontre profissionais por segmento/nicho</p>
              </div>
            </div>
            
            <nav className="flex gap-2">
              <AppNavLink to="/" icon="MapPin">Lugares</AppNavLink>
              <AppNavLink to="/instagram" icon="Instagram">Instagram</AppNavLink>
              <AppNavLink to="/linkedin" icon="Linkedin">LinkedIn</AppNavLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Buscar Profissionais
              </CardTitle>
              <CardDescription>
                Digite a profissão ou segmento para encontrar perfis do LinkedIn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="segment">Profissão/Segmento</Label>
                <Input
                  id="segment"
                  placeholder="Ex: advogado, desenvolvedor, marketing..."
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização (opcional)</Label>
                <Input
                  id="location"
                  placeholder="Ex: São Paulo, Brasília..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxResults">Quantidade de Resultados</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                className="w-full bg-[#0A66C2] hover:bg-[#004182]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando profissionais...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Profissionais
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resultados</CardTitle>
                  <CardDescription>
                    {leads.length > 0 
                      ? `${leads.length} perfis • ${emailCount} emails • ${phoneCount} telefones • ${companyCount} empresas`
                      : '0 leads extraídos'
                    }
                  </CardDescription>
                </div>
                {leads.length > 0 && (
                  <Button size="sm" onClick={downloadExcel}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Baixar Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {leads.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {leads.map((lead, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-[#0A66C2]/30 transition-colors"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] text-sm font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{lead.name}</span>
                        </div>
                        {lead.headline && (
                          <p className="text-xs text-muted-foreground truncate">{lead.headline}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Abrir perfil"
                        >
                          <Linkedin className="w-4 h-4 text-muted-foreground hover:text-[#0A66C2]" />
                        </a>
                        {lead.email && (
                          <a 
                            href={`mailto:${lead.email}`}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="Enviar email"
                          >
                            <Mail className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                        {lead.phone && (
                          <a 
                            href={`tel:${lead.phone.replace(/\D/g, '')}`}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                            title="Ligar"
                          >
                            <Phone className="w-4 h-4 text-muted-foreground hover:text-green-500" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Linkedin className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Digite um segmento e clique em buscar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default LinkedInExtractor;
