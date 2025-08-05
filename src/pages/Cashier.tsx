import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from '@/hooks/use-toast';
import { Receipt } from '@/components/Receipt';
import { useReactToPrint } from 'react-to-print';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  ShoppingCart, 
  User, 
  CreditCard,
  X,
  Printer as PrinterIcon,
  Store,
  Truck
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

const Cashier = () => {
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'toko' | 'antar'>('toko');
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'transfer' | 'tempo'>('tunai');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat produk",
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
  };

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat pelanggan",
        variant: "destructive",
      });
    } else {
      setCustomers(data || []);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        updateCartQuantity(product.id, existingItem.quantity + 1);
      } else {
        toast({
          title: "Stok Tidak Cukup",
          description: `Stok ${product.name} hanya tersisa ${product.stock}`,
          variant: "destructive",
        });
      }
    } else {
      if (product.stock > 0) {
        const newItem: CartItem = {
          product,
          quantity: 1,
          price: product.price,
          subtotal: product.price
        };
        setCart([...cart, newItem]);
      } else {
        toast({
          title: "Stok Habis",
          description: `${product.name} sedang habis`,
          variant: "destructive",
        });
      }
    }
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast({
        title: "Stok Tidak Cukup",
        description: `Stok ${product.name} hanya tersisa ${product.stock}`,
        variant: "destructive",
      });
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          subtotal: item.price * newQuantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountValue = parseFloat(discount) || 0;
  const deliveryFeeValue = parseFloat(deliveryFee) || 0;
  const paidAmountValue = parseFloat(paidAmount) || 0;
  const totalAfterDiscount = subtotal - discountValue;
  const finalTotal = totalAfterDiscount + deliveryFeeValue;
  const changeAmount = paidAmountValue - finalTotal;

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Struk-${lastTransaction?.transaction_number || 'Transaction'}`,
  });

  const processTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Keranjang Kosong",
        description: "Tambahkan produk ke keranjang terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'tunai' && paidAmountValue < finalTotal) {
      toast({
        title: "Pembayaran Kurang",
        description: "Jumlah bayar kurang dari total",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate transaction number first
      const { data: transactionNumberData, error: numberError } = await supabase
        .rpc('generate_transaction_number');

      if (numberError) throw numberError;

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumberData,
          user_id: user?.id,
          customer_id: selectedCustomer || null,
          transaction_type: transactionType,
          payment_method: paymentMethod,
          subtotal,
          discount: discountValue,
          delivery_fee: deliveryFeeValue,
          total: finalTotal,
          paid_amount: paidAmountValue,
          change_amount: paymentMethod === 'tunai' ? changeAmount : 0,
          delivery_address: transactionType === 'antar' ? deliveryAddress : null,
          notes,
          status: paymentMethod === 'tempo' ? 'pending' : 'completed'
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity })
          .eq('id', item.product.id);

        if (stockError) throw stockError;
      }

      // Set last transaction for receipt
      setLastTransaction({
        ...transaction,
        items: cart.map(item => ({
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        })),
        customer_name: customers.find(c => c.id === selectedCustomer)?.name,
        customer_phone: customers.find(c => c.id === selectedCustomer)?.phone,
        customer_address: deliveryAddress || customers.find(c => c.id === selectedCustomer)?.address,
        subtotal: subtotal,
        discount: discountValue,
        delivery_fee: deliveryFeeValue,
        total: finalTotal,
        paid_amount: paidAmountValue,
        change: changeAmount,
        payment_method: paymentMethod,
        transaction_type: transactionType,
        notes: notes
      });

      toast({
        title: "Transaksi Berhasil",
        description: `Transaksi ${transaction.transaction_number} telah berhasil diproses`,
      });

      // Show receipt
      setShowReceipt(true);

      // Reset form
      setCart([]);
      setSelectedCustomer('');
      setPaidAmount('');
      setDeliveryAddress('');
      setDeliveryFee('');
      setNotes('');
      setDiscount('');
      setTransactionType('toko');
      setPaymentMethod('tunai');

      // Refresh products to update stock
      fetchProducts();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal memproses transaksi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      title="Kasir"
      breadcrumbs={[
        { label: 'Transaksi', href: '/transactions' },
        { label: 'Kasir' }
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-card border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                Pilih Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Input
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 text-lg border-2 focus:border-primary"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-2 hover:border-primary/20"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base">{product.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                            <p className="text-lg font-bold text-primary">
                              Rp {product.price.toLocaleString('id-ID')}
                            </p>
                          </div>
                          <Badge 
                            variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                            className="ml-2"
                          >
                            {product.stock} {product.unit}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart and Transaction Section */}
        <div className="space-y-4">
          {/* Cart */}
          <Card className="shadow-card border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-primary/5 border-b">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-accent/10 rounded-full">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Keranjang kosong</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 border-2 rounded-xl hover:border-primary/20 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Rp {item.price.toLocaleString('id-ID')} × {item.quantity}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          Rp {item.subtotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0 ml-1"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card className="shadow-card border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                Detail Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Pelanggan</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="h-11 border-2 focus:border-primary">
                    <SelectValue placeholder="Pilih pelanggan (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Jenis Transaksi</Label>
                <Select value={transactionType} onValueChange={(value: 'toko' | 'antar') => setTransactionType(value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toko">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Ambil di Toko
                      </div>
                    </SelectItem>
                    <SelectItem value="antar">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Antar ke Alamat
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transactionType === 'antar' && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Alamat Pengiriman</Label>
                    <Textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap"
                      className="border-2 focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Ongkos Kirim</Label>
                    <Input
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="0"
                      className="h-11 border-2 focus:border-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <Label className="text-sm font-medium">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(value: 'tunai' | 'transfer' | 'tempo') => setPaymentMethod(value)}>
                  <SelectTrigger className="h-11 border-2 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="tempo">Tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Diskon</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="h-11 border-2 focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Catatan</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan (opsional)"
                  className="border-2 focus:border-primary"
                />
              </div>

              <Separator />

              {/* Summary */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Diskon:</span>
                    <span className="font-medium text-red-600">-Rp {discountValue.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {deliveryFeeValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Ongkir:</span>
                    <span className="font-medium">Rp {deliveryFeeValue.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">Rp {finalTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {paymentMethod === 'tunai' && (
                <div>
                  <Label className="text-sm font-medium">Jumlah Bayar</Label>
                  <Input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Masukkan jumlah bayar"
                    className="h-11 border-2 focus:border-primary text-lg"
                  />
                  {paidAmountValue > 0 && (
                    <div className="mt-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
                      <div className="flex justify-between font-semibold">
                        <span>Kembalian:</span>
                        <span className={changeAmount < 0 ? "text-destructive" : "text-primary text-lg"}>
                          Rp {changeAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={processTransaction}
                disabled={loading || cart.length === 0}
                className="w-full h-12 gradient-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? "Memproses..." : "Proses Transaksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Modal/Dialog */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border">
            <div className="p-4 border-b flex items-center justify-between bg-primary/5">
              <h3 className="text-lg font-semibold">Struk Transaksi</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReceipt(false)}
                className="h-8 w-8 rounded-full hover:bg-primary/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4">
              <Receipt
                ref={receiptRef}
                transactionId={lastTransaction.id}
                transactionNumber={lastTransaction.transaction_number}
                customerName={lastTransaction.customer_name}
                customerPhone={lastTransaction.customer_phone}
                customerAddress={lastTransaction.customer_address}
                items={lastTransaction.items}
                subtotal={lastTransaction.subtotal}
                discount={lastTransaction.discount}
                deliveryFee={lastTransaction.delivery_fee}
                total={lastTransaction.total}
                paidAmount={lastTransaction.paid_amount}
                change={lastTransaction.change}
                paymentMethod={lastTransaction.payment_method}
                transactionType={lastTransaction.transaction_type}
                createdAt={lastTransaction.created_at}
                notes={lastTransaction.notes}
              />
            </div>

            <div className="p-4 border-t bg-muted/30 flex gap-3">
              <Button
                onClick={handlePrint}
                className="flex-1 h-11 gradient-primary text-white font-medium shadow-md hover:shadow-lg transition-all"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Cetak Struk
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReceipt(false)}
                className="flex-1 h-11 border-2"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Cashier;