import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'update-user-profile',
          userId: user.id,
          nome: nome.trim(),
          telefone: telefone.trim(),
        }
      });

      if (error) {
        toast.error('Erro ao atualizar perfil');
        return;
      }

      await refreshUser();
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Upload to Supabase Storage via edge function
        const { data, error } = await supabase.functions.invoke('upload-avatar', {
          body: {
            userId: user.id,
            base64Image: base64,
            fileName: file.name,
          }
        });

        if (error || data?.error) {
          console.error('Upload error:', error || data?.error);
          toast.error('Erro ao atualizar foto');
          setIsUploadingAvatar(false);
          return;
        }

        await refreshUser();
        toast.success('Foto atualizada com sucesso!');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Erro ao atualizar foto');
      setIsUploadingAvatar(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize seu nome, telefone e foto de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                  <AvatarImage src={user?.avatar_url || undefined} alt={user?.nome || 'Avatar'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {(user?.nome || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Clique no ícone para alterar a foto
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  value={user?.Email || ''}
                  disabled
                  className="bg-muted h-11"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  className="h-11"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="telefone" className="text-sm font-medium">Telefone</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-11 max-w-md"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="lg"
                className="w-full md:w-auto px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Informações do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Disparador</h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plano:</span>
                  <span className="font-semibold text-foreground">{user?.planoNome || 'Nenhum'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Validade:</span>
                  <span className="font-medium">
                    {user?.dataValidade 
                      ? new Date(user.dataValidade).toLocaleDateString('pt-BR')
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
              <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Extrator</h4>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plano:</span>
                  <span className="font-semibold text-foreground">{user?.planoExtratorNome || 'Nenhum'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Validade:</span>
                  <span className="font-medium">
                    {user?.dataValidadeExtrator 
                      ? new Date(user.dataValidadeExtrator).toLocaleDateString('pt-BR')
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
