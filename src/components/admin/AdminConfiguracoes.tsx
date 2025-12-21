import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Globe, Key, Webhook, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Configuracao {
  id: number;
  chave: string;
  valor: string;
  descricao: string;
  tipo: string;
  categoria: string;
}

export default function AdminConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-configuracoes' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setConfiguracoes(data.configuracoes || []);
      
      // Initialize edited values
      const values: Record<string, string> = {};
      (data.configuracoes || []).forEach((config: Configuracao) => {
        values[config.chave] = config.valor || '';
      });
      setEditedValues(values);
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chave: string) => {
    setSaving(chave);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-configuracao',
          chave,
          valor: editedValues[chave]
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Configuração salva com sucesso');
      
      // Update local state
      setConfiguracoes(prev => 
        prev.map(c => c.chave === chave ? { ...c, valor: editedValues[chave] } : c)
      );
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(null);
    }
  };

  const handleValueChange = (chave: string, valor: string) => {
    setEditedValues(prev => ({ ...prev, [chave]: valor }));
  };

  const toggleShowSecret = (chave: string) => {
    setShowSecrets(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'api_key':
        return <Key className="h-4 w-4" />;
      case 'url':
        return <Globe className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'webhook':
        return 'default';
      case 'api_key':
        return 'destructive';
      case 'url':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const hasChanges = (chave: string) => {
    const config = configuracoes.find(c => c.chave === chave);
    return config && editedValues[chave] !== (config.valor || '');
  };

  const filterByCategory = (categoria: string) => {
    return configuracoes.filter(c => c.categoria === categoria);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderConfigCard = (config: Configuracao) => {
    const isSecret = config.tipo === 'api_key';
    const isShowing = showSecrets[config.chave];
    
    return (
      <Card key={config.chave} className="bg-secondary/30 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getIcon(config.tipo)}
              <CardTitle className="text-sm font-medium">{config.chave}</CardTitle>
            </div>
            <Badge variant={getBadgeVariant(config.tipo) as any}>
              {config.tipo}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {config.descricao}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={isSecret && !isShowing ? 'password' : 'text'}
                value={editedValues[config.chave] || ''}
                onChange={(e) => handleValueChange(config.chave, e.target.value)}
                placeholder={config.tipo === 'webhook' ? 'https://...' : 'Digite o valor...'}
                className="pr-10"
              />
              {isSecret && (
                <button
                  type="button"
                  onClick={() => toggleShowSecret(config.chave)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {isShowing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => handleSave(config.chave)}
              disabled={!hasChanges(config.chave) || saving === config.chave}
            >
              {saving === config.chave ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie webhooks, APIs e outras configurações
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConfiguracoes}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="webhooks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="apis" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterByCategory('webhooks').map(renderConfigCard)}
            {filterByCategory('webhooks').length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                Nenhum webhook configurado
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="apis" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterByCategory('apis').map(renderConfigCard)}
            {filterByCategory('apis').length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                Nenhuma API configurada
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="geral" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filterByCategory('geral').map(renderConfigCard)}
            {filterByCategory('geral').length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                Nenhuma configuração geral
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
