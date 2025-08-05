import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Calendar, TrendingUp, TrendingDown, DollarSign, Package, Users, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface DailyReport {
  id: string;
  report_date: string;
  opening_balance: number;
  total_sales: number;
  cash_sales: number;
  transfer_sales: number;
  tempo_sales: number;
  total_cost: number;
  total_profit: number;
  closing_balance: number;
  total_transactions: number;
}

const Reports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayStats, setTodayStats] = useState({
    sales: 0,
    transactions: 0,
    profit: 0,
    customers: 0
  });

  useEffect(() => {
    loadReports();
    loadTodayStats();
  }, [selectedDate]);

  const loadReports = async () => {
    try {
      const { data } = await supabase
        .from('daily_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(30);

      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load today's transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('total, customer_id')
        .gte('created_at', today)
        .lt('created_at', `${today}T23:59:59`);

      const sales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const transactionCount = transactions?.length || 0;
      const uniqueCustomers = new Set(transactions?.map(t => t.customer_id).filter(Boolean)).size;

      setTodayStats({
        sales,
        transactions: transactionCount,
        profit: sales * 0.2, // Simplified profit calculation
        customers: uniqueCustomers
      });
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const generateDailyReport = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          total,
          payment_method,
          transaction_items(
            quantity,
            price,
            products(cost_price)
          )
        `)
        .gte('created_at', today)
        .lt('created_at', `${today}T23:59:59`);

      const totalSales = transactions?.reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const cashSales = transactions?.filter(t => t.payment_method === 'tunai')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const transferSales = transactions?.filter(t => t.payment_method === 'transfer')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;
      const tempoSales = transactions?.filter(t => t.payment_method === 'tempo')
        .reduce((sum, t) => sum + Number(t.total), 0) || 0;

      let totalCost = 0;
      transactions?.forEach(transaction => {
        transaction.transaction_items?.forEach(item => {
          const costPrice = item.products?.cost_price || 0;
          totalCost += Number(costPrice) * item.quantity;
        });
      });

      const totalProfit = totalSales - totalCost;

      // Insert or update daily report
      const { error } = await supabase
        .from('daily_reports')
        .upsert({
          report_date: today,
          opening_balance: 0, // Could be calculated from previous day
          total_sales: totalSales,
          cash_sales: cashSales,
          transfer_sales: transferSales,
          tempo_sales: tempoSales,
          total_cost: totalCost,
          total_profit: totalProfit,
          closing_balance: totalProfit, // Simplified calculation
          total_transactions: transactions?.length || 0,
          created_by: user?.id
        });

      if (error) throw error;

      await loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
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

  return (
    <AppLayout 
      title="Laporan Harian" 
      breadcrumbs={[
        { label: 'Laporan', href: '/reports' },
        { label: 'Harian' }
      ]}
    >
      <div className="space-y-6">
        {/* Generate Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generate Laporan Harian
            </CardTitle>
            <CardDescription>
              Buat laporan untuk tanggal hari ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="report-date">Tanggal Laporan</Label>
                <Input
                  id="report-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <Button onClick={generateDailyReport} disabled={loading}>
                <FileDown className="h-4 w-4 mr-2" />
                Generate Laporan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayStats.sales)}</div>
              <p className="text-xs text-muted-foreground">
                {todayStats.transactions} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimasi Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayStats.profit)}</div>
              <p className="text-xs text-muted-foreground">
                Margin penjualan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pelanggan Unik</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.customers}</div>
              <p className="text-xs text-muted-foreground">
                Hari ini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.transactions}</div>
              <p className="text-xs text-muted-foreground">
                Total hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reports History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Laporan Harian</CardTitle>
            <CardDescription>30 laporan terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">
                        {format(new Date(report.report_date), 'EEEE, dd MMMM yyyy', { locale: id })}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {report.total_transactions} transaksi
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(report.total_sales)}</p>
                      <p className="text-sm text-muted-foreground">Total Penjualan</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h5 className="font-medium mb-2">Metode Pembayaran</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Tunai:</span>
                          <span>{formatCurrency(report.cash_sales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transfer:</span>
                          <span>{formatCurrency(report.transfer_sales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tempo:</span>
                          <span>{formatCurrency(report.tempo_sales)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Keuangan</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total Biaya:</span>
                          <span>{formatCurrency(report.total_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Profit:</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(report.total_profit)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Margin:</span>
                          <span>
                            {report.total_sales > 0 
                              ? ((report.total_profit / report.total_sales) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Saldo</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Saldo Awal:</span>
                          <span>{formatCurrency(report.opening_balance)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Saldo Akhir:</span>
                          <span>{formatCurrency(report.closing_balance)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {reports.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada laporan harian</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Klik "Generate Laporan" untuk membuat laporan pertama
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

export default Reports;