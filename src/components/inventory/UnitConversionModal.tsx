import React, { useState } from 'react';
import { X, Scale, Save } from 'lucide-react';
import { Product } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import { getTranslations, translateUnit, SupportedLanguage } from '../../lib/i18n';

interface UnitConversionModalProps {
  product: Product | null;
  language: SupportedLanguage;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedProduct: Product) => void;
}

export const UnitConversionModal: React.FC<UnitConversionModalProps> = ({
  product,
  language,
  isOpen,
  onClose,
  onUpdated,
}) => {
  if (!isOpen || !product) return null;

  const t = getTranslations(language);
  const [unit, setUnit] = useState(product.unit);
  const [baseUnit, setBaseUnit] = useState(product.base_unit);
  const [multiplier, setMultiplier] = useState(
    product.unit_conversion[product.unit] || 1
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updatedConversions = {
      ...product.unit_conversion,
      [unit]: multiplier,
      [baseUnit]: 1,
    };

    try {
      await supabase
        .from('products')
        .update({
          unit,
          base_unit: baseUnit,
          unit_conversion: updatedConversions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      const updated = {
        ...product,
        unit,
        base_unit: baseUnit,
        unit_conversion: updatedConversions,
      };

      onUpdated(updated);
      onClose();
    } catch (err: any) {
      alert('Failed to update conversion: ' + err.message);
    } finally {
      setIsSaving(false);
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

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">{t.unitConversionTitle}</h3>
            <p className="text-xs text-amber-400 font-semibold">{product.name}</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          {t.unitConversionSubtitle}
        </p>

        <div className="space-y-4 text-xs">
          {/* Display Unit */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t.tradeUnitLabel}
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
            />
          </div>

          {/* Base Unit */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t.baseUnitLabel}
            </label>
            <select
              value={baseUnit}
              onChange={(e) => setBaseUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold"
            >
              <option value="kg">{translateUnit('kg', language)} (kg)</option>
              <option value="litre">{translateUnit('litre', language)} (litre)</option>
              <option value="piece">{translateUnit('piece', language)} (piece)</option>
              <option value="packet">{translateUnit('packet', language)} (packet)</option>
            </select>
          </div>

          {/* Multiplier */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              {t.multiplierLabel}
            </label>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">1 {translateUnit(unit, language)} =</span>
              <input
                type="number"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
                className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-extrabold text-sm"
              />
              <span className="font-bold text-white text-sm">{translateUnit(baseUnit, language)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? '...' : t.saveConversionBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
