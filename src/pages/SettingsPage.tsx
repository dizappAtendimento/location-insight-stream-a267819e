import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Bell, Database, Shield, Moon, Sun, Monitor, 
  Check, Trash2, Download, ChevronRight, User, Mail, Phone, 
  Pencil, X, Save, Camera, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { DashboardLayout } from '@/components/DashboardLayout';
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
  notifications: boolean;
  autoExport: boolean;
  exportFormat: 'xlsx' | 'csv' | 'json';
  maxResults: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  notifications: true,
  autoExport: false,
  exportFormat: 'xlsx',
  maxResults: '1000',
};

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: '',
    telefone: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        nome: user.nome || '',
        telefone: user.telefone || '',
      });
      setAvatarUrl(user.avatar_url || null);
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
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('SAAS_Usuarios')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      if (user) {
        user.avatar_url = publicUrl;
      }

      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada com sucesso",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível atualizar a foto",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
        </div>

        {/* Profile Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Perfil</h2>
            </div>
            {!isEditingProfile ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditingProfile(true)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileData({
                      nome: user?.nome || '',
                      telefone: user?.telefone || '',
                    });
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
                <Button 
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Salvar
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/50">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <div 
                className="w-16 h-16 rounded-full overflow-hidden bg-muted cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-semibold">
                    {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div 
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              {isEditingProfile ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <Input
                      value={profileData.nome}
                      onChange={(e) => setProfileData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Seu nome"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <Input
                      value={profileData.telefone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="Seu telefone"
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="font-medium text-foreground">{user?.nome || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        user?.status ? "bg-emerald-500" : "bg-red-500"
                      )}></span>
                      {user?.status ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      {user?.Email || '-'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {user?.telefone || '-'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <Separator className="bg-border/30" />

        {/* Theme Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Tema</h2>
          </div>
          
          <div className="flex gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                variant={theme === option.value ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "h-9 flex-1",
                  theme === option.value && "bg-secondary"
                )}
              >
                <option.icon className="w-4 h-4 mr-2" />
                {option.label}
              </Button>
            ))}
          </div>
        </section>

        <Separator className="bg-border/30" />

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Notificações</h2>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
            <div>
              <p className="text-sm text-foreground">Alertas de extração</p>
              <p className="text-xs text-muted-foreground">Notificar ao concluir</p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSetting('notifications', checked)}
            />
          </div>
        </section>

        <Separator className="bg-border/30" />

        {/* Export Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Exportação</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
              <div>
                <p className="text-sm text-foreground">Exportação automática</p>
                <p className="text-xs text-muted-foreground">Baixar após extração</p>
              </div>
              <Switch
                checked={settings.autoExport}
                onCheckedChange={(checked) => updateSetting('autoExport', checked)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Formato</Label>
                <Select 
                  value={settings.exportFormat} 
                  onValueChange={(v) => updateSetting('exportFormat', v as AppSettings['exportFormat'])}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Máx. resultados</Label>
                <Select 
                  value={settings.maxResults} 
                  onValueChange={(v) => updateSetting('maxResults', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Panel */}
        {isAdmin && (
          <>
            <Separator className="bg-border/30" />
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-foreground">Administração</h2>
              </div>
              
              <Link to="/admin">
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Painel Admin</p>
                      <p className="text-xs text-muted-foreground">Gerenciar usuários e planos</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </section>
          </>
        )}

        <Separator className="bg-border/30" />

        {/* Data Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Dados</h2>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
              <div>
                <p className="text-sm text-foreground">Restaurar padrões</p>
                <p className="text-xs text-muted-foreground">Resetar configurações</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetSettings} className="h-8 text-xs">
                Restaurar
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div>
                <p className="text-sm text-destructive">Limpar dados</p>
                <p className="text-xs text-muted-foreground">Remover todos os dados locais</p>
              </div>
              <Button variant="destructive" size="sm" onClick={clearAllData} className="h-8 text-xs">
                <Trash2 className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            </div>
          </div>
        </section>

        {/* Version Info */}
        <div className="pt-4 text-center text-xs text-muted-foreground/50">
          v1.0.0 • Dezembro 2024
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;