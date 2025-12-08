import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Search, FileDown, Link2, Mail, User, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppNavLink } from '@/components/AppNavLink';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface InstagramLead {
  username: string;
  profileId: string;
  profileLink: string;
  email: string;
  bio?: string;
}

const InstagramExtractor = () => {
  const { toast } = useToast();
  const [targetUsername, setTargetUsername] = useState('');
  const [maxResults, setMaxResults] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<InstagramLead[]>([]);
  const [extractedFrom, setExtractedFrom] = useState('');

  const extractLeads = async () => {
    if (!targetUsername.trim()) {
      toast({
        title: "Erro",
        description: "Digite o username do perfil",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setExtractedFrom(targetUsername.replace('@', ''));
    
    try {
      const { data, error } = await supabase.functions.invoke('search-instagram', {
        body: { 
          username: targetUsername.replace('@', ''),
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
        description: `${data.profiles?.length || 0} perfis encontrados relacionados a @${targetUsername.replace('@', '')}`,
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
      'Username': lead.username,
      'ID do Perfil': lead.profileId,
      'Link do Perfil': lead.profileLink,
      'Email': lead.email,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Instagram');
    
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 45 },
      { wch: 35 },
    ];

    XLSX.writeFile(workbook, `leads_instagram_${extractedFrom}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                <Instagram className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Extrator de Leads Instagram</h1>
                <p className="text-sm text-muted-foreground">Extraia seguidores de um perfil</p>
              </div>
            </div>
            
            <nav className="flex gap-2">
              <AppNavLink to="/" icon="MapPin">Buscador de Lugares</AppNavLink>
              <AppNavLink to="/instagram" icon="Instagram">Instagram</AppNavLink>
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
                Extrair Seguidores
              </CardTitle>
              <CardDescription>
                Digite o username do perfil para extrair seus seguidores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetUsername">Username do Perfil</Label>
                <Input
                  id="targetUsername"
                  placeholder="@perfil_alvo"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxResults">Quantidade de Seguidores</Label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 seguidores</SelectItem>
                    <SelectItem value="100">100 seguidores</SelectItem>
                    <SelectItem value="200">200 seguidores</SelectItem>
                    <SelectItem value="500">500 seguidores</SelectItem>
                    <SelectItem value="1000">1000 seguidores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={extractLeads} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extraindo seguidores...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Extrair Seguidores
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
                      ? `${leads.length} seguidores de @${extractedFrom}`
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
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                        {index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0 grid gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium truncate">@{lead.username}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>ID: {lead.profileId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={lead.profileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Abrir perfil"
                        >
                          <Link2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Instagram className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    Digite um perfil e clique em extrair
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

export default InstagramExtractor;
