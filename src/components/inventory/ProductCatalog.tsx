import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Settings2, 
  Layers, 
  Scale, 
  Tag 
} from 'lucide-react';
import { Product } from '../../lib/api';
import { formatTradeQty } from '../../lib/tradeVocabulary';
import { getTranslations, translateCategory, translateUnit } from '../../lib/i18n';

interface ProductCatalogProps {
  products: Product[];
  language: 'hi' | 'te' | 'en';
  onStockAction: (product: Product, direction: 'in' | 'out') => void;
  onEditConversions: (product: Product) => void;
  onAddNewProduct: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  language,
  onStockAction,
  onEditConversions,
  onAddNewProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const t = getTranslations(language);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // KPI Summary Metrics computed directly from live products
  const totalItemsCount = products.length;
  const lowStockCount = products.filter((p) => p.current_stock <= p.reorder_threshold && p.current_stock > 0).length;
  const outOfStockCount = products.filter((p) => p.current_stock <= 0).length;
  const totalStockValuation = products.reduce((acc, p) => acc + p.current_stock * (p.cost_price / (p.unit_conversion[p.unit] || 1)), 0);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total SKUs */}
        <div className="glass-card p-3 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 block">{t.totalSkus}</span>
          <span className="text-xl font-extrabold text-white mt-0.5 block">{totalItemsCount}</span>
          <span className="text-[10px] text-slate-500">{t.activeCatalog}</span>
        </div>

        {/* Low Stock Warning */}
        <div className={`glass-card p-3 rounded-2xl border ${lowStockCount > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800'}`}>
          <span className="text-[11px] font-semibold text-amber-400 block">{t.lowStock}</span>
          <span className="text-xl font-extrabold text-amber-300 mt-0.5 block">{lowStockCount}</span>
          <span className="text-[10px] text-amber-500/80">{t.belowReorder}</span>
        </div>

        {/* Critical Out of Stock */}
        <div className={`glass-card p-3 rounded-2xl border ${outOfStockCount > 0 ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-800'}`}>
          <span className="text-[11px] font-semibold text-rose-400 block">{t.outOfStock}</span>
          <span className="text-xl font-extrabold text-rose-300 mt-0.5 block">{outOfStockCount}</span>
          <span className="text-[10px] text-rose-400/80">{t.reorderNow}</span>
        </div>

        {/* Total Stock Value */}
        <div className="glass-card p-3 rounded-2xl border border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-400 block">{t.stockValuation}</span>
          <span className="text-xl font-extrabold text-emerald-300 mt-0.5 block">
            ₹{Math.round(totalStockValuation).toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">{t.atCost}</span>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <button
          onClick={onAddNewProduct}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-110 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addNewProduct}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat === 'All' ? t.allCategories : translateCategory(cat, language)}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((product) => {
          const isOutOfStock = product.current_stock <= 0;
          const isLowStock = !isOutOfStock && product.current_stock <= product.reorder_threshold;
          const isHealthy = !isOutOfStock && !isLowStock;

          const cardBorder = isOutOfStock
            ? 'border-rose-500/50 bg-rose-950/20'
            : isLowStock
            ? 'border-amber-500/40 bg-amber-950/15'
            : 'border-slate-800/80 bg-slate-900/60';

          return (
            <div
              key={product.id}
              className={`p-4 rounded-2xl border transition-all hover:border-slate-700 relative flex flex-col justify-between ${cardBorder}`}
            >
              <div>
                {/* Header: Category and Stock Health Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                    {translateCategory(product.category, language)}
                  </span>

                  {/* RAG Status Indicator */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isOutOfStock
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isLowStock
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOutOfStock ? 'bg-rose-400 animate-ping' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    {isOutOfStock ? t.statusOut : isLowStock ? t.statusLow : t.statusOk}
                  </span>
                </div>

                {/* Product Name */}
                <h3 className="font-bold text-sm sm:text-base text-white leading-snug mb-1">
                  {product.name}
                </h3>

                {/* SKU and Trade Conversion info */}
                <div className="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
                  <span>SKU: {product.sku || 'N/A'}</span>
                  <button
                    onClick={() => onEditConversions(product)}
                    className="text-amber-400/90 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
                    title="Edit Unit Conversion"
                  >
                    <Scale className="w-3 h-3" />
                    <span>1 {translateUnit(product.unit, language)} = {product.unit_conversion[product.unit] || 1} {translateUnit(product.base_unit, language)}</span>
                  </button>
                </div>

                {/* Current Stock vs Reorder Limit */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">{t.currentStock}</span>
                    <span className={`text-base font-extrabold ${isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {product.current_stock} <span className="text-xs font-semibold text-slate-300">{translateUnit(product.base_unit, language)}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">{t.reorderLimit}</span>
                    <span className="text-xs font-bold text-slate-300">
                      {product.reorder_threshold} {translateUnit(product.base_unit, language)}
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline justify-between mb-4 px-1">
                  <span className="text-xs text-slate-400">{t.salePrice}:</span>
                  <span className="text-sm font-extrabold text-amber-300">
                    ₹{product.price} <span className="text-[10px] font-normal text-slate-400">/ {translateUnit(product.unit, language)}</span>
                  </span>
                </div>
              </div>

              {/* Quick IN / OUT Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onStockAction(product, 'in')}
                  className="py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-500/30 transition active:scale-95"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.stockInAction}</span>
                </button>

                <button
                  onClick={() => onStockAction(product, 'out')}
                  className="py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 border border-rose-500/30 transition active:scale-95"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t.stockOutAction}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
