import { useState, useEffect } from 'react';
import { Settings, Palette, Bell, Database, Shield, Moon, Sun, Monitor, Check, Trash2, Download, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  notifications: boolean;
  autoExport: boolean;
  exportFormat: 'xlsx' | 'csv' | 'json';
  maxResults: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'cyan',
  notifications: true,
  autoExport: false,
  exportFormat: 'xlsx',
  maxResults: '100',
};

const ACCENT_COLORS = [
  { name: 'cyan', color: 'bg-cyan-500', label: 'Ciano' },
  { name: 'blue', color: 'bg-blue-500', label: 'Azul' },
  { name: 'purple', color: 'bg-purple-500', label: 'Roxo' },
  { name: 'pink', color: 'bg-pink-500', label: 'Rosa' },
  { name: 'green', color: 'bg-emerald-500', label: 'Verde' },
  { name: 'orange', color: 'bg-orange-500', label: 'Laranja' },
];

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase.functions.invoke('admin-api', {
            body: { action: 'check-admin', userId: user.id }
          });
          setIsAdmin(data?.isAdmin === true);
        } catch (error) {
          setIsAdmin(false);
        }
      }
    };
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem('app_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    setHasChanges(false);
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso",
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
    setHasChanges(false);
    toast({
      title: "Configurações resetadas",
      description: "Todas as configurações foram restauradas ao padrão",
    });
  };

  const clearAllData = () => {
    localStorage.clear();
    toast({
      title: "Dados limpos",
      description: "Todos os dados locais foram removidos",
      variant: "destructive",
    });
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
                <p className="text-muted-foreground text-sm">Personalize sua experiência</p>
              </div>
            </div>
            {hasChanges && (
              <Button onClick={saveSettings} className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>

        {/* Appearance */}
        <Card className="opacity-0 animate-fade-in-up overflow-hidden relative" style={{ animationDelay: '100ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Aparência
            </CardTitle>
            <CardDescription>Personalize o visual do aplicativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tema</Label>
              <div className="flex gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={settings.theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('theme', option.value as AppSettings['theme'])}
                    className="flex-1"
                  >
                    <option.icon className="w-4 h-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Cor de Destaque</Label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((accent) => (
                  <button
                    key={accent.name}
                    onClick={() => updateSetting('accentColor', accent.name)}
                    className={cn(
                      "w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center",
                      accent.color,
                      settings.accentColor === accent.name 
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" 
                        : "hover:scale-105"
                    )}
                    title={accent.label}
                  >
                    {settings.accentColor === accent.name && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Notificações
            </CardTitle>
            <CardDescription>Gerencie suas preferências de notificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Notificações de Extração</Label>
                <p className="text-xs text-muted-foreground">Receba alertas quando uma extração for concluída</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSetting('notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-500" />
              Exportação
            </CardTitle>
            <CardDescription>Configure as opções de exportação de dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Exportação Automática</Label>
                <p className="text-xs text-muted-foreground">Baixar automaticamente após cada extração</p>
              </div>
              <Switch
                checked={settings.autoExport}
                onCheckedChange={(checked) => updateSetting('autoExport', checked)}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Formato Padrão</Label>
                <Select 
                  value={settings.exportFormat} 
                  onValueChange={(v) => updateSetting('exportFormat', v as AppSettings['exportFormat'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Máximo de Resultados</Label>
                <Select 
                  value={settings.maxResults} 
                  onValueChange={(v) => updateSetting('maxResults', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 resultados</SelectItem>
                    <SelectItem value="100">100 resultados</SelectItem>
                    <SelectItem value="200">200 resultados</SelectItem>
                    <SelectItem value="500">500 resultados</SelectItem>
                    <SelectItem value="1000">1000 resultados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Panel - Only for admins */}
        {isAdmin && (
          <Card className="opacity-0 animate-fade-in-up overflow-hidden relative border-amber-500/30" style={{ animationDelay: '275ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-500/50" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Administração
              </CardTitle>
              <CardDescription>Acesso às funcionalidades administrativas do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin">
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 hover:border-amber-500/30 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Painel Admin</p>
                      <p className="text-xs text-muted-foreground">Gerenciar usuários, planos e estatísticas</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Data Management */}
        <Card className="opacity-0 animate-fade-in-up border-destructive/30" style={{ animationDelay: '250ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-destructive" />
              Gerenciamento de Dados
            </CardTitle>
            <CardDescription>Gerencie seus dados locais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-destructive">Limpar Todos os Dados</Label>
                <p className="text-xs text-muted-foreground">Remove histórico, configurações e todos os dados salvos localmente</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearAllData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Restaurar Padrões</Label>
                <p className="text-xs text-muted-foreground">Restaura todas as configurações ao padrão</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetSettings}>
                Restaurar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Sobre o Aplicativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Versão</p>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última Atualização</p>
                <p className="font-medium">Dezembro 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;