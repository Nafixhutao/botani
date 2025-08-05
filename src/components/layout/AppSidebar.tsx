import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Droplets,
  Flame,
  MessageCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: '/',
  },
  {
    title: 'Transaksi',
    icon: ShoppingCart,
    url: '/transactions',
    submenu: [
      { title: 'Kasir', url: '/transactions/cashier' },
      { title: 'Riwayat', url: '/transactions/history' },
    ],
  },
  {
    title: 'Produk',
    icon: Package,
    url: '/products',
  },
  {
    title: 'Pelanggan',
    icon: Users,
    url: '/customers',
  },
  {
    title: 'Laporan',
    icon: FileText,
    submenu: [
      { title: 'Laporan Harian', url: '/reports/daily' },
      { title: 'Produk Terlaris', url: '/reports/bestselling' },
      { title: 'Keuangan', url: '/reports/financial' },
    ],
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    url: '/analytics',
  },
  {
    title: 'Chat',
    icon: MessageCircle,
    url: '/chat',
  },
  {
    title: 'Pengaturan',
    icon: Settings,
    url: '/settings',
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('Toko Galon & Gas');
  const [userProfile, setUserProfile] = useState<{
    full_name: string;
    avatar_url: string;
  }>(() => {
    // Initialize with cached data if available
    if (user) {
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
    }
    return {
      full_name: '',
      avatar_url: ''
    };
  });
  const [lastFetchTime, setLastFetchTime] = useState(0);


  const fetchUserProfile = React.useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      // Check sessionStorage first for immediate response (faster than localStorage)
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile && !forceRefresh) {
        const parsed = JSON.parse(cachedProfile);
        setUserProfile(parsed);
        return; // Exit early if we have cached data
      }
      
      // Force fresh data by adding timestamp to query
      let query = supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id);
      
      if (forceRefresh) {
        // Add timestamp to completely bypass cache
        query = query.eq('user_id', user.id + '?t=' + Date.now());
      }
      
      const { data } = await query.single();
      
      if (data) {
        const profileData = {
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || ''
        };
        
        setUserProfile(profileData);
        setLastFetchTime(Date.now());
        
        // Cache the data for immediate access (both session and local storage)
        sessionStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
        localStorage.setItem(`profile_${user.id}`, JSON.stringify(profileData));
      }
    } catch (error) {
      console.log('Error fetching user profile:', error);
    }
  }, [user]);

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('store_name')
          .single();
        
        if (data?.store_name) {
          setStoreName(data.store_name);
        }
      } catch (error) {
        console.log('Error fetching store settings:', error);
      }
    };

    fetchStoreSettings();
    
    // Initialize profile immediately when user is available
    if (user) {
      // Check cache first for instant display
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setUserProfile(parsed);
      }
      
      // Then fetch fresh data
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

  // Fetch profile whenever user changes or on mount
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

  // Refresh profile data when location changes
  useEffect(() => {
    if (user && location.pathname) {
      // Always check cache first for immediate response
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setUserProfile(parsed);
      }
      
      // Then refresh from database if needed
      if (Date.now() - lastFetchTime > 1000) {
        fetchUserProfile(true);
      }
    }
  }, [location.pathname, user, fetchUserProfile, lastFetchTime]);

  // Initialize profile data immediately on mount
  useEffect(() => {
    if (user) {
      // Check cache first for immediate display
      const cachedProfile = sessionStorage.getItem(`profile_${user.id}`) || localStorage.getItem(`profile_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        setUserProfile(parsed);
      }
      
      // Then fetch fresh data in background
      fetchUserProfile(true);
    }
  }, [user, fetchUserProfile]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'profile_updated') {
        // Immediate refresh with force flag
        fetchUserProfile(true);
        localStorage.removeItem('profile_updated');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events
    const handleProfileUpdate = (event: CustomEvent) => {
      // Check if event contains new profile data
      if (event.detail && event.detail.profile) {
        const { full_name, avatar_url } = event.detail.profile;
        setUserProfile({ full_name, avatar_url });
        if (user) {
          // Update both storages immediately
          sessionStorage.setItem(`profile_${user.id}`, JSON.stringify({ full_name, avatar_url }));
          localStorage.setItem(`profile_${user.id}`, JSON.stringify({ full_name, avatar_url }));
        }
      } else {
        // Fallback to force refresh
        fetchUserProfile(true);
      }
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    // Listen for global profile name updates
    const handleProfileNameUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.userId === user?.id) {
        setUserProfile(prev => ({
          ...prev,
          full_name: event.detail.name
        }));
      }
    };
    
    window.addEventListener('profileNameUpdated', handleProfileNameUpdate as EventListener);

    // Refresh profile data when location changes (navigation)
    const handleLocationChange = () => {
      if (user) {
        fetchUserProfile(true);
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      window.removeEventListener('profileNameUpdated', handleProfileNameUpdate as EventListener);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [user, fetchUserProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Function to immediately update profile name
  const updateProfileName = React.useCallback((newName: string) => {
    if (!user) return;
    
    const updatedProfile = {
      ...userProfile,
      full_name: newName
    };
    
    setUserProfile(updatedProfile);
    localStorage.setItem(`profile_${user.id}`, JSON.stringify(updatedProfile));
    
    // Also update global state
    window.dispatchEvent(new CustomEvent('profileNameUpdated', { 
      detail: { name: newName, userId: user.id } 
    }));
  }, [user, userProfile]);

  const getUserInitials = (name: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex items-center gap-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <Droplets className="h-4 w-4 text-blue-500" />
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{storeName}</h2>
            <p className="text-xs text-muted-foreground">Sistem Kasir</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.submenu ? (
                <SidebarMenuButton
                  className={`w-full justify-between ${
                    item.submenu.some(sub => location.pathname.startsWith(sub.url))
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  onClick={() => navigate(item.url)}
                  className={
                    location.pathname === item.url || 
                    (item.url !== '/' && location.pathname.startsWith(item.url))
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : ''
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              )}
              
              {item.submenu && (
                <SidebarMenuSub>
                  {item.submenu.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        onClick={() => navigate(subItem.url)}
                        className={
                          location.pathname === subItem.url
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : ''
                        }
                      >
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name} />
                    <AvatarFallback className="rounded-lg">
                      {getUserInitials(userProfile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {userProfile.full_name || 'User'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate('/profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}