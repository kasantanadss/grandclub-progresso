import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png'

const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleEmailChange = (value: string) => {
    setEmail(value.trim().toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await signUp(email.trim().toLowerCase(), password);
      if (error) {
        setError(error.message);
      } else {
        toast.success('Conta criada neste navegador.');
      }
    } else {
      const { error } = await signIn(email.trim().toLowerCase(), password);
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">         
            <img src={logo} alt="" />         
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">E-mail</label>
            <Input type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Senha</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === 'login' ? <LogIn className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>Não tem conta? <button type="button" onClick={() => setMode('signup')} className="text-primary underline">Criar conta</button></>
            ) : (
              <>Já tem conta? <button type="button" onClick={() => setMode('login')} className="text-primary underline">Entrar</button></>
            )}
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
