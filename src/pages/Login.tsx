import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { PhaseLogo } from '@/components/PhaseLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-messenger-bg relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 text-primary/10 text-6xl pointer-events-none animate-pulse">PHASE</div>
      <div className="absolute top-40 right-20 text-primary/10 text-4xl pointer-events-none animate-pulse delay-700">PHASE</div>
      <div className="absolute bottom-40 left-20 text-primary/10 text-5xl pointer-events-none animate-pulse delay-1000">PHASE</div>
      <div className="absolute bottom-20 right-10 text-primary/10 text-3xl pointer-events-none animate-pulse delay-500">PHASE</div>

      {/* Subtle gradient blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 bg-messenger-sidebar/80 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <PhaseLogo className="w-16 h-16 drop-shadow-[0_0_18px_rgba(244,240,230,0.4)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to continue to Phase</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive flex items-center justify-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="ml-1">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-messenger-card border-border/50 h-12 rounded-xl focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="ml-1">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                className="bg-messenger-card border-border/50 h-12 rounded-xl pr-11 focus-visible:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
