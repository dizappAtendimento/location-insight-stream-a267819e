import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, User, Phone, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

export default function AuthPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Register state
  const [registerNome, setRegisterNome] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerTelefone, setRegisterTelefone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle OAuth errors from URL
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      const message = errorDescription 
        ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        : 'Erro ao fazer login com Google. Tente novamente.';
      toast.error(message);
      
      // Clear the error from URL
      window.history.replaceState({}, '', '/auth');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        toast.error('Erro ao conectar com Google');
        console.error('Google login error:', error);
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
      console.error('Google login error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      toast.error('Digite seu email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Digite um email válido');
      return;
    }

    setIsResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error('Erro ao enviar email de recuperação');
        console.error('Password reset error:', error);
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setIsResetDialogOpen(false);
        setResetEmail('');
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
      console.error('Password reset error:', err);
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    const { error } = await login(email.trim(), password);
    
    setIsLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerNome.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail.trim())) {
      toast.error('Digite um email válido');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsRegistering(true);

    try {
      const { data, error } = await supabase.functions.invoke('auth-register', {
        body: {
          nome: registerNome.trim(),
          email: registerEmail.trim(),
          telefone: registerTelefone.trim(),
          password: registerPassword,
        }
      });

      if (error) {
        toast.error('Erro ao conectar ao servidor');
        console.error('Register error:', error);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(data.message || 'Cadastro realizado com sucesso!');
        setRegisterNome('');
        setRegisterEmail('');
        setRegisterTelefone('');
        setRegisterPassword('');
        setRegisterConfirmPassword('');
        setIsLoginView(true);
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
      console.error('Register error:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d0f17] relative overflow-hidden flex-col justify-center px-12 xl:px-20">
        {/* Diagonal lines background */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute h-[1px] bg-gradient-to-r from-transparent via-highlight/30 to-transparent"
              style={{
                width: '200%',
                top: `${i * 8}%`,
                left: '-50%',
                transform: 'rotate(-15deg)',
              }}
            />
          ))}
        </div>
        
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-highlight/10 rounded-full filter blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-highlight/5 rounded-full filter blur-[80px]" />
        
        {/* Content */}
        <div className="relative z-10">
          <img src={logo} alt="DizApp" className="h-10 w-auto mb-12" />
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
            Bem-vindo ao DizApp
          </h1>
          
          <p className="text-lg text-slate-400 max-w-md">
            Gerencie suas extrações, disparos e conexões em um só lugar
          </p>
        </div>

        {/* Version */}
        <p className="absolute bottom-8 left-12 xl:left-20 text-xs text-slate-600">
          v1.0.0
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 bg-[#111318] flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logo} alt="DizApp" className="h-10 w-auto" />
          </div>

          {isLoginView ? (
            /* Login Form */
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Entrar na sua conta</h2>
                <p className="text-slate-400">Informe seus dados para acessar</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-slate-600 data-[state=checked]:bg-highlight data-[state=checked]:border-highlight"
                    />
                    <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
                      Lembrar-me
                    </label>
                  </div>
                  
                  <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="text-sm text-highlight hover:text-highlight/80 transition-colors"
                      >
                        Esqueci a senha
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-[#1a1d24] border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Recuperar senha</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Digite seu email para receber um link de recuperação de senha.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-slate-300">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="seu@email.com"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              className="pl-11 h-12 bg-[#111318] border-slate-700/50 text-white placeholder:text-slate-500"
                              disabled={isResetLoading}
                              autoComplete="email"
                            />
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-12 bg-highlight text-white hover:bg-highlight/90" 
                          disabled={isResetLoading}
                        >
                          {isResetLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar link de recuperação
                            </>
                          )}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-highlight text-white hover:bg-highlight/90 font-medium text-base" 
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#111318] px-3 text-slate-500">ou continue com</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 border-0 font-medium"
                  onClick={handleGoogleLogin}
                  disabled={isLoading || isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Entrar com Google
                </Button>
              </form>

              <p className="text-center text-slate-400 mt-8">
                Não tem uma conta?{' '}
                <button
                  onClick={() => setIsLoginView(false)}
                  className="text-highlight hover:text-highlight/80 font-medium transition-colors"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          ) : (
            /* Register Form */
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Criar sua conta</h2>
                <p className="text-slate-400">Preencha os dados para se cadastrar</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-nome" className="text-slate-300">Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="register-nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={registerNome}
                      onChange={(e) => setRegisterNome(e.target.value)}
                      className="pl-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isRegistering}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-300">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isRegistering}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-telefone" className="text-slate-300">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="register-telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={registerTelefone}
                      onChange={(e) => setRegisterTelefone(e.target.value)}
                      className="pl-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isRegistering}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-300">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isRegistering}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-slate-300">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="register-confirm-password"
                      type={showRegisterPassword ? 'text' : 'password'}
                      placeholder="Confirme sua senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="pl-11 h-12 bg-[#1a1d24] border-slate-700/50 text-white placeholder:text-slate-500 focus:border-highlight"
                      disabled={isRegistering}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-highlight text-white hover:bg-highlight/90 font-medium text-base mt-2" 
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Conta
                    </>
                  )}
                </Button>

                <p className="text-xs text-slate-500 text-center mt-2">
                  Após o cadastro, sua conta precisará ser ativada por um administrador.
                </p>
              </form>

              <p className="text-center text-slate-400 mt-6">
                Já tem uma conta?{' '}
                <button
                  onClick={() => setIsLoginView(true)}
                  className="text-highlight hover:text-highlight/80 font-medium transition-colors"
                >
                  Entrar
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
