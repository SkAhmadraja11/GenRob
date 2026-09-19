import React, { useState } from 'react';
import { X, Plus, PackagePlus } from 'lucide-react';
import { Product, createProduct } from '../../lib/api';
import { getTranslations, translateCategory, translateUnit, SupportedLanguage } from '../../lib/i18n';

interface AddNewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
  onSuccess: (newProduct: Product) => void;
}

export const AddNewProductModal: React.FC<AddNewProductModalProps> = ({
  isOpen,
  onClose,
  language,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const t = getTranslations(language);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grains & Atta');
  const [unit, setUnit] = useState('bag');
  const [baseUnit, setBaseUnit] = useState('kg');
  const [multiplier, setMultiplier] = useState(50);
  const [reorderThreshold, setReorderThreshold] = useState(50);
  const [currentStock, setCurrentStock] = useState(100);
  const [price, setPrice] = useState(2000);
  const [costPrice, setCostPrice] = useState(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Grains & Atta',
    'Pulses & Dal',
    'Edible Oils',
    'Spices & Masala',
    'Dairy & Beverages',
    'Personal & Home Care',
    'Packaged Foods',
    'General Trade',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createProduct({
        name: name.trim(),
        category,
        unit,
        base_unit: baseUnit,
        unit_conversion: { [unit]: multiplier, [baseUnit]: 1 },
        reorder_threshold: reorderThreshold,
        current_stock: currentStock,
        price,
        cost_price: costPrice,
      });
      onSuccess(created);
      onClose();
    } catch (err: any) {
      alert('Error creating product: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-amber-500/30 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">{t.addProductTitle}</h3>
            <p className="text-xs text-slate-400">{t.activeCatalog}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">{t.productNameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.productNamePlaceholder}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">{t.categoryLabel}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {translateCategory(cat, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.tradeUnitLabel}</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.baseUnitLabel}</label>
              <select
                value={baseUnit}
                onChange={(e) => setBaseUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              >
                <option value="kg">{translateUnit('kg', language)}</option>
                <option value="litre">{translateUnit('litre', language)}</option>
                <option value="piece">{translateUnit('piece', language)}</option>
                <option value="packet">{translateUnit('packet', language)}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.currentStockLabel} ({translateUnit(baseUnit, language)})</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.reorderThresholdLabel} ({translateUnit(baseUnit, language)})</label>
              <input
                type="number"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.salePriceLabel}</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">{t.costPriceLabel}</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
              />
            </div>
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
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? '...' : t.saveProductBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
