import { useState } from 'react';
import { Building2, Search, Download, Loader2, MapPin, Phone, Mail, Users, FileSpreadsheet, AlertCircle, Filter, Calendar, Briefcase, Scale, DollarSign, Globe, Hash, X, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
interface Socio {
  nome: string;
  cpfCnpj: string;
  qualificacao: string;
  dataEntrada: string;
}

interface AtividadeSecundaria {
  codigo: number;
  descricao: string;
}

interface Empresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  dataAbertura: string;
  dataSituacao: string;
  atividadePrincipal: string;
  codigoCnae: number;
  atividadesSecundarias: AtividadeSecundaria[];
  naturezaJuridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  endereco: string;
  telefone: string;
  telefone2: string;
  email: string;
  capitalSocial: number;
  porte: string;
  simples: boolean;
  mei: boolean;
  uf: string;
  cidade: string;
  socios: string[];
  qsa: Socio[];
}

const UF_OPTIONS = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const PORTE_OPTIONS = [
  { value: 'all', label: 'Todos os portes' },
  { value: 'MEI', label: 'MEI' },
  { value: 'ME', label: 'Microempresa' },
  { value: 'EPP', label: 'Empresa de Pequeno Porte' },
  { value: 'MEDIO', label: 'Médio Porte' },
  { value: 'GRANDE', label: 'Grande Porte' },
];

export default function CNPJExtractor() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estados para busca por nome
  const [query, setQuery] = useState('');
  const [uf, setUf] = useState('all');
  const [maxResults, setMaxResults] = useState('50');
  const [porteFilter, setPorteFilter] = useState('all');
  const [simplesFilter, setSimplesFilter] = useState<string>('all');
  
  // Estados para busca por CNPJ
  const [cnpjInput, setCnpjInput] = useState('');
  
  // Estados gerais
  const [isLoading, setIsLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: `${label} copiado para a área de transferência` });
  };
  const searchByName = async () => {
    if (!query.trim()) {
      toast({ title: 'Erro', description: 'Digite o segmento ou nome da empresa', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setEmpresas([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-cnpj', {
        body: { 
          action: 'search',
          query: query.trim(),
          uf: uf === 'all' ? undefined : uf,
          maxResults: parseInt(maxResults),
          userId: user?.id
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      let results = data.empresas || [];
      
      // Aplicar filtros locais
      if (porteFilter && porteFilter !== 'all') {
        results = results.filter((e: Empresa) => {
          if (porteFilter === 'MEI') return e.mei;
          if (porteFilter === 'ME') return e.porte?.includes('MICRO');
          if (porteFilter === 'EPP') return e.porte?.includes('PEQUENO');
          if (porteFilter === 'MEDIO') return e.porte?.includes('MÉDIO') || e.porte?.includes('MEDIO');
          if (porteFilter === 'GRANDE') return e.porte?.includes('GRANDE');
          return true;
        });
      }
      
      if (simplesFilter === 'sim') {
        results = results.filter((e: Empresa) => e.simples);
      } else if (simplesFilter === 'nao') {
        results = results.filter((e: Empresa) => !e.simples);
      }

      setEmpresas(results);
      toast({ title: 'Busca concluída', description: `${results.length} empresas encontradas` });
    } catch (error) {
      toast({ 
        title: 'Erro na busca', 
        description: error instanceof Error ? error.message : 'Erro desconhecido', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchByCNPJ = async () => {
    const cleanCNPJ = cnpjInput.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      toast({ title: 'Erro', description: 'CNPJ deve ter 14 dígitos', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setEmpresas([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-cnpj', {
        body: { 
          action: 'fetch-cnpj',
          cnpj: cleanCNPJ,
          userId: user?.id
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      if (data.empresa) {
        setEmpresas([data.empresa]);
        toast({ title: 'Empresa encontrada', description: data.empresa.razaoSocial });
      }
    } catch (error) {
      toast({ 
        title: 'Erro na consulta', 
        description: error instanceof Error ? error.message : 'CNPJ não encontrado', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const downloadExcel = () => {
    if (empresas.length === 0) {
      toast({ title: 'Erro', description: 'Nenhuma empresa para exportar', variant: 'destructive' });
      return;
    }

    const data = empresas.map(e => ({
      'CNPJ': e.cnpj,
      'Razão Social': e.razaoSocial,
      'Nome Fantasia': e.nomeFantasia,
      'Situação': e.situacao,
      'Data Abertura': e.dataAbertura,
      'Atividade Principal': e.atividadePrincipal,
      'Natureza Jurídica': e.naturezaJuridica,
      'Endereço': e.endereco,
      'UF': e.uf,
      'Cidade': e.cidade,
      'Telefone': e.telefone,
      'Telefone 2': e.telefone2,
      'E-mail': e.email,
      'Capital Social': e.capitalSocial,
      'Porte': e.porte,
      'Simples Nacional': e.simples ? 'Sim' : 'Não',
      'MEI': e.mei ? 'Sim' : 'Não',
      'Sócios': e.socios?.join('; ') || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    XLSX.writeFile(wb, `empresas_cnpj_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Download iniciado', description: 'Arquivo Excel gerado com sucesso' });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-7 h-7 text-amber-500" />
              Extrator de CNPJ
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Consulte dados de empresas brasileiras pela Receita Federal
            </p>
          </div>
          {empresas.length > 0 && (
            <Button onClick={downloadExcel} variant="outline" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </Button>
          )}
        </div>

        {/* Tabs de busca */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="search" className="gap-2">
                  <Search className="w-4 h-4" />
                  Buscar por Segmento
                </TabsTrigger>
                <TabsTrigger value="cnpj" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  Consultar CNPJ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Segmento / Nome da empresa</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Ex: restaurante, advocacia..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-10"
                        onKeyDown={(e) => e.key === 'Enter' && searchByName()}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Select value={uf} onValueChange={setUf}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {UF_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade máxima</Label>
                    <Select value={maxResults} onValueChange={setMaxResults}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 resultados</SelectItem>
                        <SelectItem value="50">50 resultados</SelectItem>
                        <SelectItem value="100">100 resultados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={searchByName} 
                      disabled={isLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Buscar Empresas
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Filtros avançados */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtros:</span>
                  </div>
                  
                  <Select value={porteFilter} onValueChange={setPorteFilter}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Porte da empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={simplesFilter} onValueChange={setSimplesFilter}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Simples Nacional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sim">Optante Simples</SelectItem>
                      <SelectItem value="nao">Não optante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="cnpj" className="space-y-4">
                <div className="flex gap-4 max-w-xl">
                  <div className="flex-1 space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={cnpjInput}
                      onChange={(e) => setCnpjInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchByCNPJ()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={searchByCNPJ} 
                      disabled={isLoading}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Consultar'
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Resultados */}
        {empresas.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Resultados ({empresas.length} empresas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {empresas.map((empresa, index) => (
                    <Card 
                      key={index} 
                      className="border-border/30 bg-secondary/20 overflow-hidden transition-all duration-200 hover:border-amber-500/30 cursor-pointer"
                      onClick={() => setSelectedEmpresa(empresa)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">
                                {empresa.nomeFantasia || empresa.razaoSocial}
                              </h3>
                              <Badge 
                                variant={empresa.situacao === 'ATIVA' ? 'default' : 'destructive'} 
                                className={`text-xs ${empresa.situacao === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}`}
                              >
                                {empresa.situacao === 'ATIVA' ? (
                                  <><CheckCircle2 className="w-3 h-3 mr-1" />{empresa.situacao}</>
                                ) : (
                                  <><XCircle className="w-3 h-3 mr-1" />{empresa.situacao}</>
                                )}
                              </Badge>
                              {empresa.simples && (
                                <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/50">
                                  Simples
                                </Badge>
                              )}
                              {empresa.mei && (
                                <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/50">
                                  MEI
                                </Badge>
                              )}
                            </div>
                            {empresa.nomeFantasia && (
                              <p className="text-sm text-muted-foreground mt-0.5">{empresa.razaoSocial}</p>
                            )}
                            <p className="text-sm font-mono text-muted-foreground mt-1">{empresa.cnpj}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{empresa.porte}</p>
                            <p className="font-medium text-amber-400">{formatCurrency(empresa.capitalSocial)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                          {empresa.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {empresa.telefone}
                            </span>
                          )}
                          {empresa.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {empresa.email}
                            </span>
                          )}
                          {empresa.cidade && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {empresa.cidade}/{empresa.uf}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Estado vazio */}
        {!isLoading && empresas.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'search' 
                  ? 'Busque empresas por segmento ou nome para visualizar os resultados'
                  : 'Digite um CNPJ para consultar os dados da empresa'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de detalhes da empresa */}
        <Dialog open={!!selectedEmpresa} onOpenChange={() => setSelectedEmpresa(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedEmpresa && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div>
                      <DialogTitle className="text-xl">
                        {selectedEmpresa.nomeFantasia || selectedEmpresa.razaoSocial}
                      </DialogTitle>
                      {selectedEmpresa.nomeFantasia && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedEmpresa.razaoSocial}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={selectedEmpresa.situacao === 'ATIVA' ? 'default' : 'destructive'}
                        className={`${selectedEmpresa.situacao === 'ATIVA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
                      >
                        {selectedEmpresa.situacao === 'ATIVA' ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" />ATIVA</>
                        ) : (
                          <><XCircle className="w-3 h-3 mr-1" />{selectedEmpresa.situacao}</>
                        )}
                      </Badge>
                      {selectedEmpresa.dataSituacao && (
                        <span className="text-xs text-muted-foreground">
                          desde {selectedEmpresa.dataSituacao}
                        </span>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Status e Badges */}
                  <div className="flex flex-wrap gap-2">
                    {selectedEmpresa.simples && (
                      <Badge variant="outline" className="text-emerald-400 border-emerald-400/50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Optante Simples Nacional
                      </Badge>
                    )}
                    {selectedEmpresa.mei && (
                      <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        MEI
                      </Badge>
                    )}
                    {!selectedEmpresa.simples && (
                      <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        Não optante Simples
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                      {selectedEmpresa.porte}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Dados da Empresa */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        Dados da Empresa
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">CNPJ:</span>
                            <span className="font-mono font-medium">{selectedEmpresa.cnpj}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedEmpresa.cnpj, 'CNPJ'); }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                            <span className="font-medium text-foreground">Atividade Principal:</span>
                          </div>
                          <p className="text-muted-foreground pl-6">
                            {selectedEmpresa.codigoCnae ? `${selectedEmpresa.codigoCnae} - ` : ''}{selectedEmpresa.atividadePrincipal || 'Não informada'}
                          </p>
                        </div>

                        {selectedEmpresa.atividadesSecundarias && selectedEmpresa.atividadesSecundarias.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-muted-foreground text-xs">Atividades Secundárias ({selectedEmpresa.atividadesSecundarias.length}):</span>
                            <ul className="text-xs text-muted-foreground pl-6 space-y-0.5 max-h-20 overflow-y-auto">
                              {selectedEmpresa.atividadesSecundarias.map((at, i) => (
                                <li key={i}>{at.codigo} - {at.descricao}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Scale className="w-4 h-4" />
                          <span className="font-medium text-foreground">Natureza Jurídica:</span>
                          <span>{selectedEmpresa.naturezaJuridica || 'Não informada'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-foreground">Capital Social:</span>
                          <span className="text-amber-400 font-medium">{formatCurrency(selectedEmpresa.capitalSocial)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium text-foreground">Data de Abertura:</span>
                          <span>{selectedEmpresa.dataAbertura || 'Não informada'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Localização e Contato */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500" />
                        Localização e Contato
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1 p-2 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium text-foreground">Endereço:</span>
                          </div>
                          <div className="pl-6 text-muted-foreground">
                            <p>{selectedEmpresa.logradouro || ''}{selectedEmpresa.numero ? `, ${selectedEmpresa.numero}` : ''}</p>
                            {selectedEmpresa.complemento && <p>{selectedEmpresa.complemento}</p>}
                            <p>{selectedEmpresa.bairro || ''}</p>
                            <p className="font-medium">{selectedEmpresa.cidade} - {selectedEmpresa.uf}</p>
                            {selectedEmpresa.cep && <p className="font-mono text-xs">CEP: {selectedEmpresa.cep}</p>}
                          </div>
                        </div>

                        {selectedEmpresa.telefone && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Telefone:</span>
                              <span className="font-medium">{selectedEmpresa.telefone}</span>
                              {selectedEmpresa.telefone2 && <span className="text-muted-foreground">/ {selectedEmpresa.telefone2}</span>}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedEmpresa.telefone, 'Telefone'); }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {selectedEmpresa.email && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground shrink-0">E-mail:</span>
                              <a href={`mailto:${selectedEmpresa.email}`} className="text-primary hover:underline truncate">
                                {selectedEmpresa.email}
                              </a>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 shrink-0"
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(selectedEmpresa.email, 'E-mail'); }}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Quadro Societário */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      Quadro Societário / Administradores ({selectedEmpresa.qsa?.length || 0})
                    </h4>
                    
                    {selectedEmpresa.qsa && selectedEmpresa.qsa.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedEmpresa.qsa.map((socio, i) => (
                          <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                            <p className="font-medium text-foreground">{socio.nome}</p>
                            <p className="text-xs text-amber-400 mt-1">{socio.qualificacao}</p>
                            {socio.cpfCnpj && (
                              <p className="text-xs text-muted-foreground font-mono mt-2">
                                CPF/CNPJ: {socio.cpfCnpj.replace(/\D/g, '').length <= 11 
                                  ? '***.' + socio.cpfCnpj.slice(-6, -3) + '.' + socio.cpfCnpj.slice(-3) + '-**'
                                  : socio.cpfCnpj}
                              </p>
                            )}
                            {socio.dataEntrada && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Entrada: {socio.dataEntrada}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Nenhum sócio/administrador informado</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
