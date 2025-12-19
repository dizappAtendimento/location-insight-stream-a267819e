import { useState } from 'react';
import { 
  Code, FileJson, Copy, Play, ChevronDown, ChevronRight, 
  Send, Link2, Search, Key, Check, X, Loader2, ExternalLink
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://egxwzmkdbymxooielidc.supabase.co/functions/v1';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  name: string;
  description: string;
  body?: string;
  category: string;
}

const endpoints: Endpoint[] = [
  // Disparos
  { method: 'POST', path: '/disparos-api', name: 'Listar Disparos', description: 'Retorna todos os disparos do usuário', body: '{\n  "action": "get-disparos",\n  "userId": "SEU_USER_ID"\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Criar Disparo', description: 'Cria um novo disparo para envio de mensagens', body: '{\n  "action": "create-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": {\n    "mensagens": [{"text": "Olá!"}],\n    "idLista": [1],\n    "connections": [{"id": 1}]\n  }\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Detalhes do Disparo', description: 'Obtém detalhes de um disparo específico', body: '{\n  "action": "get-disparo-detalhes",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Pausar Disparo', description: 'Pausa um disparo em andamento', body: '{\n  "action": "pause-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Retomar Disparo', description: 'Retoma um disparo pausado', body: '{\n  "action": "resume-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Excluir Disparo', description: 'Exclui um disparo', body: '{\n  "action": "delete-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}', category: 'disparos' },
  // Listas
  { method: 'POST', path: '/disparos-api', name: 'Listar Listas', description: 'Retorna todas as listas do usuário', body: '{\n  "action": "get-listas",\n  "userId": "SEU_USER_ID"\n}', category: 'disparos' },
  { method: 'POST', path: '/disparos-api', name: 'Listar Conexões', description: 'Retorna todas as conexões do usuário', body: '{\n  "action": "get-connections",\n  "userId": "SEU_USER_ID"\n}', category: 'disparos' },
  // Conexões WhatsApp
  { method: 'POST', path: '/evolution-api', name: 'Listar Instâncias', description: 'Lista todas as instâncias WhatsApp do usuário', body: '{\n  "action": "list-user-instances",\n  "userId": "SEU_USER_ID"\n}', category: 'conexoes' },
  { method: 'POST', path: '/evolution-api', name: 'Criar Instância', description: 'Cria uma nova instância WhatsApp', body: '{\n  "action": "create-instance",\n  "instanceName": "minha-conexao",\n  "userId": "SEU_USER_ID"\n}', category: 'conexoes' },
  { method: 'POST', path: '/evolution-api', name: 'Obter QR Code', description: 'Obtém o QR Code para conectar WhatsApp', body: '{\n  "action": "get-qrcode",\n  "instanceName": "minha-conexao"\n}', category: 'conexoes' },
  { method: 'POST', path: '/evolution-api', name: 'Status da Conexão', description: 'Verifica o status de uma conexão', body: '{\n  "action": "connection-state",\n  "instanceName": "minha-conexao"\n}', category: 'conexoes' },
  // Extrator
  { method: 'POST', path: '/search-places', name: 'Buscar Google Places', description: 'Extrai leads do Google Places', body: '{\n  "query": "restaurantes",\n  "location": "São Paulo, SP",\n  "maxResults": 100,\n  "userId": "SEU_USER_ID"\n}', category: 'extrator' },
  { method: 'POST', path: '/search-instagram', name: 'Buscar Instagram', description: 'Extrai perfis do Instagram', body: '{\n  "query": "marketing digital",\n  "maxResults": 50,\n  "userId": "SEU_USER_ID"\n}', category: 'extrator' },
  { method: 'POST', path: '/search-linkedin', name: 'Buscar LinkedIn', description: 'Extrai perfis do LinkedIn', body: '{\n  "query": "CEO tecnologia",\n  "location": "Brasil",\n  "userId": "SEU_USER_ID"\n}', category: 'extrator' },
  { method: 'POST', path: '/search-whatsapp-groups', name: 'Buscar Grupos WhatsApp', description: 'Extrai grupos do WhatsApp', body: '{\n  "connectionId": 1,\n  "userId": "SEU_USER_ID"\n}', category: 'extrator' },
  // Admin
  { method: 'POST', path: '/admin-api', name: 'Verificar Admin', description: 'Verifica se o usuário é administrador', body: '{\n  "action": "check-admin",\n  "userId": "SEU_USER_ID"\n}', category: 'admin' },
  { method: 'POST', path: '/admin-api', name: 'Dados do Plano', description: 'Obtém informações do plano e uso', body: '{\n  "action": "get-user-plan-usage",\n  "userId": "SEU_USER_ID"\n}', category: 'admin' },
  { method: 'POST', path: '/admin-api', name: 'Dashboard Stats', description: 'Obtém estatísticas do dashboard', body: '{\n  "action": "get-dashboard-stats",\n  "userId": "SEU_USER_ID",\n  "startDate": "2025-01-01T00:00:00Z",\n  "endDate": "2025-12-31T23:59:59Z"\n}', category: 'admin' },
];

const methodColors = {
  GET: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST: 'bg-green-500/20 text-green-400 border-green-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const ApiDocsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('disparos');

  const handleSelectEndpoint = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    // Replace SEU_USER_ID with actual user ID
    const bodyWithUserId = endpoint.body?.replace(/SEU_USER_ID/g, user?.id || 'SEU_USER_ID') || '';
    setRequestBody(bodyWithUserId);
    setResponse(null);
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    
    setIsLoading(true);
    setResponse(null);
    
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch {
        toast({
          title: "JSON inválido",
          description: "Verifique a sintaxe do corpo da requisição",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(selectedEndpoint.path.replace('/', ''), {
        body: parsedBody
      });

      if (error) {
        setResponse(JSON.stringify({ error: error.message }, null, 2));
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const getCurlExample = (endpoint: Endpoint) => {
    const body = endpoint.body?.replace(/SEU_USER_ID/g, user?.id || 'SEU_USER_ID') || '';
    return `curl -X POST \\
  "${BASE_URL}${endpoint.path}" \\
  -H "Content-Type: application/json" \\
  -H "apikey: YOUR_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -d '${body.replace(/\n/g, '').replace(/  /g, '')}'`;
  };

  const getJsExample = (endpoint: Endpoint) => {
    const body = endpoint.body?.replace(/SEU_USER_ID/g, user?.id || 'SEU_USER_ID') || '';
    return `const response = await fetch("${BASE_URL}${endpoint.path}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": "YOUR_ANON_KEY",
    "Authorization": "Bearer YOUR_ANON_KEY"
  },
  body: JSON.stringify(${body})
});

const data = await response.json();
console.log(data);`;
  };

  const getPythonExample = (endpoint: Endpoint) => {
    const body = endpoint.body?.replace(/SEU_USER_ID/g, user?.id || 'SEU_USER_ID') || '';
    return `import requests

url = "${BASE_URL}${endpoint.path}"
headers = {
    "Content-Type": "application/json",
    "apikey": "YOUR_ANON_KEY",
    "Authorization": "Bearer YOUR_ANON_KEY"
}
payload = ${body}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
  };

  const categories = [
    { id: 'disparos', name: 'Disparos', icon: Send, color: 'emerald' },
    { id: 'conexoes', name: 'Conexões', icon: Link2, color: 'blue' },
    { id: 'extrator', name: 'Extrator', icon: Search, color: 'purple' },
    { id: 'admin', name: 'Admin', icon: Key, color: 'amber' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Code className="w-6 h-6" />
              Documentação da API
            </h1>
            <p className="text-muted-foreground mt-1">
              Explore e teste os endpoints da API diretamente pelo navegador
            </p>
          </div>
        </div>

        {/* Base URL Info */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Base URL</p>
                <code className="text-sm font-mono text-primary">{BASE_URL}</code>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(BASE_URL)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Endpoints List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Endpoints Disponíveis</h2>
            
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
                  className="gap-2"
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Endpoints */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {endpoints
                .filter(e => e.category === activeCategory)
                .map((endpoint, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                      selectedEndpoint === endpoint 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-card border-border/50"
                    )}
                    onClick={() => handleSelectEndpoint(endpoint)}
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={cn("shrink-0 font-mono text-xs", methodColors[endpoint.method])}>
                        {endpoint.method}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{endpoint.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{endpoint.description}</p>
                        <code className="text-xs font-mono text-primary/80 mt-2 block">{endpoint.path}</code>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* API Playground */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Play className="w-5 h-5" />
              API Playground
            </h2>

            {/* Credenciais de Autenticação */}
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  Credenciais de Autenticação
                </CardTitle>
                <CardDescription className="text-xs">
                  Use estas credenciais nos headers de suas requisições
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">apikey</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => copyToClipboard('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <code className="text-xs font-mono text-amber-500 break-all bg-muted/30 p-2 rounded block">
                    eyJhbGciOi...XJB9t5brPc...
                  </code>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Authorization: Bearer</label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => copyToClipboard('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <code className="text-xs font-mono text-amber-500 break-all bg-muted/30 p-2 rounded block">
                    Bearer eyJhbGciOi...XJB9t5brPc...
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no botão copiar para obter o token completo
                </p>
              </CardContent>
            </Card>

            {selectedEndpoint ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("font-mono", methodColors[selectedEndpoint.method])}>
                      {selectedEndpoint.method}
                    </Badge>
                    <CardTitle className="text-base">{selectedEndpoint.name}</CardTitle>
                  </div>
                  <CardDescription>{selectedEndpoint.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Request Body */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">Corpo da Requisição (JSON)</label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7"
                        onClick={() => copyToClipboard(requestBody)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <Textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="font-mono text-xs min-h-[200px] bg-muted/30"
                      placeholder="Digite o corpo da requisição..."
                    />
                  </div>

                  {/* Test Button */}
                  <Button 
                    className="w-full" 
                    onClick={handleTestEndpoint}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Testar Endpoint
                      </>
                    )}
                  </Button>

                  {/* Response */}
                  {response && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">Resposta</label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7"
                          onClick={() => copyToClipboard(response)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <pre className="p-4 rounded-lg bg-muted/50 border border-border/30 overflow-auto max-h-[300px] text-xs font-mono">
                        {response}
                      </pre>
                    </div>
                  )}

                  {/* Code Examples */}
                  <div className="pt-4 border-t border-border/30">
                    <p className="text-sm font-medium text-foreground mb-3">Exemplos de Código</p>
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-3">
                        <div className="relative">
                          <pre className="p-4 rounded-lg bg-muted/50 border border-border/30 overflow-auto text-xs font-mono">
                            {getCurlExample(selectedEndpoint)}
                          </pre>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 h-7"
                            onClick={() => copyToClipboard(getCurlExample(selectedEndpoint))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="javascript" className="mt-3">
                        <div className="relative">
                          <pre className="p-4 rounded-lg bg-muted/50 border border-border/30 overflow-auto text-xs font-mono">
                            {getJsExample(selectedEndpoint)}
                          </pre>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 h-7"
                            onClick={() => copyToClipboard(getJsExample(selectedEndpoint))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="python" className="mt-3">
                        <div className="relative">
                          <pre className="p-4 rounded-lg bg-muted/50 border border-border/30 overflow-auto text-xs font-mono">
                            {getPythonExample(selectedEndpoint)}
                          </pre>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 h-7"
                            onClick={() => copyToClipboard(getPythonExample(selectedEndpoint))}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center py-12">
                  <FileJson className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Selecione um endpoint para visualizar detalhes e testar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Authentication Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Autenticação
            </CardTitle>
            <CardDescription>Como autenticar suas requisições</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Todas as requisições devem incluir os seguintes headers de autenticação:
            </p>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="text-muted-foreground">apikey:</span>
                <span className="text-primary">YOUR_ANON_KEY</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="text-muted-foreground">Authorization:</span>
                <span className="text-primary">Bearer YOUR_ANON_KEY</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="text-muted-foreground">Content-Type:</span>
                <span className="text-primary">application/json</span>
              </div>
            </div>
            <p className="text-xs text-amber-500/90">
              Nota: Para operações que requerem autenticação de usuário, inclua o userId no corpo da requisição.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocsPage;
