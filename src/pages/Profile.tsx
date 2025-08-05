import React, { useEffect, useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  Save,
  Edit,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface UserProfile {
  id?: string;
  full_name: string;
  phone: string;
  role: string;
  avatar_url: string;
  created_at?: string;
  updated_at?: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Initialize with cached data if available
    if (user) {
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        return {
          full_name: parsed.full_name || '',
          phone: '',
          role: 'kasir',
          avatar_url: parsed.avatar_url || ''
        };
      }
    }
    return {
      full_name: '',
      phone: '',
      role: 'kasir',
      avatar_url: ''
    };
  });

  useEffect(() => {
    // Initialize with cached data immediately
    if (user) {
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setProfile(prev => ({
          ...prev,
          full_name: parsed.full_name || prev.full_name,
          avatar_url: parsed.avatar_url || prev.avatar_url
        }));
      }
    }
    
    // Then load complete profile data
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check cache first for immediate display
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setProfile(prev => ({
          ...prev,
          full_name: parsed.full_name || prev.full_name,
          avatar_url: parsed.avatar_url || prev.avatar_url
        }));
      }
      
      // Then fetch fresh data from database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const updatedProfile = {
          id: data.id,
          full_name: data.full_name,
          phone: data.phone || '',
          role: data.role,
          avatar_url: data.avatar_url || '',
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        
        setProfile(updatedProfile);
        
        // Update cache with complete profile data
        const profileData = {
          full_name: data.full_name,
          avatar_url: data.avatar_url
        };
        sessionStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Gagal memuat profil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update storage immediately with new data
      if (user) {
        const profileData = {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        };
        
        // Update both session and local storage for maximum speed
        sessionStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
        
        // Notify other components immediately with profile data
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { 
            timestamp: Date.now(),
            profile: profileData
          } 
        }));
        localStorage.setItem('profile_updated', Date.now().toString());
      }

      toast({
        title: "Berhasil",
        description: "Profil berhasil diperbarui"
      });

      setEditing(false);
      
      // Reload profile after notification (in background)
      setTimeout(() => {
        loadProfile();
      }, 100);

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui profil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "File harus berupa gambar",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error", 
          description: "Ukuran file maksimal 5MB",
          variant: "destructive"
        });
        return;
      }

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Berhasil",
        description: "Foto profil berhasil diperbarui"
      });

      // Notify other components about the profile update
      // Use CustomEvent for better compatibility
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { timestamp: Date.now() } 
      }));
      localStorage.setItem('profile_updated', Date.now().toString());

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Gagal mengunggah foto profil",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile.avatar_url) return;

    try {
      setUploading(true);

      // Delete from storage
      const oldPath = profile.avatar_url.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldPath}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, avatar_url: '' }));

      toast({
        title: "Berhasil",
        description: "Foto profil berhasil dihapus"
      });

    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Error", 
        description: "Gagal menghapus foto profil",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'kasir':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-600 dark:text-red-400';
      case 'kasir':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };



  return (
    <AppLayout 
      title="Profil Saya" 
      breadcrumbs={[{ label: 'Profil' }]}
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-xl">
                    {profile.full_name ? getUserInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 rounded-full p-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {profile.avatar_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 rounded-full p-0"
                      onClick={removeAvatar}
                      disabled={uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">
                    {profile.full_name || 'Nama Belum Diatur'}
                  </h2>
                  <Badge variant={getRoleBadgeVariant(profile.role)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {profile.role}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                
                {profile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                
                {profile.created_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Bergabung {format(new Date(profile.created_at), 'dd MMMM yyyy', { locale: id })}
                    </span>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => setEditing(!editing)}
                variant={editing ? 'outline' : 'default'}
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                {editing ? 'Batal Edit' : 'Edit Profil'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informasi Profil
            </CardTitle>
            <CardDescription>
              {editing ? 'Ubah nama dan nomor telepon Anda di bawah ini' : 'Informasi detail profil Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="full-name">Nama Lengkap</Label>
                <Input
                  id="full-name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  placeholder="Masukkan nama lengkap"
                  disabled={!editing}
                  className={!editing ? 'bg-muted' : ''}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  placeholder="Masukkan nomor telepon"
                  disabled={!editing}
                  className={!editing ? 'bg-muted' : ''}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email tidak dapat diubah
                </p>
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={profile.role}
                  disabled
                  className={`bg-muted capitalize ${getRoleColor(profile.role)}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Role diatur oleh administrator
                </p>
              </div>
            </div>

            {editing && (
              <div className="flex gap-2 pt-4">
                <Button onClick={saveProfile} disabled={saving} size="lg">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    setEditing(false);
                    loadProfile();
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>
              </div>
            )}
            
            {!editing && (
              <div className="text-sm text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Klik tombol "Edit Profil" di atas untuk mengubah nama dan nomor telepon Anda
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>
              Detail akun dan riwayat aktivitas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>ID Pengguna</Label>
                <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
              </div>
              
              {profile.created_at && (
                <div>
                  <Label>Tanggal Bergabung</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.created_at), 'EEEE, dd MMMM yyyy HH:mm', { locale: id })}
                  </p>
                </div>
              )}
              
              {profile.updated_at && (
                <div>
                  <Label>Terakhir Diperbarui</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(profile.updated_at), 'EEEE, dd MMMM yyyy HH:mm', { locale: id })}
                  </p>
                </div>
              )}
              
              <div>
                <Label>Status Akun</Label>
                <Badge variant="default" className="mt-1">
                  Aktif
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;