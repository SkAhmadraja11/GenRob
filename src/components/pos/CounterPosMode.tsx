import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Check, 
  Volume2, 
  Mic, 
  ShoppingBag, 
  CreditCard, 
  IndianRupee, 
  QrCode, 
  User, 
  Trash2,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Product, recordTransaction } from '../../lib/api';
import { soundFx } from '../../lib/soundFx';
import { getTranslations, SupportedLanguage, translateUnit } from '../../lib/i18n';

interface CartItem {
  product: Product;
  qty: number;
}

interface CounterPosModeProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  language: SupportedLanguage;
  onStockUpdated: () => void;
  onOpenVoice: () => void;
}

export const CounterPosMode: React.FC<CounterPosModeProps> = ({
  isOpen,
  onClose,
  products,
  language,
  onStockUpdated,
  onOpenVoice,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'cash' | 'upi' | 'khata'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const t = getTranslations(language);

  if (!isOpen) return null;

  // Filter top fast-moving counter staples
  const fastMovingProducts = products.slice(0, 8);

  const handleAddToCart = (product: Product, delta: number = 1) => {
    soundFx.playTap();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) {
          return prev.filter((item) => item.product.id !== product.id);
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: newQty } : item
        );
      } else {
        if (delta <= 0) return prev;
        return [...prev, { product, qty: delta }];
      }
    });
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.qty, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // Record all cart items as stock out
      for (const item of cart) {
        await recordTransaction({
          shop_id: item.product.shop_id,
          product_id: item.product.id,
          product_name: item.product.name,
          type: 'out',
          qty: item.qty,
          unit: item.product.unit,
          base_unit: item.product.base_unit,
          unit_conversion: item.product.unit_conversion,
          price: item.product.price,
          total_amount: item.product.price * item.qty,
          source: 'manual',
          notes: `Counter POS Mode (${activePaymentMethod.toUpperCase()})`,
        });
      }

      soundFx.playSuccessChime();
      setCart([]);
      onStockUpdated();
    } catch (err) {
      console.error('POS Checkout error:', err);
      soundFx.playAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0f17] text-slate-100 flex flex-col animate-fade-in select-none">
      {/* ── Top POS Header ─────────────────────────────────────── */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight leading-none">
              {language === 'hi' ? 'दुकान काउंटर मोड' : language === 'te' ? 'కౌంటర్ మోడ్' : 'Counter POS Mode'}
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">Fast One-Handed Checkout</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenVoice}
            className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'बोलें' : language === 'te' ? 'వాయిస్' : 'Voice'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/[0.08] transition"
            title="Exit Counter Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main POS Workspace: Left Grid + Right Cart ─────────── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Quick Product Tiles */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>{language === 'hi' ? 'तेजी से बिकने वाले सामान' : language === 'te' ? 'త్వరగా అమ్ముడయ్యే సరుకులు' : 'Fast-Moving Essentials'}</span>
            <span>{fastMovingProducts.length} Items</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {fastMovingProducts.map((p) => {
              const inCartItem = cart.find((c) => c.product.id === p.id);
              const isLowStock = p.current_stock <= p.reorder_threshold;

              return (
                <div
                  key={p.id}
                  className={`bg-slate-900/80 rounded-xl border p-3 flex flex-col justify-between transition-all duration-150 ${
                    inCartItem
                      ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/30'
                      : 'border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {p.category}
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums font-bold ${
                        isLowStock ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {p.current_stock} left
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-white leading-snug line-clamp-2">
                      {p.name}
                    </h4>

                    {/* Bilingual Roman brand badge */}
                    <span className="text-[9px] font-mono text-slate-400 block mt-0.5 uppercase tracking-wide truncate">
                      {p.sku || p.name}
                    </span>

                    <div className="text-sm font-bold text-slate-200 mt-2 tabular-nums">
                      ₹{p.price} <span className="text-[10px] font-normal text-slate-500">/ {translateUnit(p.unit, language)}</span>
                    </div>
                  </div>

                  {/* Quantity Action Buttons */}
                  <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => handleAddToCart(p, -1)}
                      disabled={!inCartItem}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center text-slate-300 font-bold active:scale-95 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 text-center font-bold text-sm tabular-nums text-white">
                      {inCartItem ? inCartItem.qty : 0}
                    </div>

                    <button
                      onClick={() => handleAddToCart(p, 1)}
                      className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center active:scale-95 transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Real-time Checkout Register Ticket */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900/90 border-t md:border-t-0 md:border-l border-white/[0.08] flex flex-col justify-between">
          <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-white">
                {language === 'hi' ? 'चालू बिल (Ticket)' : language === 'te' ? 'ప్రస్తుత బిల్లు' : 'Current Bill'}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 max-h-48 md:max-h-none">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>{language === 'hi' ? 'सामान जोड़ने के लिए टैप करें' : language === 'te' ? 'సరుకులను జోడించడానికి నొక్కండి' : 'Tap items or speak to add to cart'}</span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-white block truncate">{item.product.name}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {item.qty} × ₹{item.product.price}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-white tabular-nums">
                      ₹{item.qty * item.product.price}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Checkout Panel */}
          <div className="p-3.5 bg-slate-950/80 border-t border-white/[0.08] space-y-3">
            {/* Payment Method Pills */}
            <div className="flex gap-1.5 p-1 bg-slate-900 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => setActivePaymentMethod('cash')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                  activePaymentMethod === 'cash'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cash (नकद)
              </button>
              <button
                onClick={() => setActivePaymentMethod('upi')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                  activePaymentMethod === 'upi'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                UPI / QR
              </button>
              <button
                onClick={() => setActivePaymentMethod('khata')}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                  activePaymentMethod === 'khata'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Khata (उधार)
              </button>
            </div>

            {/* Total Tally */}
            <div className="flex items-baseline justify-between px-1">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Grand Total</span>
                <span className="text-[10px] text-slate-500">{totalItemsCount} items</span>
              </div>
              <span className="text-2xl font-black text-white tabular-nums tracking-tight">
                ₹{cartTotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 disabled:opacity-40"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isProcessing ? 'Recording...' : `Record ₹${cartTotal} (${activePaymentMethod.toUpperCase()})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
