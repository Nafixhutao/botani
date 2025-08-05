import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Droplets, Flame, Github, Chrome } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'kasir' as 'admin' | 'kasir' | 'pengantar',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(loginForm.email, loginForm.password);
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signUp(registerForm.email, registerForm.password, registerForm.fullName, registerForm.role);
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google login error:', error);
    }
    setIsLoading(false);
  };

  const handleGithubLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Github login error:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
              <ShoppingCart className="h-10 w-10 text-white" />
            </div>
            <div className="flex gap-2">
              <Droplets className="h-8 w-8 text-blue-500 animate-bounce" style={{animationDelay: '0.1s'}} />
              <Flame className="h-8 w-8 text-orange-500 animate-bounce" style={{animationDelay: '0.2s'}} />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
            Toko Galon & Gas
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistem Kasir Profesional
          </p>
        </div>

        <Card className="shadow-elegant border-0 backdrop-blur-sm bg-white/80 dark:bg-card/80">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Selamat Datang</CardTitle>
            <CardDescription className="text-base">
              Masuk atau daftar untuk menggunakan sistem kasir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleGoogleLogin}
                variant="outline" 
                className="w-full h-12 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                disabled={isLoading}
              >
                <Chrome className="h-5 w-5 mr-3 text-blue-500" />
                Masuk dengan Google
              </Button>
              <Button 
                onClick={handleGithubLogin}
                variant="outline" 
                className="w-full h-12 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                disabled={isLoading}
              >
                <Github className="h-5 w-5 mr-3" />
                Masuk dengan GitHub
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">
                  atau
                </span>
              </div>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="login" className="h-10">Masuk</TabsTrigger>
                <TabsTrigger value="register" className="h-10">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="masukkan email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                      className="h-12 border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="masukkan password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                      className="h-12 border-2 focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? "Memproses..." : "Masuk"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">Nama Lengkap</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="masukkan nama lengkap"
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                      required
                      disabled={isLoading}
                      className="h-12 border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerEmail" className="text-sm font-medium">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="masukkan email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                      className="h-12 border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registerPassword" className="text-sm font-medium">Password</Label>
                    <Input
                      id="registerPassword"
                      type="password"
                      placeholder="masukkan password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                      className="h-12 border-2 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                    <Select 
                      value={registerForm.role} 
                      onValueChange={(value: 'admin' | 'kasir' | 'pengantar') => 
                        setRegisterForm({ ...registerForm, role: value })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="h-12 border-2 focus:border-primary">
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="kasir">Kasir</SelectItem>
                        <SelectItem value="pengantar">Pengantar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? "Memproses..." : "Daftar"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024 Toko Galon & Gas. Sistem Kasir Profesional.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;