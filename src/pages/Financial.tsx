import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  Eye,
  CreditCard,
  Banknote,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Transaction {
  id: string;
  transaction_number: string;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer_id?: string;
  customers?: {
    name: string;
  };
}

interface FinancialStats {
  totalRevenue: number;
  cashRevenue: number;
  transferRevenue: number;
  tempoRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
}

const Financial = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    cashRevenue: 0,
    transferRevenue: 0,
    tempoRevenue: 0,
    totalTransactions: 0,
    avgTransactionValue: 0
  });
  
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadFinancialData();
  }, [filters]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Build query
      let query = supabase
        .from('transactions')
        .select(`
          id,
          transaction_number,
          total,
          payment_method,
          status,
          created_at,
          customer_id,
          customers(name)
        `)
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (filters.paymentMethod !== 'all') {
        query = query.eq('payment_method', filters.paymentMethod as 'tunai' | 'transfer' | 'tempo');
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data: transactionsData, error } = await query;

      if (error) throw error;

      setTransactions(transactionsData || []);

      // Calculate stats
      const totalRevenue = transactionsData?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const cashRevenue = transactionsData?.filter(t => t.payment_method === 'tunai')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const transferRevenue = transactionsData?.filter(t => t.payment_method === 'transfer')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const tempoRevenue = transactionsData?.filter(t => t.payment_method === 'tempo')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const totalTransactions = transactionsData?.length || 0;
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      setStats({
        totalRevenue,
        cashRevenue,
        transferRevenue,
        tempoRevenue,
        totalTransactions,
        avgTransactionValue
      });

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data keuangan",
        variant: "destructive"
      });
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'tunai':
        return <Banknote className="h-4 w-4" />;
      case 'transfer':
        return <CreditCard className="h-4 w-4" />;
      case 'tempo':
        return <Clock className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'tunai':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'transfer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'tempo':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const exportData = () => {
    // Simple CSV export
    const csvContent = [
      ['No Transaksi', 'Tanggal', 'Total', 'Metode Pembayaran', 'Status', 'Pelanggan'],
      ...transactions.map(t => [
        t.transaction_number,
        format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
        t.total,
        t.payment_method,
        t.status,
        t.customers?.name || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-keuangan-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Berhasil",
      description: "Data berhasil diekspor"
    });
  };

  return (
    <AppLayout 
      title="Laporan Keuangan" 
      breadcrumbs={[
        { label: 'Laporan', href: '/reports' },
        { label: 'Keuangan' }
      ]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="start-date">Tanggal Mulai</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Tanggal Akhir</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="payment-method">Metode Pembayaran</Label>
                <Select value={filters.paymentMethod} onValueChange={(value) => setFilters({...filters, paymentMethod: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="tempo">Tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={loadFinancialData} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                Terapkan Filter
              </Button>
              <Button onClick={exportData} variant="outline" disabled={transactions.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Ekspor CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalTransactions} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pembayaran Tunai</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.cashRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRevenue > 0 ? ((stats.cashRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}% dari total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfer Bank</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.transferRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalRevenue > 0 ? ((stats.transferRevenue / stats.totalRevenue) * 100).toFixed(1) : 0}% dari total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgTransactionValue)}</div>
              <p className="text-xs text-muted-foreground">
                Per transaksi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Transaksi</CardTitle>
            <CardDescription>
              Daftar semua transaksi dalam periode yang dipilih
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{transaction.transaction_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), 'EEEE, dd MMMM yyyy HH:mm', { locale: id })}
                        </p>
                        {transaction.customers && (
                          <p className="text-sm text-muted-foreground">
                            Pelanggan: {transaction.customers.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold">{formatCurrency(transaction.total)}</p>
                        <div className="flex gap-2">
                          <Badge className={getPaymentMethodColor(transaction.payment_method)}>
                            <span className="flex items-center gap-1">
                              {getPaymentMethodIcon(transaction.payment_method)}
                              {transaction.payment_method}
                            </span>
                          </Badge>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {transactions.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Tidak ada transaksi dalam periode ini</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Coba ubah filter tanggal atau kriteria lainnya
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Financial;