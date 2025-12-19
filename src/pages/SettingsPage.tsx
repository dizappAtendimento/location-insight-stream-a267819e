import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Bell, Database, Shield, Moon, Sun, Monitor, 
  Check, Trash2, Download, ChevronRight, User, Mail, Phone, 
  Pencil, X, Save, Camera, Loader2, Lock, Eye, EyeOff, CreditCard, Calendar
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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

interface PlanUsage {
  planoNome: string | null;
  limiteDisparos: number | null;
  limiteConexoes: number | null;
  limiteContatos: number | null;
  limiteListas: number | null;
  usadoDisparos: number;
  usadoConexoes: number;
  usadoContatos: number;
  usadoListas: number;
  dataValidade: string | null;
}

interface ExtractorPlanUsage {
  planoNome: string | null;
  limitePlaces: number | null;
  limiteInstagram: number | null;
  limiteLinkedin: number | null;
  usadoPlaces: number;
  usadoInstagram: number;
  usadoLinkedin: number;
  dataValidade: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  notifications: true,
  autoExport: false,
  exportFormat: 'xlsx',
  maxResults: '1000',
};

// Helper to check if a limit is "unlimited" (null, 0, or very large number)
const isUnlimitedValue = (value: number | null): boolean => {
  if (value === null || value === 0) return true;
  // Values larger than 1 billion are considered unlimited
  return value > 999999999;
};

// Component for usage bars
const UsageBar = ({ label, used, limit, color = 'green' }: { label: string; used: number; limit: number | null; color?: 'green' | 'blue' }) => {
  const isUnlimited = isUnlimitedValue(limit);
  const percentage = isUnlimited ? Math.min((used / 100) * 10, 100) : Math.min((used / (limit || 1)) * 100, 100);
  const colorClass = color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-emerald-500 to-green-400';
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={textColor + ' font-medium'}>
          {used.toLocaleString('pt-BR')} / {isUnlimited ? 'Ilimitado' : limit?.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
          style={{ width: `${isUnlimited ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
};

// Helper to format limit display
const formatLimit = (value: number | null): string => {
  if (isUnlimitedValue(value)) return 'ilimitado';
  return value?.toLocaleString('pt-BR') || '0';
};

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Plan usage state
  const [disparadorPlan, setDisparadorPlan] = useState<PlanUsage | null>(null);
  const [extratorPlan, setExtratorPlan] = useState<ExtractorPlanUsage | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
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

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        nome: user.nome || '',
        telefone: user.telefone || '',
      });
      setAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  // Fetch plan usage data
  useEffect(() => {
    const fetchPlanUsage = async () => {
      if (!user?.id) return;
      setLoadingPlans(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-user-plan-usage', userId: user.id }
        });
        
        if (error) throw error;
        
        if (data?.disparador) {
          setDisparadorPlan(data.disparador);
        }
        if (data?.extrator) {
          setExtratorPlan(data.extrator);
        }
      } catch (error) {
        console.error('Error fetching plan usage:', error);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    fetchPlanUsage();
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

      // Use edge function to update profile (bypasses RLS)
      const { error: updateError } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-profile', 
          userId: user.id,
          userData: { avatar_url: publicUrl }
        }
      });

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
      // Use edge function to update profile (bypasses RLS)
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-profile', 
          userId: user.id,
          userData: {
            nome: profileData.nome.trim(),
            telefone: profileData.telefone.trim(),
          }
        }
      });

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

  const handleChangePassword = async () => {
    if (!user?.id) return;
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'change-password', 
          userId: user.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso",
      });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
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

        {/* Password Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Segurança</h2>
            </div>
            {!isChangingPassword && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsChangingPassword(true)}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3 mr-1" />
                Alterar senha
              </Button>
            )}
          </div>

          {isChangingPassword ? (
            <div className="p-4 rounded-lg bg-card border border-border/50 space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Label className="text-xs text-muted-foreground">Senha atual</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Digite sua senha atual"
                      className="h-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Label className="text-xs text-muted-foreground">Nova senha</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Digite a nova senha"
                      className="h-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Label className="text-xs text-muted-foreground">Confirmar nova senha</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirme a nova senha"
                      className="h-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleChangePassword}
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
              <div>
                <p className="text-sm text-foreground">Senha</p>
                <p className="text-xs text-muted-foreground">••••••••</p>
              </div>
            </div>
          )}
        </section>

        <Separator className="bg-border/30" />

        {/* Plan Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">Meus Planos</h2>
          </div>
          
          <div className="space-y-4">
            {/* Plano Disparador */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 animate-pulse"></div>
                  <h3 className="text-sm font-semibold text-foreground">Disparador</h3>
                </div>
                {disparadorPlan && (
                  <span className="text-xs text-muted-foreground">Ativo</span>
                )}
              </div>
              
              {loadingPlans ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted/50 animate-pulse rounded-lg"></div>
                  <div className="h-4 bg-muted/50 animate-pulse rounded w-2/3"></div>
                </div>
              ) : disparadorPlan ? (
                <>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                        {disparadorPlan.planoNome || 'Sem plano'}
                      </p>
                      {disparadorPlan.dataValidade && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                          isPast(new Date(disparadorPlan.dataValidade)) 
                            ? "bg-red-500/20 text-red-400" 
                            : differenceInDays(new Date(disparadorPlan.dataValidade), new Date()) <= 7
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                        )}>
                          <Calendar className="w-3 h-3" />
                          {isPast(new Date(disparadorPlan.dataValidade)) 
                            ? 'Expirado'
                            : format(new Date(disparadorPlan.dataValidade), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                        {isUnlimitedValue(disparadorPlan.limiteDisparos) ? 'Disparos ilimitados' : `${formatLimit(disparadorPlan.limiteDisparos)} disparos/mês`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                        {isUnlimitedValue(disparadorPlan.limiteConexoes) ? 'Conexões ilimitadas' : `${formatLimit(disparadorPlan.limiteConexoes)} conexões`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                        {isUnlimitedValue(disparadorPlan.limiteContatos) ? 'Contatos ilimitados' : `${formatLimit(disparadorPlan.limiteContatos)} contatos`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> 
                        {isUnlimitedValue(disparadorPlan.limiteListas) ? 'Listas ilimitadas' : `${formatLimit(disparadorPlan.limiteListas)} listas`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso do Plano</p>
                    <UsageBar label="Disparos" used={disparadorPlan.usadoDisparos} limit={disparadorPlan.limiteDisparos} />
                    <UsageBar label="Conexões" used={disparadorPlan.usadoConexoes} limit={disparadorPlan.limiteConexoes} />
                    <UsageBar label="Contatos" used={disparadorPlan.usadoContatos} limit={disparadorPlan.limiteContatos} />
                    <UsageBar label="Listas" used={disparadorPlan.usadoListas} limit={disparadorPlan.limiteListas} />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum plano ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">Entre em contato para ativar</p>
                </div>
              )}
            </div>

            {/* Plano Extrator */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-card to-card/50 border border-border/50 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    extratorPlan ? "bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse" : "bg-muted"
                  )}></div>
                  <h3 className="text-sm font-semibold text-foreground">Extrator</h3>
                </div>
                {extratorPlan && (
                  <span className="text-xs text-muted-foreground">Ativo</span>
                )}
              </div>
              
              {loadingPlans ? (
                <div className="space-y-3">
                  <div className="h-16 bg-muted/50 animate-pulse rounded-lg"></div>
                  <div className="h-4 bg-muted/50 animate-pulse rounded w-2/3"></div>
                </div>
              ) : extratorPlan ? (
                <>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {extratorPlan.planoNome || 'Sem plano'}
                      </p>
                      {extratorPlan.dataValidade && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                          isPast(new Date(extratorPlan.dataValidade)) 
                            ? "bg-red-500/20 text-red-400" 
                            : differenceInDays(new Date(extratorPlan.dataValidade), new Date()) <= 7
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                        )}>
                          <Calendar className="w-3 h-3" />
                          {isPast(new Date(extratorPlan.dataValidade)) 
                            ? 'Expirado'
                            : format(new Date(extratorPlan.dataValidade), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-400" /> 
                        {isUnlimitedValue(extratorPlan.limitePlaces) ? 'Places ilimitado' : `${formatLimit(extratorPlan.limitePlaces)} extrações Places`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-400" /> 
                        {isUnlimitedValue(extratorPlan.limiteInstagram) ? 'Instagram ilimitado' : `${formatLimit(extratorPlan.limiteInstagram)} extrações Instagram`}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-400" /> 
                        {isUnlimitedValue(extratorPlan.limiteLinkedin) ? 'LinkedIn ilimitado' : `${formatLimit(extratorPlan.limiteLinkedin)} extrações LinkedIn`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uso do Plano</p>
                    <UsageBar label="Places" used={extratorPlan.usadoPlaces} limit={extratorPlan.limitePlaces} color="blue" />
                    <UsageBar label="Instagram" used={extratorPlan.usadoInstagram} limit={extratorPlan.limiteInstagram} color="blue" />
                    <UsageBar label="LinkedIn" used={extratorPlan.usadoLinkedin} limit={extratorPlan.limiteLinkedin} color="blue" />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum plano ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">Entre em contato para ativar</p>
                </div>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Caso queira mudar de plano, <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">clique aqui</a> e fale com o suporte.
          </p>
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


        {/* Version Info */}
        <div className="pt-4 text-center text-xs text-muted-foreground/50">
          v1.0.0 • Dezembro 2024
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;