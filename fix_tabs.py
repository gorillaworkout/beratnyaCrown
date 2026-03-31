import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'Uang Job & Pengeluaran', 
    'Uang Job, Pengeluaran & QRIS GoPay'
)

# Update transaction rendering to highlight GoPay Webhook
old_tr = """<td className="px-6 py-4">
                          {trx.type === 'IN_JOB' && <span className="inline-flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Uang Job</span>}
                          {trx.type === 'IN_OTHER' && <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-xs"><ArrowUpCircle className="w-3 h-3"/> Pemasukan</span>}
                          {trx.type === 'OUT_EXPENSE' && <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs"><ArrowDownCircle className="w-3 h-3"/> Pengeluaran</span>}
                        </td>
                        <td className="px-6 py-4 text-white">{trx.description}</td>
                        <td className={`px-6 py-4 text-right font-medium ${trx.type === 'OUT_EXPENSE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {trx.type === 'OUT_EXPENSE' ? '-' : '+'} Rp {trx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isKasAdmin && <button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>}
                        </td>"""

new_tr = """<td className="px-6 py-4">
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

content = content.replace(old_tr, new_tr)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
