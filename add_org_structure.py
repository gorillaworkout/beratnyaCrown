import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

org_structure_html = """
        {/* Struktur Organisasi Tim */}
        <div className="pt-8 mb-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white mb-4">
            <Users className="h-5 w-5 text-indigo-400" />
            Struktur Pengurus Tim (2026)
          </h2>

          <Card className="border-indigo-500/20 bg-indigo-950/10 backdrop-blur-md shadow-xl text-slate-100">
            <CardHeader className="pb-4 border-b border-white/5">
              <CardTitle className="text-lg text-indigo-100">Jajaran Kepengurusan Crown Allstar</CardTitle>
              <CardDescription className="text-indigo-200/60 mt-1">
                Daftar pengurus yang bertanggung jawab atas operasional dan kebutuhan tim. Jangan ragu untuk menghubungi mereka sesuai divisinya masing-masing.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                
                {/* Inti */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                  <h3 className="font-bold text-indigo-300 text-sm border-b border-indigo-500/20 pb-2 uppercase tracking-wider">Pimpinan Tim</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Bayu</span>
                      <span className="text-xs text-indigo-400">Captain</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Dilla</span>
                      <span className="text-xs text-indigo-400">Co-Captain</span>
                    </div>
                  </div>
                </div>

                {/* Keuangan */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                  <h3 className="font-bold text-amber-300 text-sm border-b border-amber-500/20 pb-2 uppercase tracking-wider">Divisi Keuangan</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Yuni</span>
                      <span className="text-xs text-amber-400">Bendahara Tabungan</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Nanda & Aisa</span>
                      <span className="text-xs text-amber-400">Bendahara Harian (Daily)</span>
                    </div>
                  </div>
                </div>

                {/* Logistik & Medis */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <h3 className="font-bold text-emerald-300 text-sm border-b border-emerald-500/20 pb-2 uppercase tracking-wider">Logistik & Medis</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Amay</span>
                      <span className="text-xs text-emerald-400">Kepala Logistik</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Zaidan</span>
                      <span className="text-xs text-emerald-400">Co-Logistik</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Malika</span>
                      <span className="text-xs text-rose-400">P3K / Medis</span>
                    </div>
                  </div>
                </div>

                {/* Media & Komunikasi */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                  <h3 className="font-bold text-cyan-300 text-sm border-b border-cyan-500/20 pb-2 uppercase tracking-wider">Humas & Kreatif</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Lula & Renan</span>
                      <span className="text-xs text-cyan-400">Humas (Konten & Sponsor)</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Malika</span>
                      <span className="text-xs text-cyan-400">Desain Kaos / Merchandise</span>
                    </div>
                  </div>
                </div>

                {/* Official */}
                <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 space-y-3">
                  <h3 className="font-bold text-fuchsia-300 text-sm border-b border-fuchsia-500/20 pb-2 uppercase tracking-wider">Official & Lapangan</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">Adeo</span>
                      <span className="text-xs text-fuchsia-400">Liaison Officer (LO) / Official</span>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
"""

# Find the footer comment and insert the org structure right above it
content = content.replace("        {/* Footer */}", org_structure_html + "\n        {/* Footer */}")

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
