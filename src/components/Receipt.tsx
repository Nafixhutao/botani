import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ReceiptItem {
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface ReceiptProps {
  transactionId: string;
  transactionNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  change: number;
  paymentMethod: string;
  transactionType: string;
  createdAt: string;
  notes?: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ 
    transactionNumber,
    customerName,
    customerPhone,
    customerAddress,
    items,
    subtotal,
    discount,
    deliveryFee,
    total,
    paidAmount,
    change,
    paymentMethod,
    transactionType,
    createdAt,
    notes
  }, ref) => {
    return (
      <div ref={ref} className="receipt-font bg-white text-black p-4 max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
          <h1 className="text-lg font-bold">TOKO GALON & GAS</h1>
          <p className="text-sm">Jl. Contoh No. 123</p>
          <p className="text-sm">Telp: (021) 12345678</p>
          <p className="text-sm">Kota Jakarta</p>
        </div>

        {/* Transaction Info */}
        <div className="mb-3 text-sm">
          <div className="flex justify-between">
            <span>No. Transaksi:</span>
            <span>{transactionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{format(new Date(createdAt), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
          </div>
          <div className="flex justify-between">
            <span>Jenis:</span>
            <span className="capitalize">{transactionType}</span>
          </div>
          <div className="flex justify-between">
            <span>Pembayaran:</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
        </div>

        {/* Customer Info */}
        {(customerName || customerPhone || customerAddress) && (
          <div className="mb-3 text-sm border-b border-dashed border-gray-300 pb-2">
            <h3 className="font-semibold mb-1">Data Pelanggan:</h3>
            {customerName && (
              <div className="flex justify-between">
                <span>Nama:</span>
                <span>{customerName}</span>
              </div>
            )}
            {customerPhone && (
              <div className="flex justify-between">
                <span>Telepon:</span>
                <span>{customerPhone}</span>
              </div>
            )}
            {customerAddress && transactionType === 'delivery' && (
              <div className="text-xs mt-1">
                <span>Alamat: {customerAddress}</span>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="border-b border-dashed border-gray-300 pb-2 mb-3">
          <div className="text-sm font-semibold mb-2">Detail Pembelian:</div>
          {items.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium flex-1">{item.product_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</span>
                <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="text-sm space-y-1 mb-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between">
              <span>Diskon:</span>
              <span>-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Ongkos Kirim:</span>
              <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
            </div>
          )}
          
          <div className="border-t border-dashed border-gray-300 pt-1">
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
          
          <div className="flex justify-between">
            <span>Dibayar:</span>
            <span>Rp {paidAmount.toLocaleString('id-ID')}</span>
          </div>
          
          <div className="flex justify-between font-semibold">
            <span>Kembalian:</span>
            <span>Rp {change.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="text-sm border-t border-dashed border-gray-300 pt-2 mb-3">
            <div className="font-semibold">Catatan:</div>
            <div>{notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs border-t border-dashed border-gray-300 pt-3">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          <p>kecuali ada perjanjian tertulis</p>
          <div className="mt-2">
            <p>== STRUK PEMBELIAN ==</p>
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';