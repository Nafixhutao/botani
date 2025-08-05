import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  TrendingUp, 
  Package,
  Calendar,
  BarChart3,
  Medal,
  Award,
  Star
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { ContentLoader } from "@/components/ui/loading";

interface BestSellingProduct {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  unit: string;
}

const BestSellingProducts = () => {
  const [products, setProducts] = useState<BestSellingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadBestSellingProducts();
  }, [timeRange]);

  const getDateRange = () => {
    const today = new Date();
    
    switch (timeRange) {
      case 'quarter':
        return {
          start: subMonths(today, 3),
          end: today
        };
      case 'month':
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
      default: // week
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 })
        };
    }
  };

  const loadBestSellingProducts = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      
      const { data } = await supabase
        .from('transaction_items')
        .select(`
          product_id,
          quantity,
          price,
          products!inner(
            name,
            category,
            unit
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

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
            unit: item.products.unit,
            total_quantity: item.quantity,
            total_revenue: Number(item.price) * item.quantity
          });
        }
      });

      const sorted = Array.from(productMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity);

      setProducts(sorted);
    } catch (error) {
      console.error('Error loading best selling products:', error);
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

  const getTimeRangeLabel = () => {
    const { start, end } = getDateRange();
    
    switch (timeRange) {
      case 'quarter':
        return `${format(start, 'dd MMM', { locale: id })} - ${format(end, 'dd MMM yyyy', { locale: id })}`;
      case 'month':
        return format(start, 'MMMM yyyy', { locale: id });
      default:
        return `${format(start, 'dd MMM', { locale: id })} - ${format(end, 'dd MMM yyyy', { locale: id })}`;
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-bold">{index + 1}</span>
          </div>
        );
    }
  };

  const getRankBadgeVariant = (index: number) => {
    switch (index) {
      case 0:
        return 'default';
      case 1:
        return 'secondary';
      case 2:
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <AppLayout title="Produk Terlaris">
        <ContentLoader message="Memuat data produk terlaris..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Produk Terlaris" 
      breadcrumbs={[
        { label: 'Laporan', href: '/reports' },
        { label: 'Produk Terlaris' }
      ]}
    >
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Produk Terlaris</h2>
            <p className="text-muted-foreground">
              Periode: {getTimeRangeLabel()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timeRange} onValueChange={(value: 'week' | 'month' | 'quarter') => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="quarter">3 Bulan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Produk Terjual</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {products.reduce((sum, p) => sum + p.total_quantity, 0).toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-muted-foreground">
                Unit terjual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(products.reduce((sum, p) => sum + p.total_revenue, 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Dari produk terlaris
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jenis Produk</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                Produk terjual
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Best Selling Products List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Daftar Produk Terlaris
            </CardTitle>
            <CardDescription>
              Produk dengan penjualan tertinggi untuk periode {getTimeRangeLabel().toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.length > 0 ? (
                products.map((product, index) => (
                  <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <Badge variant={getRankBadgeVariant(index)}>
                          #{index + 1}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="font-semibold">{product.product_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Kategori: {product.category}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {product.total_quantity.toLocaleString('id-ID')} {product.unit}
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        {formatCurrency(product.total_revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rata-rata: {formatCurrency(product.total_revenue / product.total_quantity)} per {product.unit}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Belum ada data penjualan</h3>
                  <p className="text-muted-foreground">
                    Belum ada produk yang terjual untuk periode {getTimeRangeLabel().toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default BestSellingProducts;