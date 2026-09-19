import React, { useState, useEffect, useCallback } from 'react';
import { ShopAuthProvider, useShopAuth } from './hooks/useShopAuth';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BillingPortal } from './components/billing/BillingPortal';
import { Header } from './components/layout/Header';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { SupabaseSettingsModal } from './components/layout/SupabaseSettingsModal';
import { ProductCatalog } from './components/inventory/ProductCatalog';
import { UnitConversionModal } from './components/inventory/UnitConversionModal';
import { StockInOutModal } from './components/inventory/StockInOutModal';
import { AddNewProductModal } from './components/inventory/AddNewProductModal';
import { KhataLedgerView } from './components/khata/KhataLedgerView';
import { ChallanOcrView } from './components/challan/ChallanOcrView';
import { DailyVoiceBriefing } from './components/briefing/DailyVoiceBriefing';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { VoiceMicModal } from './components/voice/VoiceMicModal';
import { VoiceConfirmCard } from './components/voice/VoiceConfirmCard';
import { DynamicVoiceIsland } from './components/voice/DynamicVoiceIsland';
import { CounterPosMode } from './components/pos/CounterPosMode';
import { AlertsDrawer } from './components/alerts/AlertsDrawer';
import { PhoneOtpAuthModal } from './components/auth/PhoneOtpAuthModal';
import {
  Product,
  Alert,
  Customer,
  fetchProducts,
  fetchAlerts,
  fetchCustomers,
} from './lib/api';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { syncOfflineQueueToSupabase } from './lib/offlineQueue';
import { supabase } from './lib/supabaseClient';
import { getTranslations } from './lib/i18n';

// ─────────────────────────────────────────────────────────────────
// Inner app — rendered only when auth state is resolved
// ─────────────────────────────────────────────────────────────────
function AppInner() {
  // ── All Hooks must be called unconditionally at the top level ────
  const { user, shopContext, loading, isAuthenticated, isOnboarded, signOut, loginWithPhone, refresh } = useShopAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('inventory');
  const [language, setLanguage] = useState<'hi' | 'te' | 'en'>(() => {
    const saved = localStorage.getItem('genrob_language');
    return saved === 'te' || saved === 'en' || saved === 'hi' ? saved : 'hi';
  });
  const t = getTranslations(language);

  const [resolvedShopName, setResolvedShopName] = useState<string>('GenRob — Voice Inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals state
  const [isVoiceMicOpen, setIsVoiceMicOpen] = useState(false);
  const [isConfirmCardOpen, setIsConfirmCardOpen] = useState(false);
  const [parsedVoiceData, setParsedVoiceData] = useState<any | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isPosModeOpen, setIsPosModeOpen] = useState(false);
  const [selectedProductForConversion, setSelectedProductForConversion] = useState<Product | null>(null);
  const [selectedProductForStock, setSelectedProductForStock] = useState<{
    product: Product;
    direction: 'in' | 'out';
  } | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  const loadAllData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [prods, alrts, custs] = await Promise.all([
        fetchProducts(),
        fetchAlerts(),
        fetchCustomers(),
      ]);
      setProducts(prods);
      setAlerts(alrts);
      setCustomers(custs);
    } catch (e) {
      console.warn('Error fetching shop data:', e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ── Load shop data ─────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      syncOfflineQueueToSupabase(loadAllData);

      // Fetch shop name for header
      if (shopContext?.shopId) {
        supabase
          .from('shops')
          .select('name')
          .eq('id', shopContext.shopId)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.name) setResolvedShopName(data.name);
          });
      }
    }
  }, [isAuthenticated, shopContext?.shopId, loadAllData]);

  // Realtime hook called unconditionally
  const { isRealtimeActive } = useRealtimeSync({
    onProductsUpdate: () => fetchProducts().then(setProducts),
    onAlertsUpdate: () => fetchAlerts().then(setAlerts),
    onKhataUpdate: () => fetchCustomers().then(setCustomers),
  });

  const handleLanguageChange = (lang: 'hi' | 'te' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('genrob_language', lang);
  };

  const handleVoiceParsed = (parsed: any) => {
    setParsedVoiceData(parsed);
    setIsConfirmCardOpen(true);
  };

  // ── Route: /admin ─────────────────────────────────────────────
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const isSuperAdmin = (user?.app_metadata as any)?.role === 'superadmin';
  if (isAdminRoute && isSuperAdmin) {
    return <AdminDashboard />;
  }

  // ── Auth loading spinner ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">{t.appLoading}</p>
        </div>
      </div>
    );
  }

  // ── Screen: Onboarding (unauthenticated or unonboarded) ─────────
  if (!isAuthenticated || !isOnboarded) {
    return (
      <OnboardingWizard
        onComplete={async () => {
          await refresh();
        }}
      />
    );
  }

  const isPlanLimitReached = products.length >= (
    shopContext?.plan === 'free' ? 50 : shopContext?.plan === 'starter' ? 500 : 999999
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Plan trial / limit banner */}
      {shopContext?.isTrialing && (
        <div
          className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs py-1.5 text-center cursor-pointer hover:bg-amber-500/20 transition-colors"
          onClick={() => setIsBillingOpen(true)}
        >
          🎁 {t.trialBannerActive} {shopContext.trialEndsAt ? `${Math.ceil((new Date(shopContext.trialEndsAt).getTime() - Date.now()) / 86400000)} ${t.trialDaysRemaining}` : ''} · <strong>{t.trialUpgradeNow}</strong>
        </div>
      )}

      {isPlanLimitReached && (
        <div
          className="bg-red-900/20 border-b border-red-700/40 text-red-400 text-xs py-1.5 text-center cursor-pointer hover:bg-red-900/30 transition-colors"
          onClick={() => setIsBillingOpen(true)}
        >
          ⚠️ {t.limitReachedBanner}
        </div>
      )}

      {/* Top Navigation Bar */}
      <Header
        shopName={resolvedShopName}
        isRealtime={isRealtimeActive}
        alerts={alerts}
        language={language}
        onLanguageChange={handleLanguageChange}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPosMode={() => setIsPosModeOpen(true)}
      />

      {/* Dynamic Voice Island HUD (Persistent Ambient AI Voice Pill) */}
      <div className="pt-2">
        <DynamicVoiceIsland
          products={products}
          customers={customers}
          language={language}
          onStockUpdated={loadAllData}
          onOpenFullMicModal={() => setIsVoiceMicOpen(true)}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-spin mb-3">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full" />
            </div>
            <p className="text-sm font-bold text-white">{t.loadingInventory}</p>
            <p className="text-xs text-slate-400 mt-1">{t.connectingRealtime}</p>
          </div>
        ) : (
          <>
            {currentTab === 'inventory' && (
              <ProductCatalog
                products={products}
                language={language}
                onStockAction={(product, direction) =>
                  setSelectedProductForStock({ product, direction })
                }
                onEditConversions={(product) =>
                  setSelectedProductForConversion(product)
                }
                onAddNewProduct={() => {
                  if (isPlanLimitReached) {
                    setIsBillingOpen(true);
                  } else {
                    setIsAddProductOpen(true);
                  }
                }}
              />
            )}

            {currentTab === 'khata' && (
              <KhataLedgerView
                language={language}
                onOpenVoiceForKhata={() => setIsVoiceMicOpen(true)}
              />
            )}

            {currentTab === 'challan' && (
              <ChallanOcrView
                products={products}
                language={language}
                onStockUpdated={loadAllData}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                products={products}
                language={language}
                onStockUpdated={loadAllData}
              />
            )}

            {currentTab === 'briefing' && (
              <DailyVoiceBriefing
                language={language}
                shopName={resolvedShopName}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenVoiceMic={() => setIsVoiceMicOpen(true)}
        language={language}
      />

      {/* ── Modals & HUDs ── */}
      {isPosModeOpen && (
        <CounterPosMode
          isOpen={isPosModeOpen}
          onClose={() => setIsPosModeOpen(false)}
          products={products}
          language={language}
          onStockUpdated={loadAllData}
          onOpenVoice={() => setIsVoiceMicOpen(true)}
        />
      )}

      <VoiceMicModal
        isOpen={isVoiceMicOpen}
        onClose={() => setIsVoiceMicOpen(false)}
        shopLanguage={language}
        onParsedResult={handleVoiceParsed}
      />

      {isConfirmCardOpen && parsedVoiceData && (
        <VoiceConfirmCard
          parsedData={parsedVoiceData}
          products={products}
          customers={customers}
          language={language}
          onClose={() => setIsConfirmCardOpen(false)}
          onSuccess={() => {
            setIsConfirmCardOpen(false);
            loadAllData();
          }}
        />
      )}

      <SupabaseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        language={language}
        onAlertResolved={loadAllData}
      />

      <UnitConversionModal
        product={selectedProductForConversion}
        isOpen={Boolean(selectedProductForConversion)}
        onClose={() => setSelectedProductForConversion(null)}
        language={language}
        onUpdated={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }}
      />

      {selectedProductForStock && (
        <StockInOutModal
          product={selectedProductForStock.product}
          direction={selectedProductForStock.direction}
          isOpen={Boolean(selectedProductForStock)}
          onClose={() => setSelectedProductForStock(null)}
          language={language}
          onSuccess={loadAllData}
        />
      )}

      <AddNewProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        language={language}
        onSuccess={(newProduct) => {
          setProducts((prev) => [newProduct, ...prev]);
        }}
      />

      <PhoneOtpAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        onAuthSuccess={async () => {
          await refresh();
          setIsAuthOpen(false);
        }}
      />

      <BillingPortal
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        language={language}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Root App — wraps everything in ShopAuthProvider
// ─────────────────────────────────────────────────────────────────
export function App() {
  return (
    <ShopAuthProvider>
      <AppInner />
    </ShopAuthProvider>
  );
}

export default App;
