import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  UserPlus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Phone, 
  Clock, 
  Volume2, 
  Plus, 
  CheckCircle2, 
  Search,
  IndianRupee,
  User,
  Mic,
  X
} from 'lucide-react';
import { Customer, KhataEntry, fetchCustomers, fetchKhataLedger, addKhataEntry } from '../../lib/api';
import { getTranslations } from '../../lib/i18n';

interface KhataLedgerViewProps {
  language: 'hi' | 'te' | 'en';
  onOpenVoiceForKhata: () => void;
}

export const KhataLedgerView: React.FC<KhataLedgerViewProps> = ({
  language,
  onOpenVoiceForKhata,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<KhataEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const t = getTranslations(language);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'credit' | 'payment'>('credit');
  const [amount, setAmount] = useState<number>(500);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const list = await fetchCustomers();
    setCustomers(list);
    if (list.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(list[0].id);
      loadEntries(list[0].id);
    }
    setLoading(false);
  };

  const loadEntries = async (customerId: string) => {
    const entries = await fetchKhataLedger(customerId);
    setLedgerEntries(entries);
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    loadEntries(id);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || amount <= 0) return;

    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    await addKhataEntry({
      shop_id: cust.shop_id,
      customer_id: cust.id,
      type: entryType,
      amount,
      source: 'manual',
      notes: notes.trim() || (entryType === 'credit' ? 'Groceries Udhaar' : 'Cash/UPI payment'),
    });

    setIsModalOpen(false);
    setAmount(500);
    setNotes('');
    loadCustomers();
    loadEntries(selectedCustomerId);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalMarketUdhaar = customers.reduce((acc, c) => acc + c.current_credit, 0);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Khata Header Banner */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-400 block">{t.totalMarketUdhaar}</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-white tabular-nums">
              ₹{totalMarketUdhaar.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-800 border border-white/[0.06]">
              {customers.length} {t.customerAccounts}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenVoiceForKhata}
          className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
        >
          <Volume2 className="w-4 h-4 stroke-[2.2]" />
          <span>{t.voiceUdhaarBtn}</span>
        </button>
      </div>

      {/* Main 2-Column Khata Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Customer Directory */}
        <div className="bg-slate-900/60 rounded-xl border border-white/[0.08] p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchCustomer}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
            />
          </div>

          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {filteredCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;
              return (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer.id)}
                  className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800 border border-amber-500/40 text-white'
                      : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                  }`}
                >
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-100">{customer.name}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5 opacity-60" />
                      {customer.phone}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 tabular-nums block">
                      ₹{customer.current_credit.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">{t.availableLimit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Ledger Details */}
        <div className="md:col-span-2 bg-slate-900/60 rounded-xl border border-white/[0.08] p-4 flex flex-col justify-between min-h-[440px]">
          {selectedCustomer ? (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/[0.06] gap-2.5 mb-3">
                <div>
                  <h3 className="font-bold text-base text-white">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                    <span>{selectedCustomer.phone}</span>
                    <span>•</span>
                    <span>{t.creditLimit}: <strong className="text-slate-200 tabular-nums">₹{selectedCustomer.credit_limit}</strong></span>
                  </div>
                </div>

                {/* Udhaar / Jama Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEntryType('credit'); setIsModalOpen(true); }}
                    className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs border border-rose-500/25 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 stroke-[2.2]" />
                    <span>{t.giveUdhaar}</span>
                  </button>
                  <button
                    onClick={() => { setEntryType('payment'); setIsModalOpen(true); }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/25 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
                    <span>{t.takePayment}</span>
                  </button>
                </div>
              </div>

              {/* Ledger History Entries */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {ledgerEntries.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-xs text-slate-500 font-medium">{t.noTxns}</p>
                  </div>
                ) : (
                  ledgerEntries.map((entry) => {
                    const isCredit = entry.type === 'credit';
                    const txLabel = isCredit
                      ? (language === 'hi' ? 'उधार माल दिया' : language === 'te' ? 'అప్పు సరుకు ఇచ్చాము' : 'Goods Given on Credit')
                      : (language === 'hi' ? 'भुगतान प्राप्त' : language === 'te' ? 'చెల్లింపు అందింది' : 'Payment Received');

                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg bg-slate-950/60 border border-white/[0.06] flex items-center justify-between text-xs transition hover:border-white/[0.1]"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg mt-0.5 ${
                              isCredit ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isCredit ? <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" /> : <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.2]" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 text-xs block">
                              {txLabel}
                            </span>
                            {entry.raw_transcript ? (
                              <span className="text-[11px] text-amber-400/90 font-mono italic block mt-0.5 flex items-center gap-1">
                                <Mic className="w-3 h-3 text-amber-400/70 inline" /> "{entry.raw_transcript}"
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 block mt-0.5">{entry.notes}</span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                              <Clock className="w-2.5 h-2.5 opacity-60" />
                              {new Date(entry.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-bold block tabular-nums ${isCredit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isCredit ? '+' : '-'} ₹{entry.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {language === 'hi' ? 'बैलेंस:' : language === 'te' ? 'బ్యాలెన్స్:' : 'Balance:'} ₹{entry.running_balance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 py-16 gap-2">
              <BookOpen className="w-7 h-7 text-slate-600 opacity-60" />
              <span>{language === 'hi' ? 'खाता देखने के लिए किसी ग्राहक को चुनें' : language === 'te' ? 'లెడ్జర్ చూడటానికి కస్టమర్‌ను ఎంచుకోండి' : 'Select a customer to view khata ledger'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual Khata Entry Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 rounded-xl border border-white/[0.1] p-5 shadow-2xl relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {entryType === 'credit' ? t.giveUdhaar : t.takePayment}
                </h3>
                <p className="text-xs text-amber-400 font-medium">{selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">{t.amountLabel}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-slate-950 border border-white/[0.1] text-white font-bold text-base focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">{t.notesLabel}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Atta and Dal, PhonePe payment"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/[0.1] text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-lg font-semibold text-xs transition active:scale-95 ${
                    entryType === 'credit'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                  }`}
                >
                  {t.saveEntry}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
