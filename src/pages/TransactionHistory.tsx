import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Eye, Calendar, CreditCard, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Transaction {
  id: string;
  transaction_number: string;
  created_at: string;
  transaction_type: 'toko' | 'antar';
  payment_method: 'tunai' | 'transfer' | 'tempo';
  status: string;
  total: number;
  customer_id?: string;
  customers?: {
    name: string;
    phone?: string;
  };
  transaction_items: {
    id: string;
    quantity: number;
    price: number;
    subtotal: number;
    products: {
      name: string;
      unit: string;
    };
  }[];
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          customers(name, phone),
          transaction_items(
            id,
            quantity,
            price,
            subtotal,
            products(name, unit)
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat riwayat transaksi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || transaction.payment_method === paymentFilter;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(transaction.created_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(transaction.created_at) <= new Date(dateTo + 'T23:59:59');
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Selesai</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'tunai':
        return 'Tunai';
      case 'transfer':
        return 'Transfer';
      case 'tempo':
        return 'Tempo';
      default:
        return method;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'toko':
        return 'Ambil di Toko';
      case 'antar':
        return 'Antar ke Alamat';
      default:
        return type;
    }
  };

  return (
    <AppLayout
      title="Riwayat Transaksi"
      breadcrumbs={[
        { label: 'Transaksi', href: '/transactions' },
        { label: 'Riwayat' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Label>Cari</Label>
              <Input
                placeholder="No. transaksi atau nama pelanggan"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pembayaran</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="tempo">Tempo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Daftar Transaksi ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Memuat data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Tidak ada data transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.transaction_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell>
                          {transaction.customers?.name || 'Guest'}
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeText(transaction.transaction_type)}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodText(transaction.payment_method)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell className="font-medium">
                          Rp {transaction.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTransaction(transaction)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Detail Transaksi {transaction.transaction_number}
                                </DialogTitle>
                              </DialogHeader>
                              
                              {selectedTransaction && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span className="font-medium">Tanggal:</span>
                                      </div>
                                      <p>{format(new Date(selectedTransaction.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}</p>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="font-medium">Pelanggan:</span>
                                      </div>
                                      <p>{selectedTransaction.customers?.name || 'Guest'}</p>
                                      {selectedTransaction.customers?.phone && (
                                        <p className="text-sm text-muted-foreground">
                                          {selectedTransaction.customers.phone}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span className="font-medium">Jenis:</span>
                                      </div>
                                      <p>{getTransactionTypeText(selectedTransaction.transaction_type)}</p>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        <span className="font-medium">Pembayaran:</span>
                                      </div>
                                      <p>{getPaymentMethodText(selectedTransaction.payment_method)}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-medium mb-3">Item Transaksi:</h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Produk</TableHead>
                                          <TableHead>Qty</TableHead>
                                          <TableHead>Harga</TableHead>
                                          <TableHead>Subtotal</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedTransaction.transaction_items.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>{item.products.name}</TableCell>
                                            <TableCell>{item.quantity} {item.products.unit}</TableCell>
                                            <TableCell>Rp {item.price.toLocaleString()}</TableCell>
                                            <TableCell>Rp {item.subtotal.toLocaleString()}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  <div className="border-t pt-4">
                                    <div className="flex justify-between font-bold">
                                      <span>Total:</span>
                                      <span>Rp {selectedTransaction.total.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default TransactionHistory;