import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# 1. Update State
content = content.replace(
    'const [activeTab, setActiveTab] = useState<"daily" | "debt" | "transactions" | "recap">("daily");',
    'const [activeTab, setActiveTab] = useState<"daily" | "debt" | "transactions" | "qris" | "recap">("daily");'
)

# 2. Update Nav Buttons
old_nav = """<button onClick={() => setActiveTab("transactions")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Uang Job, Pengeluaran & QRIS GoPay
            </button>"""
new_nav = """<button onClick={() => setActiveTab("transactions")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              Uang Job & Pengeluaran
            </button>
            <button onClick={() => setActiveTab("qris")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${activeTab === 'qris' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
              QRIS GoPay (Merchant)
            </button>"""
content = content.replace(old_nav, new_nav)

# 3. Revert Manual Tab
old_manual_tab = """<h2 className="text-lg font-semibold text-white">Uang Job, Pengeluaran & QRIS GoPay</h2>"""
new_manual_tab = """<h2 className="text-lg font-semibold text-white">Uang Job & Pengeluaran Manual</h2>"""
content = content.replace(old_manual_tab, new_manual_tab)

# 4. Hide QRIS from manual
content = content.replace('transactions.map((trx) => (', "transactions.filter(t => t.source !== 'gobiz_webhook').map((trx) => (")

old_tr_body = """<td className="px-6 py-4">
                          {trx.type === 'IN_JOB' && <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Uang Job</span>}
                          {trx.type === 'IN_OTHER' && trx.source !== 'gobiz_webhook' && <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Pemasukan</span>}
                          {trx.type === 'IN_OTHER' && trx.source === 'gobiz_webhook' && <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded text-xs font-bold"><ArrowUpCircle className="w-3 h-3"/> QRIS GoPay</span>}
                          {trx.type === 'OUT_EXPENSE' && <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs"><ArrowDownCircle className="w-3 h-3"/> Pengeluaran</span>}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {trx.description}
                          {trx.source === 'gobiz_webhook' && trx.raw_payload?.order?.order_number && (
                            <span className="block text-xs text-cyan-500/70 mt-1">ID: {trx.raw_payload.order.order_number}</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${trx.type === 'OUT_EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {trx.type === 'OUT_EXPENSE' ? '-' : '+'} Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isKasAdmin && trx.source !== 'gobiz_webhook' && <button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>}
                        </td>"""

new_tr_body = """<td className="px-6 py-4">
                          {trx.type === 'IN_JOB' && <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Uang Job</span>}
                          {trx.type === 'IN_OTHER' && <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Pemasukan</span>}
                          {trx.type === 'OUT_EXPENSE' && <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs"><ArrowDownCircle className="w-3 h-3"/> Pengeluaran</span>}
                        </td>
                        <td className="px-6 py-4 text-white">
                          {trx.description}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${trx.type === 'OUT_EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {trx.type === 'OUT_EXPENSE' ? '-' : '+'} Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isKasAdmin && <button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>}
                        </td>"""
content = content.replace(old_tr_body, new_tr_body)

# 5. Inject QRIS Tab below Transactions Tab
qris_tab = """

        {/* TAB: QRIS */}
        {activeTab === "qris" && (
          <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-center gap-3">
                <div className="bg-cyan-500 p-2 rounded-xl">
                  <Wallet className="h-4 w-4 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">QRIS GoPay (Otomatis)</h2>
                  <p className="text-xs text-slate-400">Total Saldo Masuk: Rp {transactions.filter(t => t.source === 'gobiz_webhook').reduce((sum, t) => sum + (t.amount||0), 0).toLocaleString("id-ID")}</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-white/5 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium">Metode</th>
                    <th className="px-6 py-4 font-medium">Keterangan & Order ID</th>
                    <th className="px-6 py-4 font-medium text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Memuat...</td></tr>
                  ) : transactions.filter(t => t.source === 'gobiz_webhook').length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Belum ada transaksi QRIS otomatis.</td></tr>
                  ) : (
                    transactions.filter(t => t.source === 'gobiz_webhook').map((trx) => (
                      <tr key={trx.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">{format(new Date(trx.date), 'dd MMM yyyy', {locale: idLocale})}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded text-xs font-bold">QRIS</span>
                        </td>
                        <td className="px-6 py-4 text-white">
                          {trx.description}
                          {trx.raw_payload?.order?.order_number && (
                            <span className="block text-xs text-cyan-500/70 mt-1">ID: {trx.raw_payload.order.order_number}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-400">
                          + Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
"""

content = content.replace('{/* TAB 3: RECAP */}', qris_tab + '\n        {/* TAB 3: RECAP */}')

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
