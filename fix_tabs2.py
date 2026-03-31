import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'r') as f:
    content = f.read()

# Update summary box for GoPay total
old_summary_cards = """<div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-xl relative overflow-hidden group">
            <p className="text-sm font-medium text-emerald-500/80">Saldo Kas & Job (Netto)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              Rp {summary.currentBalance.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Total Uang Job Masuk</p>
            <p className="mt-2 text-2xl font-bold text-indigo-400">
              Rp {summary.totalJob.toLocaleString("id-ID")}
            </p>
          </div>"""

new_summary_cards = """<div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-xl relative overflow-hidden group">
            <p className="text-sm font-medium text-emerald-500/80">Saldo Kas Total (Netto)</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              Rp {summary.currentBalance.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-sm text-slate-400">Total Masuk QRIS GoPay</p>
            <p className="mt-2 text-2xl font-bold text-cyan-400">
              Rp {transactions.filter(t => t.source === 'gobiz_webhook').reduce((sum, t) => sum + (t.amount||0), 0).toLocaleString("id-ID")}
            </p>
          </div>"""

content = content.replace(old_summary_cards, new_summary_cards)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx', 'w') as f:
    f.write(content)
