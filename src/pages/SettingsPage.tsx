import { useState, useEffect } from 'react';
import { 
  Settings, Palette, Bell, Database, Shield, Moon, Sun, Monitor, 
  Check, Trash2, Download, ChevronRight, User, Mail, Phone, 
  Pencil, X, Save, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  accentColor: 'purple',
  notifications: true,
  autoExport: false,
  exportFormat: 'xlsx',
  maxResults: '1000',
};

const ACCENT_COLORS = [
  { name: 'cyan', color: 'bg-cyan-500', ring: 'ring-cyan-500' },
  { name: 'blue', color: 'bg-blue-500', ring: 'ring-blue-500' },
  { name: 'purple', color: 'bg-purple-500', ring: 'ring-purple-500' },
  { name: 'pink', color: 'bg-pink-500', ring: 'ring-pink-500' },
  { name: 'green', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'orange', color: 'bg-orange-500', ring: 'ring-orange-500' },
];

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: '',
    telefone: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        nome: user.nome || '',
        telefone: user.telefone || '',
      });
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('SAAS_Usuarios')
        .update({
          nome: profileData.nome.trim(),
          telefone: profileData.telefone.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso",
      });
      setIsEditingProfile(false);
      
      // Update local user data
      if (user) {
        user.nome = profileData.nome.trim();
        user.telefone = profileData.telefone.trim();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-4xl">
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
              <Button onClick={saveSettings} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                <Check className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            )}
          </div>
        </div>

        {/* User Profile */}
        <Card className="opacity-0 animate-fade-in-up overflow-hidden relative border-blue-500/20" style={{ animationDelay: '50ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Meu Perfil
                </CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </div>
              {!isEditingProfile ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditingProfile(true)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileData({
                        nome: user?.nome || '',
                        telefone: user?.telefone || '',
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/20 transition-transform group-hover:scale-105">
                  <span className="text-3xl font-bold text-white">
                    {(isEditingProfile ? profileData.nome : user?.nome)?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                {isEditingProfile ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input
                      value={profileData.nome}
                      onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Seu nome"
                      className="h-10 bg-secondary/50 border-border/50"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-foreground">{user?.nome || 'Usuário'}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        user?.status ? "bg-emerald-500" : "bg-red-500"
                      )}></span>
                      {user?.status ? 'Conta ativa' : 'Conta inativa'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all",
                isEditingProfile 
                  ? "bg-secondary/30 border border-border/50" 
                  : "bg-gradient-to-br from-secondary/40 to-secondary/20 border border-border/30"
              )}>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground truncate">{user?.Email || '-'}</p>
                </div>
              </div>
              
              {isEditingProfile ? (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <Input
                        value={profileData.telefone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, telefone: e.target.value }))}
                        placeholder="Seu telefone"
                        className="h-8 mt-1 bg-background/50 border-border/50"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-secondary/40 to-secondary/20 border border-border/30">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium text-foreground truncate">{user?.telefone || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="opacity-0 animate-fade-in-up overflow-hidden relative border-primary/20" style={{ animationDelay: '100ms' }}>
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
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "h-11 transition-all",
                      theme === option.value 
                        ? "shadow-lg shadow-primary/20" 
                        : "hover:bg-secondary/80"
                    )}
                  >
                    <option.icon className="w-4 h-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Accent Color */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Cor de Destaque</Label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((accent) => (
                  <button
                    key={accent.name}
                    onClick={() => updateSetting('accentColor', accent.name)}
                    className={cn(
                      "w-11 h-11 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg",
                      accent.color,
                      settings.accentColor === accent.name 
                        ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" 
                        : "hover:scale-110 opacity-80 hover:opacity-100"
                    )}
                  >
                    {settings.accentColor === accent.name && (
                      <Check className="w-5 h-5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="opacity-0 animate-fade-in-up border-amber-500/20" style={{ animationDelay: '150ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Notificações
            </CardTitle>
            <CardDescription>Gerencie suas preferências de notificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
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
        <Card className="opacity-0 animate-fade-in-up border-emerald-500/20" style={{ animationDelay: '200ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-500" />
              Exportação
            </CardTitle>
            <CardDescription>Configure as opções de exportação de dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Exportação Automática</Label>
                <p className="text-xs text-muted-foreground">Baixar automaticamente após cada extração</p>
              </div>
              <Switch
                checked={settings.autoExport}
                onCheckedChange={(checked) => updateSetting('autoExport', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Formato Padrão</Label>
                <Select 
                  value={settings.exportFormat} 
                  onValueChange={(v) => updateSetting('exportFormat', v as AppSettings['exportFormat'])}
                >
                  <SelectTrigger className="h-11 bg-secondary/30 border-border/50">
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
                  <SelectTrigger className="h-11 bg-secondary/30 border-border/50">
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
          <Card className="opacity-0 animate-fade-in-up overflow-hidden relative border-amber-500/30" style={{ animationDelay: '250ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Administração
              </CardTitle>
              <CardDescription>Acesso às funcionalidades administrativas do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 hover:from-amber-500/15 hover:to-orange-500/10 hover:border-amber-500/30 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Painel Admin</p>
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
        <Card className="opacity-0 animate-fade-in-up border-destructive/20" style={{ animationDelay: '300ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive to-destructive/50" />
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
                <p className="text-xs text-muted-foreground">Remove histórico, configurações e dados locais</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearAllData} className="shadow-lg shadow-destructive/20">
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Restaurar Padrões</Label>
                <p className="text-xs text-muted-foreground">Restaura todas as configurações</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetSettings}>
                Restaurar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="opacity-0 animate-fade-in-up border-border/30" style={{ animationDelay: '350ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              Sobre o Aplicativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <p className="text-muted-foreground text-xs">Versão</p>
                <p className="font-semibold text-foreground">1.0.0</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <p className="text-muted-foreground text-xs">Última Atualização</p>
                <p className="font-semibold text-foreground">Dezembro 2024</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;