import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Users, 
  Package, 
  DollarSign,
  Calendar,
  BarChart3,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DashboardSkeleton } from "@/components/ui/loading";

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  lowStockCount: number;
  totalCustomers: number;
  totalProducts: number;
}

interface RecentTransaction {
  id: string;
  transaction_number: string;
  total: number;
  customer_name?: string;
  created_at: string;
  transaction_type: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  category: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    todayProfit: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Load today's sales
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select(`
          total,
          subtotal,
          transaction_items(
            quantity,
            price,
            products(cost_price)
          )
        `)
        .gte('created_at', today)
        .lt('created_at', `${today}T23:59:59`);

      // Calculate today's stats
      const todaySales = todayTransactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const todayCount = todayTransactions?.length || 0;
      
      // Calculate profit (simplified)
      let todayProfit = 0;
      todayTransactions?.forEach(transaction => {
        transaction.transaction_items?.forEach(item => {
          const costPrice = item.products?.cost_price || 0;
          const profit = (Number(item.price) - Number(costPrice)) * item.quantity;
          todayProfit += profit;
        });
      });

      // Load low stock products
      const { data: lowStock } = await supabase
        .from('products')
        .select('id, name, stock, min_stock, category')
        .filter('stock', 'lte', 'min_stock')
        .eq('is_active', true);

      // Load total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Load total products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Load recent transactions
      const { data: recent } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          total,
          created_at,
          transaction_type,
          customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todaySales,
        todayTransactions: todayCount,
        todayProfit,
        lowStockCount: lowStock?.length || 0,
        totalCustomers: customerCount || 0,
        totalProducts: productCount || 0,
      });

      setRecentTransactions(recent?.map(t => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total: Number(t.total),
        customer_name: t.customers?.name,
        created_at: t.created_at,
        transaction_type: t.transaction_type,
      })) || []);

      setLowStockProducts(lowStock || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Dashboard" 
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="gradient-primary rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Selamat Datang, {userProfile?.full_name || 'User'}!
              </h2>
              <p className="text-white/80">
                Hari ini, {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}
              </p>
            </div>
            <Button
              onClick={() => navigate('/transactions/cashier')}
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Transaksi Baru
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {stats.todayTransactions} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Keuntungan Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todayProfit)}</div>
              <p className="text-xs text-muted-foreground">
                Margin dari penjualan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pelanggan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">
                Terdaftar di sistem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                Produk perlu restock
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Transaksi Terbaru
              </CardTitle>
              <CardDescription>5 transaksi terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{transaction.transaction_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'HH:mm, dd MMM', { locale: id })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(transaction.total)}</p>
                      <Badge variant={transaction.transaction_type === 'antar' ? 'secondary' : 'default'}>
                        {transaction.transaction_type === 'antar' ? 'Antar' : 'Toko'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada transaksi hari ini
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/transactions/history')}
                >
                  Lihat Semua Transaksi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Peringatan Stok
              </CardTitle>
              <CardDescription>Produk yang perlu direstock</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {product.stock} / {product.min_stock}
                      </Badge>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Semua produk stoknya aman
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/products')}
                >
                  Kelola Produk
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Fitur yang sering digunakan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/transactions/cashier')}
              >
                <ShoppingCart className="h-6 w-6" />
                <span>Kasir</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/products')}
              >
                <Package className="h-6 w-6" />
                <span>Produk</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/customers')}
              >
                <Users className="h-6 w-6" />
                <span>Pelanggan</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => navigate('/reports/daily')}
              >
                <BarChart3 className="h-6 w-6" />
                <span>Laporan</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;