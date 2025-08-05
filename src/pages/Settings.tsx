import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  Settings as SettingsIcon, 
  Store, 
  Receipt, 
  User, 
  Shield,
  Bell,
  Palette,
  Save
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface StoreSettings {
  id?: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_logo: string;
  tax_rate: number;
  receipt_footer: string;
}

interface UserProfile {
  id?: string;
  full_name: string;
  phone: string;
  role: string;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoBackup: boolean;
  lowStockAlert: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    store_name: 'Toko Galon & Gas',
    store_address: '',
    store_phone: '',
    store_logo: '',
    tax_rate: 0,
    receipt_footer: 'Terima kasih atas kunjungan Anda!'
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    role: 'kasir'
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: theme as 'light' | 'dark' | 'auto',
    notifications: true,
    autoBackup: false,
    lowStockAlert: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load store settings
      const { data: storeData } = await supabase
        .from('store_settings')
        .select('*')
        .single();

      if (storeData) {
        setStoreSettings({
          id: storeData.id,
          store_name: storeData.store_name,
          store_address: storeData.store_address || '',
          store_phone: storeData.store_phone || '',
          store_logo: storeData.store_logo || '',
          tax_rate: Number(storeData.tax_rate),
          receipt_footer: storeData.receipt_footer || 'Terima kasih atas kunjungan Anda!'
        });
      }

      // Load user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileData) {
        setUserProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          phone: profileData.phone || '',
          role: profileData.role
        });
      }

      // App settings would be stored in localStorage
      const savedAppSettings = localStorage.getItem('app_settings');
      if (savedAppSettings) {
        const settings = JSON.parse(savedAppSettings);
        setAppSettings({
          ...settings,
          theme: theme as 'light' | 'dark' | 'auto'
        });
      }

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveStoreSettings = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          ...storeSettings,
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengaturan toko berhasil disimpan"
      });

      // Refresh the page to update sidebar store name
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error saving store settings:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan toko",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveUserProfile = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userProfile.full_name,
          phone: userProfile.phone
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Profil berhasil diperbarui"
      });

    } catch (error) {
      console.error('Error saving user profile:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui profil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAppSettings = () => {
    localStorage.setItem('app_settings', JSON.stringify(appSettings));
    
    // Apply theme changes
    if (appSettings.theme === 'auto') {
      setTheme('system');
    } else {
      setTheme(appSettings.theme);
    }
    
    toast({
      title: "Berhasil",
      description: "Pengaturan aplikasi berhasil disimpan"
    });
  };

  if (loading) {
    return (
      <AppLayout title="Pengaturan">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Pengaturan" 
      breadcrumbs={[{ label: 'Pengaturan' }]}
    >
      <div className="space-y-6">
        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Pengaturan Toko
            </CardTitle>
            <CardDescription>
              Informasi dan konfigurasi toko
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="store-name">Nama Toko</Label>
                <Input
                  id="store-name"
                  value={storeSettings.store_name}
                  onChange={(e) => setStoreSettings({...storeSettings, store_name: e.target.value})}
                  placeholder="Nama toko Anda"
                />
              </div>
              <div>
                <Label htmlFor="store-phone">Nomor Telepon</Label>
                <Input
                  id="store-phone"
                  value={storeSettings.store_phone}
                  onChange={(e) => setStoreSettings({...storeSettings, store_phone: e.target.value})}
                  placeholder="Nomor telepon toko"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="store-address">Alamat Toko</Label>
              <Textarea
                id="store-address"
                value={storeSettings.store_address}
                onChange={(e) => setStoreSettings({...storeSettings, store_address: e.target.value})}
                placeholder="Alamat lengkap toko"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="tax-rate">Pajak (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  step="0.01"
                  value={storeSettings.tax_rate}
                  onChange={(e) => setStoreSettings({...storeSettings, tax_rate: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="store-logo">URL Logo</Label>
                <Input
                  id="store-logo"
                  value={storeSettings.store_logo}
                  onChange={(e) => setStoreSettings({...storeSettings, store_logo: e.target.value})}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="receipt-footer">Footer Struk</Label>
              <Textarea
                id="receipt-footer"
                value={storeSettings.receipt_footer}
                onChange={(e) => setStoreSettings({...storeSettings, receipt_footer: e.target.value})}
                placeholder="Pesan yang akan muncul di bawah struk"
                rows={2}
              />
            </div>

            <Button onClick={saveStoreSettings} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Pengaturan Toko
            </Button>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil Pengguna
            </CardTitle>
            <CardDescription>
              Informasi akun dan profil Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="full-name">Nama Lengkap</Label>
                <Input
                  id="full-name"
                  value={userProfile.full_name}
                  onChange={(e) => setUserProfile({...userProfile, full_name: e.target.value})}
                  placeholder="Nama lengkap Anda"
                />
              </div>
              <div>
                <Label htmlFor="user-phone">Nomor Telepon</Label>
                <Input
                  id="user-phone"
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile({...userProfile, phone: e.target.value})}
                  placeholder="Nomor telepon Anda"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email tidak dapat diubah
                </p>
              </div>
              <div>
                <Label htmlFor="user-role">Role</Label>
                <Input
                  id="user-role"
                  value={userProfile.role}
                  disabled
                  className="bg-muted capitalize"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Role diatur oleh administrator
                </p>
              </div>
            </div>

            <Button onClick={saveUserProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Profil
            </Button>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Pengaturan Aplikasi
            </CardTitle>
            <CardDescription>
              Preferensi dan konfigurasi aplikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifikasi
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tampilkan notifikasi untuk aktivitas penting
                </p>
              </div>
              <Switch
                checked={appSettings.notifications}
                onCheckedChange={(checked) => setAppSettings({...appSettings, notifications: checked})}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Auto Backup
                </Label>
                <p className="text-sm text-muted-foreground">
                  Backup otomatis data setiap hari
                </p>
              </div>
              <Switch
                checked={appSettings.autoBackup}
                onCheckedChange={(checked) => setAppSettings({...appSettings, autoBackup: checked})}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Peringatan Stok Rendah</Label>
                <p className="text-sm text-muted-foreground">
                  Notifikasi ketika stok produk menipis
                </p>
              </div>
              <Switch
                checked={appSettings.lowStockAlert}
                onCheckedChange={(checked) => setAppSettings({...appSettings, lowStockAlert: checked})}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Tema Aplikasi
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAppSettings({...appSettings, theme: 'light'});
                    setTheme('light');
                  }}
                >
                  Terang
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAppSettings({...appSettings, theme: 'dark'});
                    setTheme('dark');
                  }}
                >
                  Gelap
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAppSettings({...appSettings, theme: 'auto'});
                    setTheme('system');
                  }}
                >
                  Auto
                </Button>
              </div>
            </div>

            <Button onClick={saveAppSettings}>
              <Save className="h-4 w-4 mr-2" />
              Simpan Pengaturan Aplikasi
            </Button>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Informasi Sistem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Versi Aplikasi</Label>
                <p className="text-sm text-muted-foreground">v1.0.0</p>
              </div>
              <div>
                <Label>Database</Label>
                <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
              </div>
              <div>
                <Label>Last Backup</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('id-ID')} (Auto)
                </p>
              </div>
              <div>
                <Label>Storage Used</Label>
                <p className="text-sm text-muted-foreground">2.3 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;