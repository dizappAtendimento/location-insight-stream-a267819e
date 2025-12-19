import { useState } from 'react';
import { Code, Copy, Play, Key, Loader2, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const BASE_URL = 'https://egxwzmkdbymxooielidc.supabase.co/functions/v1';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  name: string;
  path: string;
  body: string;
}

const endpoints: Endpoint[] = [
  { method: 'GET', name: 'Listar Disparos', path: '/disparos-api', body: '{\n  "action": "get-disparos",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'GET', name: 'Detalhes Disparo', path: '/disparos-api', body: '{\n  "action": "get-disparo-detalhes",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}' },
  { method: 'POST', name: 'Criar Disparo', path: '/disparos-api', body: '{\n  "action": "create-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": {\n    "mensagens": [{"text": "Olá!"}],\n    "idLista": [1],\n    "connections": [{"id": 1}]\n  }\n}' },
  { method: 'POST', name: 'Enviar Mensagem', path: '/evolution-api', body: '{\n  "action": "send-message",\n  "instanceName": "minha-conexao",\n  "to": "5511999999999",\n  "message": "Olá, tudo bem?"\n}' },
  { method: 'POST', name: 'Criar Disparo Grupo', path: '/disparos-api', body: '{\n  "action": "create-disparo-grupo",\n  "userId": "SEU_USER_ID",\n  "disparoData": {\n    "mensagens": [{"text": "Olá grupo!"}],\n    "idLista": [1],\n    "connections": [{"id": 1}]\n  }\n}' },
  { method: 'PUT', name: 'Pausar Disparo', path: '/disparos-api', body: '{\n  "action": "pause-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}' },
  { method: 'PUT', name: 'Retomar Disparo', path: '/disparos-api', body: '{\n  "action": "resume-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}' },
  { method: 'DELETE', name: 'Excluir Disparo', path: '/disparos-api', body: '{\n  "action": "delete-disparo",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "id": 123 }\n}' },
  { method: 'GET', name: 'Listar Listas', path: '/disparos-api', body: '{\n  "action": "get-listas",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'GET', name: 'Listar Contatos', path: '/disparos-api', body: '{\n  "action": "get-contatos",\n  "userId": "SEU_USER_ID",\n  "disparoData": { "idLista": 1 }\n}' },
  { method: 'GET', name: 'Listar Conexões', path: '/disparos-api', body: '{\n  "action": "get-connections",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'GET', name: 'Instâncias WhatsApp', path: '/evolution-api', body: '{\n  "action": "list-user-instances",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'POST', name: 'Criar Instância', path: '/evolution-api', body: '{\n  "action": "create-instance",\n  "instanceName": "minha-conexao",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'GET', name: 'Obter QR Code', path: '/evolution-api', body: '{\n  "action": "get-qrcode",\n  "instanceName": "minha-conexao"\n}' },
  { method: 'GET', name: 'Status Conexão', path: '/evolution-api', body: '{\n  "action": "connection-state",\n  "instanceName": "minha-conexao"\n}' },
  { method: 'POST', name: 'Buscar Google Places', path: '/search-places', body: '{\n  "query": "restaurantes",\n  "location": "São Paulo, SP",\n  "maxResults": 100,\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'GET', name: 'Dados do Plano', path: '/admin-api', body: '{\n  "action": "get-user-plan-usage",\n  "userId": "SEU_USER_ID"\n}' },
  { method: 'POST', name: 'Gerar Mensagem IA', path: '/disparos-api', body: '{\n  "action": "generate-ai-message",\n  "userId": "SEU_USER_ID",\n  "disparoData": {\n    "prompt": "Crie uma mensagem de boas vindas para um cliente",\n    "context": "Empresa de marketing digital"\n  }\n}' },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500 text-white',
  POST: 'bg-green-500 text-white',
  PUT: 'bg-amber-500 text-white',
  DELETE: 'bg-red-500 text-white',
};

const ApiDocsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(DEFAULT_ANON_KEY);
  const [isEditingToken, setIsEditingToken] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const resetToken = () => {
    setAuthToken(DEFAULT_ANON_KEY);
    toast({ title: "Token restaurado para o padrão" });
  };

  const clearToken = () => {
    setAuthToken('');
    setIsEditingToken(true);
    toast({ title: "Token removido" });
  };

  const handleSelectEndpoint = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    const bodyWithUserId = endpoint.body.replace(/SEU_USER_ID/g, user?.id || 'SEU_USER_ID');
    setRequestBody(bodyWithUserId);
    setResponse(null);
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    setIsLoading(true);
    setResponse(null);
    
    try {
      const parsedBody = JSON.parse(requestBody);
      const { data, error } = await supabase.functions.invoke(selectedEndpoint.path.replace('/', ''), {
        body: parsedBody
      });
      setResponse(JSON.stringify(error ? { error: error.message } : data, null, 2));
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code className="w-6 h-6" />
            API Docs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Teste os endpoints diretamente</p>
        </div>

        {/* Auth Credentials */}
        <Card className="bg-muted/30">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Base URL
              </span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(BASE_URL)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <code className="text-xs font-mono text-primary block">{BASE_URL}</code>
            
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-sm font-medium">Authorization Token</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditingToken(!isEditingToken)} title="Editar">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={clearToken} title="Limpar">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={resetToken} title="Restaurar padrão">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(authToken)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {isEditingToken ? (
              <Input
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="font-mono text-xs"
                placeholder="Cole seu token aqui..."
              />
            ) : (
              <code className="text-xs font-mono text-muted-foreground break-all">
                {authToken ? `${authToken.slice(0, 50)}...` : 'Nenhum token definido'}
              </code>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Endpoints List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Endpoints</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 flex items-center gap-3",
                    selectedEndpoint === endpoint ? "bg-primary/10 border-primary/30" : "bg-card"
                  )}
                  onClick={() => handleSelectEndpoint(endpoint)}
                >
                  <Badge className={cn("w-16 justify-center text-xs font-bold", methodColors[endpoint.method])}>
                    {endpoint.method}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{endpoint.name}</p>
                    <code className="text-xs text-muted-foreground">{endpoint.path}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Playground */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Play className="w-5 h-5" />
              Playground
            </h2>

            {selectedEndpoint ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge className={cn("text-xs", methodColors[selectedEndpoint.method])}>
                      {selectedEndpoint.method}
                    </Badge>
                    {selectedEndpoint.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Body (JSON)</label>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(requestBody)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <Textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      className="font-mono text-xs min-h-[150px] bg-muted/30"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleTestEndpoint} disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      Testar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const curl = `curl -X POST "${BASE_URL}${selectedEndpoint.path}" \\
  -H "Content-Type: application/json" \\
  -H "apikey: ${authToken}" \\
  -H "Authorization: Bearer ${authToken}" \\
  -d '${requestBody.replace(/\n/g, '').replace(/'/g, "\\'")}'`;
                        copyToClipboard(curl);
                      }}
                      title="Copiar como cURL"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      cURL
                    </Button>
                  </div>

                  {response && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Resposta</label>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(response)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="p-3 rounded-lg bg-muted/50 border overflow-auto max-h-[250px] text-xs font-mono">
                        {response}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-[300px] text-muted-foreground">
                Selecione um endpoint para testar
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ApiDocsPage;
