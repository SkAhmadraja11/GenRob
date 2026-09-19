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
  IndianRupee 
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
      <div className="glass-card p-4 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 block">{t.totalMarketUdhaar}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400">
              ₹{totalMarketUdhaar.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-400 font-medium">({customers.length} {t.customerAccounts})</span>
          </div>
        </div>

        <button
          onClick={onOpenVoiceForKhata}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition shrink-0"
        >
          <Volume2 className="w-4 h-4 stroke-[2.5]" />
          <span>{t.voiceUdhaarBtn}</span>
        </button>
      </div>

      {/* Main 2-Column Khata Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Customer List */}
        <div className="glass-card rounded-2xl border border-slate-800 p-3 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchCustomer}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;
              return (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer.id)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">{customer.name}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {customer.phone}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-amber-300 block">
                      ₹{customer.current_credit.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">{t.availableLimit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Customer Ledger Details */}
        <div className="md:col-span-2 glass-card rounded-2xl border border-slate-800 p-4 flex flex-col justify-between min-h-[400px]">
          {selectedCustomer ? (
            <div>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-base text-white">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>Phone: {selectedCustomer.phone}</span>
                    <span>•</span>
                    <span>{t.creditLimit}: ₹{selectedCustomer.credit_limit}</span>
                  </div>
                </div>

                {/* Udhaar / Jama Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEntryType('credit'); setIsModalOpen(true); }}
                    className="py-1.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5 transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.giveUdhaar}</span>
                  </button>
                  <button
                    onClick={() => { setEntryType('payment'); setIsModalOpen(true); }}
                    className="py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 transition"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.takePayment}</span>
                  </button>
                </div>
              </div>

              {/* Ledger History Entries */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {ledgerEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">
                    {t.noTxns}
                  </p>
                ) : (
                  ledgerEntries.map((entry) => {
                    const isCredit = entry.type === 'credit';
                    const txLabel = isCredit
                      ? (language === 'hi' ? 'उधार माल दिया' : language === 'te' ? 'అప్పు సరుకు ఇచ్చాము' : 'Goods Given on Credit')
                      : (language === 'hi' ? 'भुगतान प्राप्त (Payment Received)' : language === 'te' ? 'చెల్లింపు అందింది' : 'Payment Received');

                    return (
                      <div
                        key={entry.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg mt-0.5 ${
                              isCredit ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isCredit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">
                              {txLabel}
                            </span>
                            {entry.raw_transcript ? (
                              <span className="text-[11px] text-amber-400/90 italic block">
                                🎙️ "{entry.raw_transcript}"
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 block">{entry.notes}</span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(entry.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-extrabold block ${isCredit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isCredit ? '+' : '-'} ₹{entry.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">
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
            <div className="flex items-center justify-center h-full text-xs text-slate-500">
              {language === 'hi' ? 'खाता देखने के लिए किसी ग्राहक को चुनें' : language === 'te' ? 'లెడ్జర్ చూడటానికి కస్టమర్‌ను ఎంచుకోండి' : 'Select a customer to view khata ledger'}
            </div>
          )}
        </div>
      </div>

      {/* Manual Khata Entry Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm glass-panel rounded-2xl border border-amber-500/30 p-5 shadow-2xl relative">
            <h3 className="font-bold text-sm text-white mb-1">
              {entryType === 'credit' ? t.giveUdhaar : t.takePayment}
            </h3>
            <p className="text-xs text-amber-400 font-semibold mb-4">{selectedCustomer.name}</p>

            <form onSubmit={handleAddEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">{t.amountLabel}</label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-base"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">{t.notesLabel}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Atta and Dal, PhonePe payment"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20 hover:brightness-110 transition"
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
