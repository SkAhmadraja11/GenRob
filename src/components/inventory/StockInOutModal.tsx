import React, { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, CheckCircle2, Scale } from 'lucide-react';
import { Product, recordTransaction } from '../../lib/api';
import { calculateBaseQuantity } from '../../lib/tradeVocabulary';
import { getTranslations, translateUnit, SupportedLanguage } from '../../lib/i18n';

interface StockInOutModalProps {
  product: Product | null;
  direction: 'in' | 'out';
  language: SupportedLanguage;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockInOutModal: React.FC<StockInOutModalProps> = ({
  product,
  direction: initialDirection,
  language,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !product) return null;

  const [direction, setDirection] = useState<'in' | 'out'>(initialDirection);
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState<string>(product.unit);
  const [price, setPrice] = useState<number>(product.price);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const t = getTranslations(language);

  const baseQty = calculateBaseQuantity(qty, unit, product.base_unit, product.unit_conversion);
  const totalAmount = qty * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await recordTransaction({
        shop_id: product.shop_id,
        product_id: product.id,
        product_name: product.name,
        type: direction,
        qty,
        unit,
        base_unit: product.base_unit,
        unit_conversion: product.unit_conversion,
        price,
        total_amount: totalAmount,
        source: 'manual',
        notes: 'Manual inventory entry',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error updating stock: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-base text-white mb-1">
          {direction === 'in' ? t.stockInModalTitle : t.stockOutModalTitle}
        </h3>
        <p className="text-xs text-amber-400 font-semibold mb-4">{product.name}</p>

        {/* Direction Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setDirection('in')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
              direction === 'in'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.stockInAction}</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('out')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
              direction === 'out'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            <span>{t.stockOutAction}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.qtyLabel}</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.unitLabel}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold"
              >
                <option value={product.unit}>{translateUnit(product.unit, language)} (Trade)</option>
                <option value={product.base_unit}>{translateUnit(product.base_unit, language)} (Base)</option>
              </select>
            </div>
          </div>

          {unit !== product.base_unit && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <Scale className="w-3 h-3" />
                <span>{t.baseQtyCalc}:</span>
              </span>
              <span className="font-bold">{baseQty} {translateUnit(product.base_unit, language)}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-300 mb-1">{t.unitPriceLabel}</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t.totalValueLabel}:</span>
            <span className="font-extrabold text-amber-400 text-sm">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? '...' : (direction === 'in' ? t.submitStockInBtn : t.submitStockOutBtn)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
