from pathlib import Path

# 1. Update Kas Page to check for admin role
p_kas = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/page.tsx')
text_kas = p_kas.read_text()

# Add useAuth and db imports
import_old = 'import { id as idLocale } from "date-fns/locale";'
import_new = '''import { id as idLocale } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";'''
text_kas = text_kas.replace(import_old, import_new)

# Add state for isKasAdmin
state_old = '  const [selectedDate, setSelectedDate] = useState("2026-04-01");'
state_new = '''  const [selectedDate, setSelectedDate] = useState("2026-04-01");
  const { user } = useAuth();
  const [isKasAdmin, setIsKasAdmin] = useState(false);
  
  useEffect(() => {
    if (user?.email === "darmawanbayu1@gmail.com") {
      setIsKasAdmin(true);
      return;
    }
    if (user?.uid) {
      getDoc(doc(db, "crown-athletes", user.uid)).then(d => {
        if (d.exists() && d.data().role === "admin") {
          setIsKasAdmin(true);
        }
      });
    }
  }, [user]);'''
text_kas = text_kas.replace(state_old, state_new)

# Protect Add Athlete and Transactions buttons
btns_old = '''<div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowTrxModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
              >
                <Wallet className="h-4 w-4" />
                Catat Transaksi
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-400 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Tambah Atlet
              </button>
            </div>'''
btns_new = '''<div className="flex flex-wrap gap-3">
              {isKasAdmin && (
                <>
                  <button
                    onClick={() => setShowTrxModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-500/30"
                  >
                    <Wallet className="h-4 w-4" />
                    Catat Transaksi
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-400 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Atlet
                  </button>
                </>
              )}
            </div>'''
text_kas = text_kas.replace(btns_old, btns_new)

# Protect Checkboxes
cb1_old = '<input type="checkbox" checked={!!record.paidKas} onChange={(e) => handleRecordChange(athlete, "paidKas", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black" />'
cb1_new = '<input type="checkbox" disabled={!isKasAdmin} checked={!!record.paidKas} onChange={(e) => handleRecordChange(athlete, "paidKas", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-black disabled:opacity-50" />'
text_kas = text_kas.replace(cb1_old, cb1_new)

cb2_old = '<input type="checkbox" disabled={!!record.noNews} checked={!!record.isLate} onChange={(e) => handleRecordChange(athlete, "isLate", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-orange-500 focus:ring-orange-500 focus:ring-offset-black disabled:opacity-30" />'
cb2_new = '<input type="checkbox" disabled={!isKasAdmin || !!record.noNews} checked={!!record.isLate} onChange={(e) => handleRecordChange(athlete, "isLate", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-orange-500 focus:ring-orange-500 focus:ring-offset-black disabled:opacity-50" />'
text_kas = text_kas.replace(cb2_old, cb2_new)

cb3_old = '<input type="checkbox" checked={!!record.noNews} onChange={(e) => handleRecordChange(athlete, "noNews", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-red-500 focus:ring-red-500 focus:ring-offset-black" />'
cb3_new = '<input type="checkbox" disabled={!isKasAdmin} checked={!!record.noNews} onChange={(e) => handleRecordChange(athlete, "noNews", e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-black/50 text-red-500 focus:ring-red-500 focus:ring-offset-black disabled:opacity-50" />'
text_kas = text_kas.replace(cb3_old, cb3_new)

# Protect Lunas Button
lunas_old = 'onClick={() => handleSettledToggle(athlete, !record.isSettled)}'
lunas_new = 'onClick={() => isKasAdmin && handleSettledToggle(athlete, !record.isSettled)}'
text_kas = text_kas.replace(lunas_old, lunas_new)

btn_disabled_old = 'record.isSettled ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"'
btn_disabled_new = 'record.isSettled ? "bg-emerald-500/10 text-emerald-400 " + (isKasAdmin ? "hover:bg-emerald-500/20" : "opacity-70 cursor-not-allowed") : "bg-red-500/10 text-red-400 " + (isKasAdmin ? "hover:bg-red-500/20" : "opacity-70 cursor-not-allowed")'
text_kas = text_kas.replace(btn_disabled_old, btn_disabled_new)

# Protect Delete Transaction
del_old = '<button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>'
del_new = '{isKasAdmin && <button onClick={() => handleDeleteTrx(trx.id!)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4 mx-auto"/></button>}'
text_kas = text_kas.replace(del_old, del_new)

# Protect Bulk Payment Button
bulk_old = 'onClick={() => {\n                            setSelectedAthleteForBulk(athlete);'
bulk_new = 'onClick={() => {\n                            if(!isKasAdmin) return;\n                            setSelectedAthleteForBulk(athlete);'
text_kas = text_kas.replace(bulk_old, bulk_new)
bulk_class_old = 'className="w-full rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors"'
bulk_class_new = 'className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${isKasAdmin ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-white/5 text-slate-500 cursor-not-allowed"}`}'
text_kas = text_kas.replace(bulk_class_old, bulk_class_new)

p_kas.write_text(text_kas)

# 2. Update Sidebar to show menu for everyone
p_sb = Path('/home/ubuntu/apps/beratnyaCrown/src/components/sidebar.tsx')
text_sb = p_sb.read_text()
sb_old = '''  ...(isAdmin || isKasAdmin
    ? [
        {
          label: "Kas Crown",
          href: "/dashboard/kas",
          icon: Calculator,
        },
      ]
    : []),'''
sb_new = '''  {
    label: "Kas Crown",
    href: "/dashboard/kas",
    icon: Calculator,
  },'''
text_sb = text_sb.replace(sb_old, sb_new)
p_sb.write_text(text_sb)

# 3. Remove layout protection
p_layout = Path('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/kas/layout.tsx')
p_layout.unlink()

print("DONE")
