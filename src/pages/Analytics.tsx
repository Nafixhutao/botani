import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Calendar,
  DollarSign,
  Crown,
  Star,
  Target,
  PieChart,
  Activity,
  ShoppingCart
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BestSellingProduct {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_spent: number;
  last_order: string;
  is_regular: boolean;
}

interface SalesAnalytics {
  date: string;
  total_sales: number;
  transaction_count: number;
  avg_order_value: number;
}

const Analytics = () => {
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<CustomerAnalytics[]>([]);
  const [weeklyAnalytics, setWeeklyAnalytics] = useState<SalesAnalytics[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadBestSellingProducts(),
        loadTopCustomers(),
        loadSalesAnalytics(),
        loadPaymentMethodData(),
        loadCategoryData(),
        loadHourlyData()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    switch (timeRange) {
      case 'week':
        return {
          start: startOfWeek(today),
          end: endOfWeek(today)
        };
      case 'month':
        return {
          start: subDays(today, 30),
          end: today
        };
      case 'quarter':
        return {
          start: subDays(today, 90),
          end: today
        };
      default:
        return {
          start: startOfWeek(today),
          end: endOfWeek(today)
        };
    }
  };

  const loadBestSellingProducts = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transaction_items')
        .select(`
          product_id,
          quantity,
          price,
          products!inner(
            name,
            category
          ),
          transactions!inner(
            created_at
          )
        `)
        .gte('transactions.created_at', start.toISOString())
        .lte('transactions.created_at', end.toISOString());

      // Group by product and calculate totals
      const productMap = new Map<string, BestSellingProduct>();
      
      data?.forEach(item => {
        const productId = item.product_id;
        const existing = productMap.get(productId);
        
        if (existing) {
          existing.total_quantity += item.quantity;
          existing.total_revenue += Number(item.price) * item.quantity;
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: item.products.name,
            category: item.products.category,
            total_quantity: item.quantity,
            total_revenue: Number(item.price) * item.quantity
          });
        }
      });

      const sorted = Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 10);

      setBestSellingProducts(sorted);
    } catch (error) {
      console.error('Error loading best selling products:', error);
    }
  };

  const loadTopCustomers = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transactions')
        .select(`
          customer_id,
          total,
          created_at,
          customers(
            name,
            is_regular
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .not('customer_id', 'is', null);

      // Group by customer and calculate totals
      const customerMap = new Map<string, CustomerAnalytics>();
      
      data?.forEach(transaction => {
        const customerId = transaction.customer_id!;
        const existing = customerMap.get(customerId);
        
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += Number(transaction.total);
          if (new Date(transaction.created_at) > new Date(existing.last_order)) {
            existing.last_order = transaction.created_at;
          }
        } else {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: transaction.customers?.name || 'Unknown',
            total_orders: 1,
            total_spent: Number(transaction.total),
            last_order: transaction.created_at,
            is_regular: transaction.customers?.is_regular || false
          });
        }
      });

      const sorted = Array.from(customerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10);

      setTopCustomers(sorted);
    } catch (error) {
      console.error('Error loading top customers:', error);
    }
  };

  const loadSalesAnalytics = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transactions')
        .select('total, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Group by date
      const dateMap = new Map<string, SalesAnalytics>();
      
      data?.forEach(transaction => {
        const date = transaction.created_at.split('T')[0];
        const existing = dateMap.get(date);
        
        if (existing) {
          existing.total_sales += Number(transaction.total);
          existing.transaction_count += 1;
          existing.avg_order_value = existing.total_sales / existing.transaction_count;
        } else {
          dateMap.set(date, {
            date,
            total_sales: Number(transaction.total),
            transaction_count: 1,
            avg_order_value: Number(transaction.total)
          });
        }
      });

      const sorted = Array.from(dateMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setWeeklyAnalytics(sorted);
    } catch (error) {
      console.error('Error loading sales analytics:', error);
    }
  };

  const loadPaymentMethodData = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transactions')
        .select('payment_method, total')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const methodMap = new Map<string, number>();
      data?.forEach(transaction => {
        const method = transaction.payment_method;
        methodMap.set(method, (methodMap.get(method) || 0) + Number(transaction.total));
      });

      const methodData = Array.from(methodMap.entries()).map(([method, total]) => ({
        name: method === 'tunai' ? 'Tunai' : method === 'transfer' ? 'Transfer' : 'Tempo',
        value: total,
        percentage: 0
      }));

      const totalValue = methodData.reduce((sum, item) => sum + item.value, 0);
      methodData.forEach(item => {
        item.percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
      });

      setPaymentMethodData(methodData);
    } catch (error) {
      console.error('Error loading payment method data:', error);
    }
  };

  const loadCategoryData = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          price,
          products!inner(
            category
          ),
          transactions!inner(
            created_at
          )
        `)
        .gte('transactions.created_at', start.toISOString())
        .lte('transactions.created_at', end.toISOString());

      const categoryMap = new Map<string, { quantity: number, revenue: number }>();
      data?.forEach(item => {
        const category = item.products.category;
        const existing = categoryMap.get(category);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += Number(item.price) * item.quantity;
        } else {
          categoryMap.set(category, {
            quantity: item.quantity,
            revenue: Number(item.price) * item.quantity
          });
        }
      });

      const categoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        quantity: data.quantity,
        revenue: data.revenue
      }));

      setCategoryData(categoryData);
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  };

  const loadHourlyData = async () => {
    try {
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transactions')
        .select('total, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const hourlyMap = new Map<number, { sales: number, count: number }>();
      
      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { sales: 0, count: 0 });
      }

      data?.forEach(transaction => {
        const hour = new Date(transaction.created_at).getHours();
        const existing = hourlyMap.get(hour)!;
        existing.sales += Number(transaction.total);
        existing.count += 1;
      });

      const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        sales: data.sales,
        transactions: data.count
      }));

      setHourlyData(hourlyData);
    } catch (error) {
      console.error('Error loading hourly data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  if (loading) {
    return (
      <AppLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Analytics" 
      breadcrumbs={[{ label: 'Analytics' }]}
    >
      <div className="space-y-6">
        {/* Time Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analisa Penjualan
            </CardTitle>
            <CardDescription>
              Insight dan analisa performa toko
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant={timeRange === 'week' ? 'default' : 'outline'}
                onClick={() => setTimeRange('week')}
                size="sm"
              >
                Minggu Ini
              </Button>
              <Button 
                variant={timeRange === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeRange('month')}
                size="sm"
              >
                30 Hari
              </Button>
              <Button 
                variant={timeRange === 'quarter' ? 'default' : 'outline'}
                onClick={() => setTimeRange('quarter')}
                size="sm"
              >
                90 Hari
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(weeklyAnalytics.reduce((sum, day) => sum + day.total_sales, 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                {timeRange === 'week' ? 'Minggu ini' : timeRange === 'month' ? '30 hari terakhir' : '90 hari terakhir'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {weeklyAnalytics.reduce((sum, day) => sum + day.transaction_count, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Transaksi terjadi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata per Order</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {weeklyAnalytics.length > 0 
                  ? formatCurrency(
                      weeklyAnalytics.reduce((sum, day) => sum + day.total_sales, 0) /
                      weeklyAnalytics.reduce((sum, day) => sum + day.transaction_count, 0)
                    )
                  : formatCurrency(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Per transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produk Terjual</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bestSellingProducts.reduce((sum, product) => sum + product.total_quantity, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sales Trend Chart */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Tren Penjualan
              </CardTitle>
              <CardDescription>
                Grafik penjualan harian dan jumlah transaksi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'EEEE, dd MMM yyyy', { locale: id })}
                    formatter={(value, name) => [
                      name === 'total_sales' ? formatCurrency(Number(value)) : value,
                      name === 'total_sales' ? 'Penjualan' : 'Transaksi'
                    ]}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="total_sales"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Penjualan"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transaction_count"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    name="Transaksi"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-500" />
                Metode Pembayaran
              </CardTitle>
              <CardDescription>
                Distribusi metode pembayaran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={paymentMethodData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Performa Kategori
              </CardTitle>
              <CardDescription>
                Penjualan per kategori produk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={80} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hourly Sales Pattern */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Pola Penjualan per Jam
              </CardTitle>
              <CardDescription>
                Distribusi penjualan berdasarkan jam buka toko
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'sales' ? formatCurrency(Number(value)) : value,
                      name === 'sales' ? 'Penjualan' : 'Transaksi'
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="sales"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.7}
                    name="Penjualan"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="transactions"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    name="Transaksi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Produk Terlaris
              </CardTitle>
              <CardDescription>
                Top 5 produk dengan penjualan tertinggi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bestSellingProducts.slice(0, 5).map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{product.total_quantity}</p>
                      <p className="text-xs text-green-600">{formatCurrency(product.total_revenue)}</p>
                    </div>
                  </div>
                ))}
                {bestSellingProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Belum ada data produk
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-500" />
                Pelanggan Terbaik
              </CardTitle>
              <CardDescription>
                Top 5 pelanggan berdasarkan total pembelian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer.customer_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm">{customer.customer_name}</p>
                          {customer.is_regular && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Reguler
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{customer.total_orders} pesanan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm text-green-600">{formatCurrency(customer.total_spent)}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(customer.total_spent / customer.total_orders)}
                      </p>
                    </div>
                  </div>
                ))}
                {topCustomers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Belum ada data pelanggan
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Analytics;