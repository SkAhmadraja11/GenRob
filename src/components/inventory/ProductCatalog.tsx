import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Layers, 
  Scale,
  Tag
} from 'lucide-react';
import { Product } from '../../lib/api';
import { soundFx } from '../../lib/soundFx';
import { getTranslations, translateCategory, translateUnit } from '../../lib/i18n';

interface ProductCatalogProps {
  products: Product[];
  language: 'hi' | 'te' | 'en';
  onStockAction: (product: Product, action: 'in' | 'out') => void;
  onAddNewProduct: () => void;
  onEditConversions: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  language,
  onStockAction,
  onAddNewProduct,
  onEditConversions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const t = getTranslations(language);

  // Derive unique categories from products
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filter products by category and search
  const filteredProducts = products.filter((product) => {
    const matchesCat = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesQuery =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  // KPI Calculations
  const totalItemsCount = products.length;
  const lowStockCount = products.filter((p) => p.current_stock <= p.reorder_threshold && p.current_stock > 0).length;
  const outOfStockCount = products.filter((p) => p.current_stock <= 0).length;
  const totalStockValuation = products.reduce((acc, p) => acc + p.current_stock * (p.cost_price / (p.unit_conversion[p.unit] || 1)), 0);

  const handleStockClick = (product: Product, action: 'in' | 'out') => {
    soundFx.playTap();
    onStockAction(product, action);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total SKUs */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-slate-400 block">{t.totalSkus}</span>
          <span className="text-xl font-bold text-white mt-0.5 block tabular-nums">{totalItemsCount}</span>
          <span className="text-[10px] text-slate-500">{t.activeCatalog}</span>
        </div>

        {/* Low Stock Warning */}
        <div className={`p-3.5 rounded-xl border transition-colors ${
          lowStockCount > 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-900/60 border-white/[0.08]'
        }`}>
          <span className="text-[11px] font-medium text-amber-400 block">{t.lowStock}</span>
          <span className="text-xl font-bold text-amber-300 mt-0.5 block tabular-nums">{lowStockCount}</span>
          <span className="text-[10px] text-amber-500/80">{t.belowReorder}</span>
        </div>

        {/* Critical Out of Stock */}
        <div className={`p-3.5 rounded-xl border transition-colors ${
          outOfStockCount > 0 ? 'bg-rose-500/5 border-rose-500/30' : 'bg-slate-900/60 border-white/[0.08]'
        }`}>
          <span className="text-[11px] font-medium text-rose-400 block">{t.outOfStock}</span>
          <span className="text-xl font-bold text-rose-300 mt-0.5 block tabular-nums">{outOfStockCount}</span>
          <span className="text-[10px] text-rose-400/80">{t.reorderNow}</span>
        </div>

        {/* Total Stock Value */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/[0.08]">
          <span className="text-[11px] font-medium text-emerald-400 block">{t.stockValuation}</span>
          <span className="text-xl font-bold text-emerald-300 mt-0.5 block tabular-nums">
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
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
          />
        </div>

        <button
          onClick={onAddNewProduct}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.addNewProduct}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12]'
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

          // Stock progress bar percentage
          const maxStock = Math.max(product.reorder_threshold * 3, product.current_stock, 1);
          const stockPct = Math.min((product.current_stock / maxStock) * 100, 100);

          return (
            <div
              key={product.id}
              className={`bg-slate-900/60 rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between hover:border-white/[0.15] ${
                isOutOfStock
                  ? 'border-rose-500/35 bg-rose-950/10'
                  : isLowStock
                  ? 'border-amber-500/35 bg-amber-950/10'
                  : 'border-white/[0.08]'
              }`}
            >
              <div>
                {/* Header: Category badge + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider bg-slate-800/80 text-slate-400 border border-white/[0.06]">
                    {translateCategory(product.category, language)}
                  </span>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isOutOfStock
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : isLowStock
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isOutOfStock ? 'bg-rose-400' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    {isOutOfStock ? t.statusOut : isLowStock ? t.statusLow : t.statusOk}
                  </span>
                </div>

                {/* Primary Name */}
                <h3 className="font-semibold text-sm sm:text-base text-white leading-snug">
                  {product.name}
                </h3>

                {/* Feature 7: Bilingual Vernacular + Roman Script Dual Badge */}
                <div className="flex items-center gap-1.5 mt-1 mb-2.5">
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-white/[0.06] tracking-wide">
                    🏷️ {product.sku || product.name.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {product.unit} pack
                  </span>
                </div>

                {/* Unit conversion */}
                <div className="text-[11px] text-slate-500 mb-3 flex items-center justify-between">
                  <button
                    onClick={() => onEditConversions(product)}
                    className="text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    title="Edit Unit Conversion"
                  >
                    <Scale className="w-3 h-3 text-slate-500" />
                    <span>1 {translateUnit(product.unit, language)} = {product.unit_conversion[product.unit] || 1} {translateUnit(product.base_unit, language)}</span>
                  </button>
                </div>

                {/* Stock Level & Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400 font-medium">{t.currentStock}</span>
                    <span className={`font-bold tabular-nums ${
                      isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {product.current_stock}
                      <span className="text-slate-400 font-normal ml-1">{translateUnit(product.base_unit, language)}</span>
                    </span>
                  </div>

                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOutOfStock ? 'bg-rose-500'
                        : isLowStock ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(stockPct, isOutOfStock ? 0 : 3)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 tabular-nums">
                    <span>0</span>
                    <span>{t.reorderLimit}: {product.reorder_threshold}</span>
                  </div>
                </div>

                {/* Sale Price */}
                <div className="flex items-baseline justify-between mb-3 px-0.5">
                  <span className="text-xs text-slate-400">{t.salePrice}:</span>
                  <span className="text-sm font-bold text-slate-100 tabular-nums">
                    ₹{product.price}
                    <span className="text-[10px] font-normal text-slate-500 ml-1">/ {translateUnit(product.unit, language)}</span>
                  </span>
                </div>
              </div>

              {/* IN / OUT Stock Action Buttons with Tactile Audio */}
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/[0.06]">
                <button
                  onClick={() => handleStockClick(product, 'in')}
                  className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-500/25 transition active:scale-95"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{t.stockInAction}</span>
                </button>

                <button
                  onClick={() => handleStockClick(product, 'out')}
                  className="py-1.5 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-rose-500/25 transition active:scale-95"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
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
