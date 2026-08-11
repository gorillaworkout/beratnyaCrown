"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, orderBy, query } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Download, Search, UserPlus, MapPin, Phone } from "lucide-react";

type Recruit = {
  id: string;
  regNumber: string;
  batch: number;
  fullName: string;
  birthDate: string;
  age: number;
  gender: "perempuan" | "laki-laki";
  division: "all-girl" | "c4" | "premier";
  whatsapp: string;
  instagram?: string;
  domicileCity: string;
  domicileDetail?: string;
  schoolOrCampus?: string;
  previousTeam: string;
  isBeginner: boolean;
  position: string[];
  experienceYears: string;
  heightCm?: number | null;
  weightKg?: number | null;
  motivation?: string;
  emergencyName: string;
  emergencyPhone: string;
  howDidYouHear?: string;
  status: "baru" | "dihubungi" | "lolos" | "tidak-lolos";
  notes?: string;
  createdAt?: { seconds: number };
};

const DIVISION_LABEL: Record<Recruit["division"], string> = {
  "all-girl": "All Girl",
  c4: "C4",
  premier: "Premier",
};

const STATUSES: Recruit["status"][] = ["baru", "dihubungi", "lolos", "tidak-lolos"];

const STATUS_STYLE: Record<Recruit["status"], string> = {
  baru: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  dihubungi: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  lolos: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "tidak-lolos": "bg-slate-500/15 text-slate-400 border-slate-500/25",
};

function toCsv(rows: Recruit[]): string {
  const headers = [
    "No Registrasi", "Nama", "Umur", "Tanggal Lahir", "Gender", "Divisi",
    "WhatsApp", "Instagram", "Domisili", "Detail Domisili", "Sekolah/Kampus",
    "Tim Sebelumnya", "Pemula", "Posisi", "Pengalaman", "Tinggi", "Berat",
    "Kontak Darurat", "No Darurat", "Tahu Dari", "Motivasi", "Status",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.regNumber, r.fullName, r.age, r.birthDate, r.gender, DIVISION_LABEL[r.division],
      r.whatsapp, r.instagram, r.domicileCity, r.domicileDetail, r.schoolOrCampus,
      r.previousTeam, r.isBeginner ? "Ya" : "Tidak", (r.position || []).join(" / "),
      r.experienceYears, r.heightCm, r.weightKg, r.emergencyName, r.emergencyPhone,
      r.howDidYouHear, r.motivation, r.status,
    ].map(esc).join(",")
  );
  // BOM so Excel opens UTF-8 correctly.
  return "\uFEFF" + [headers.join(","), ...lines].join("\n");
}

export default function RecruitsPage() {
  const { isAdmin } = useAuth();
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [divFilter, setDivFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "crown-recruits"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecruits(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Recruit));
        setLoading(false);
      },
      // Missing composite index or rules error shouldn't leave a permanent spinner.
      (err) => {
        console.error("[recruits] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return recruits.filter((r) => {
      if (divFilter !== "all" && r.division !== divFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return (
        r.fullName?.toLowerCase().includes(s) ||
        r.regNumber?.toLowerCase().includes(s) ||
        r.domicileCity?.toLowerCase().includes(s) ||
        r.whatsapp?.includes(s)
      );
    });
  }, [recruits, search, divFilter, statusFilter]);

  const stats = useMemo(() => {
    const byDivision = { "all-girl": 0, c4: 0, premier: 0 } as Record<string, number>;
    const byCity: Record<string, number> = {};
    let beginners = 0;
    for (const r of recruits) {
      byDivision[r.division] = (byDivision[r.division] || 0) + 1;
      byCity[r.domicileCity] = (byCity[r.domicileCity] || 0) + 1;
      if (r.isBeginner) beginners++;
    }
    const topCities = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total: recruits.length, byDivision, topCities, beginners };
  }, [recruits]);

  const setStatus = async (id: string, status: Recruit["status"]) => {
    await updateDoc(doc(db, "crown-recruits", id), { status });
  };

  const download = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pendaftar-angkatan-18-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-amber-400" />
            <p className="font-semibold">Halaman khusus admin</p>
            <p className="text-sm text-muted-foreground">
              Data pendaftar hanya bisa dilihat oleh admin Crown.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pendaftar Angkatan 18</h1>
          <p className="text-sm text-muted-foreground">
            Data masuk otomatis dari halaman recruitment crownallstar.com
          </p>
        </div>
        <Button onClick={download} variant="outline" size="sm" disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV ({filtered.length})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserPlus className="h-4 w-4" /> Total Pendaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.beginners} pemula</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Per Divisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(["all-girl", "c4", "premier"] as const).map((d) => (
              <div key={d} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{DIVISION_LABEL[d]}</span>
                <span className="font-semibold">{stats.byDivision[d] || 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" /> Domisili Terbanyak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.topCities.map(([city, n]) => (
                  <span
                    key={city}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
                  >
                    {city} <span className="font-semibold text-primary">{n}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, no registrasi, kota, WhatsApp…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={divFilter}
          onChange={(e) => setDivFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Semua divisi</option>
          <option value="all-girl">All Girl</option>
          <option value="c4">C4</option>
          <option value="premier">Premier</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Memuat data…</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium">
                {recruits.length === 0 ? "Belum ada pendaftar" : "Tidak ada yang cocok"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {recruits.length === 0
                  ? "Pendaftaran dibuka 13-21 Agustus 2026."
                  : "Coba ubah filter atau kata pencarian."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Reg</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Umur</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Posisi</TableHead>
                    <TableHead>Domisili</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      >
                        <TableCell className="font-mono text-xs">{r.regNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.gender === "perempuan" ? "P" : "L"}
                            {r.isBeginner && " · pemula"}
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">{r.age}</TableCell>
                        <TableCell>{DIVISION_LABEL[r.division]}</TableCell>
                        <TableCell className="max-w-[160px] text-xs">
                          {(r.position || []).join(", ")}
                        </TableCell>
                        <TableCell className="text-sm">{r.domicileCity}</TableCell>
                        <TableCell>
                          <a
                            href={`https://wa.me/${r.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {r.whatsapp}
                          </a>
                        </TableCell>
                        <TableCell>
                          <select
                            value={r.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setStatus(r.id, e.target.value as Recruit["status"])}
                            className={`rounded-full border px-2 py-1 text-xs ${STATUS_STYLE[r.status]}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-slate-900 text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>

                      {expanded === r.id && (
                        <TableRow key={`${r.id}-detail`}>
                          <TableCell colSpan={8} className="bg-white/[0.02]">
                            <div className="grid gap-4 p-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              <Detail label="Tanggal lahir" value={r.birthDate} />
                              <Detail label="Tim sebelumnya" value={r.previousTeam} />
                              <Detail label="Pengalaman" value={r.experienceYears} />
                              <Detail label="Sekolah / Kampus" value={r.schoolOrCampus} />
                              <Detail label="Instagram" value={r.instagram ? `@${r.instagram}` : ""} />
                              <Detail label="Detail domisili" value={r.domicileDetail} />
                              <Detail
                                label="Tinggi / Berat"
                                value={
                                  r.heightCm || r.weightKg
                                    ? `${r.heightCm ?? "-"} cm / ${r.weightKg ?? "-"} kg`
                                    : ""
                                }
                              />
                              <Detail
                                label="Kontak darurat"
                                value={`${r.emergencyName} · ${r.emergencyPhone}`}
                              />
                              <Detail label="Tahu dari" value={r.howDidYouHear} />
                              {r.motivation && (
                                <div className="sm:col-span-2 lg:col-span-3">
                                  <p className="text-xs text-muted-foreground">Motivasi</p>
                                  <p className="mt-1 leading-relaxed">{r.motivation}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value || "—"}</p>
    </div>
  );
}
