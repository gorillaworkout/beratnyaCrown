"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  A18_SESSIONS,
  attendancePct,
  pastSessions,
  todayStr,
  type AttendanceStatus,
} from "@/lib/a18-sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Check, Save } from "lucide-react";

export type RecruitLite = {
  id: string;
  regNumber: string;
  fullName: string;
  division: string;
  domicileCity?: string;
};

function CityFilter({ value, onChange, cities }: { value: string; onChange: (value: string) => void; cities: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filter kota"
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="all">Semua kota</option>
      {cities.map((city) => <option key={city} value={city}>{city}</option>)}
    </select>
  );
}

const CELL_STYLE: Record<AttendanceStatus | "empty", string> = {
  empty: "text-slate-600 hover:bg-white/5",
  hadir: "bg-emerald-500/20 text-emerald-300",
  izin: "bg-amber-500/20 text-amber-300",
  alpa: "bg-red-500/20 text-red-300",
};

const CELL_LABEL: Record<AttendanceStatus | "empty", string> = {
  empty: "–",
  hadir: "H",
  izin: "I",
  alpa: "A",
};

function shortDate(s: string) {
  const [, m, d] = s.split("-");
  return `${Number(d)}/${Number(m)}`;
}

function nextStatus(cur: AttendanceStatus | undefined): AttendanceStatus | null {
  if (!cur) return "hadir";
  if (cur === "hadir") return "izin";
  if (cur === "izin") return "alpa";
  return null; // alpa → empty
}

type AttendanceMap = Record<string, Partial<Record<string, AttendanceStatus>>>;

export function A18AttendancePanel({ recruits }: { recruits: RecruitLite[] }) {
  const today = todayStr();
  const [data, setData] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("all");

  const cities = useMemo(() => [...new Set(recruits.map((r) => r.domicileCity?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "id")), [recruits]);
  const visibleRecruits = useMemo(
    () => cityFilter === "all" ? recruits : recruits.filter((r) => r.domicileCity === cityFilter),
    [recruits, cityFilter]
  );

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "crown-a18-attendance"),
      (snap) => {
        const m: AttendanceMap = {};
        snap.forEach((d) => {
          m[d.id] = (d.data().sessions ?? {}) as Partial<
            Record<string, AttendanceStatus>
          >;
        });
        setData(m);
        setLoading(false);
      },
      (err) => {
        console.error("[a18-attendance] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const toggle = async (recruit: RecruitLite, date: string) => {
    const cur = data[recruit.id]?.[date];
    const next = nextStatus(cur);
    const key = `${recruit.id}|${date}`;
    setSaving(key);
    try {
      const sessions = { ...(data[recruit.id] ?? {}) };
      if (next) sessions[date] = next;
      else delete sessions[date];
      await setDoc(
        doc(db, "crown-a18-attendance", recruit.id),
        {
          recruitId: recruit.id,
          regNumber: recruit.regNumber,
          fullName: recruit.fullName,
          sessions,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("[a18-attendance] save error:", err);
    } finally {
      setSaving(null);
    }
  };

  const markAllHadir = async (date: string) => {
    setSaving(`col|${date}`);
    try {
      await Promise.all(
        visibleRecruits.map((r) =>
          setDoc(
            doc(db, "crown-a18-attendance", r.id),
            {
              recruitId: r.id,
              regNumber: r.regNumber,
              fullName: r.fullName,
              sessions: { ...(data[r.id] ?? {}), [date]: "hadir" as AttendanceStatus },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        )
      );
    } catch (err) {
      console.error("[a18-attendance] mark-all error:", err);
    } finally {
      setSaving(null);
    }
  };

  const past = useMemo(() => pastSessions(today), [today]);

  const summary = useMemo(
    () =>
      A18_SESSIONS.map((s) => {
        let hadir = 0,
          izin = 0,
          alpa = 0;
        for (const r of visibleRecruits) {
          const st = data[r.id]?.[s];
          if (st === "hadir") hadir++;
          else if (st === "izin") izin++;
          else if (st === "alpa") alpa++;
        }
        return { date: s, hadir, izin, alpa };
      }),
    [data, visibleRecruits]
  );

  const filteredCount = visibleRecruits.length;

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat kehadiran…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-white">10 sesi · Rabu + Sabtu · 26 Agu–26 Sep 2026 · {filteredCount} pendaftar</span>
        <CityFilter value={cityFilter} onChange={setCityFilter} cities={cities} />
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-emerald-500/40" /> H = Hadir
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-amber-500/40" /> I = Izin
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-500/40" /> A = Alpa
        </span>
        <span>Ketuk sel untuk ganti: – → H → I → A → –</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 min-w-[150px] bg-card">
                    Nama
                  </TableHead>
                  {A18_SESSIONS.map((s) => {
                    const future = s > today;
                    return (
                      <TableHead key={s} className="min-w-[52px] text-center">
                        <div className={future ? "text-slate-600" : ""}>
                          {shortDate(s)}
                        </div>
                        {!future && (
                          <button
                            onClick={() => markAllHadir(s)}
                            disabled={saving === `col|${s}`}
                            title={`Tandai semua hadir ${s}`}
                            className="mt-0.5 text-[10px] text-cyan-400 hover:underline disabled:opacity-50"
                          >
                            semua H
                          </button>
                        )}
                      </TableHead>
                    );
                  })}
                  <TableHead className="min-w-[64px] text-right">Hadir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruits.map((r) => {
                  const pct = attendancePct(data[r.id] ?? {}, today);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="sticky left-0 bg-card">
                        <div className="font-medium text-sm">{r.fullName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {r.regNumber}
                        </div>
                      </TableCell>
                      {A18_SESSIONS.map((s) => {
                        const future = s > today;
                        const st = data[r.id]?.[s];
                        const key = `${r.id}|${s}`;
                        return (
                          <TableCell key={s} className="p-1 text-center">
                            <button
                              onClick={() => toggle(r, s)}
                              disabled={future || saving === key}
                              title={future ? "Sesi belum tiba" : `${r.fullName} · ${s}`}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${CELL_STYLE[st ?? "empty"]}`}
                            >
                              {saving === key ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                CELL_LABEL[st ?? "empty"]
                              )}
                            </button>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <span
                          className={`font-bold tabular-nums ${
                            pct >= 80
                              ? "text-emerald-300"
                              : pct >= 50
                                ? "text-amber-300"
                                : "text-red-300"
                          }`}
                        >
                          {pct}%
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          /{past.length} sesi
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ringkasan per sesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <span
                key={s.date}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
              >
                {shortDate(s.date)}{" "}
                <span className="font-semibold text-emerald-300">{s.hadir}H</span>{" "}
                <span className="text-amber-300">{s.izin}I</span>{" "}
                <span className="text-red-300">{s.alpa}A</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Persentase = Hadir ÷ {past.length} sesi yang sudah lewat × 100. Izin
            dan Alpa tetap di penyebut.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

type EvalMap = Record<string, string>;

export function A18EvaluationPanel({ recruits }: { recruits: RecruitLite[] }) {
  const today = todayStr();
  const [evals, setEvals] = useState<EvalMap>({});
  const [attend, setAttend] = useState<AttendanceMap>({});
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<EvalMap>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState("all");

  const cities = useMemo(() => [...new Set(recruits.map((r) => r.domicileCity?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "id")), [recruits]);
  const visibleRecruits = useMemo(
    () => cityFilter === "all" ? recruits : recruits.filter((r) => r.domicileCity === cityFilter),
    [recruits, cityFilter]
  );

  useEffect(() => {
    const unsubEval = onSnapshot(
      collection(db, "crown-a18-evaluations"),
      (snap) => {
        const m: EvalMap = {};
        snap.forEach((d) => {
          m[d.id] = (d.data().notes as string) ?? "";
        });
        setEvals(m);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const [id, v] of Object.entries(m)) {
            if (!next[id]) next[id] = v;
          }
          return next;
        });
        setLoading(false);
      },
      (err) => {
        console.error("[a18-eval] snapshot error:", err);
        setLoading(false);
      }
    );
    const unsubAttend = onSnapshot(
      collection(db, "crown-a18-attendance"),
      (snap) => {
        const m: AttendanceMap = {};
        snap.forEach((d) => {
          m[d.id] = (d.data().sessions ?? {}) as Partial<
            Record<string, AttendanceStatus>
          >;
        });
        setAttend(m);
      },
      (err) => console.error("[a18-attendance] snapshot error:", err)
    );
    return () => {
      unsubEval();
      unsubAttend();
    };
  }, []);

  const save = async (r: RecruitLite) => {
    const notes = (drafts[r.id] ?? "").trim();
    setSavingId(r.id);
    try {
      await setDoc(
        doc(db, "crown-a18-evaluations", r.id),
        {
          recruitId: r.id,
          regNumber: r.regNumber,
          fullName: r.fullName,
          division: r.division,
          notes,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setEvals((prev) => ({ ...prev, [r.id]: notes }));
      setSavedId(r.id);
      setTimeout(() => setSavedId((cur) => (cur === r.id ? null : cur)), 2000);
    } catch (err) {
      console.error("[a18-eval] save error:", err);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat penilaian…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Satu kolom bebas per pendaftar. Kehadiran tampil sebagai konteks.
        Tersimpan per orang lewat tombol Simpan.
      </p>
      <div className="flex items-center gap-3">
        <CityFilter value={cityFilter} onChange={setCityFilter} cities={cities} />
        <span className="text-xs text-muted-foreground">{visibleRecruits.length} pendaftar</span>
      </div>
      <div className="grid gap-3">
        {visibleRecruits.map((r) => {
          const draft = drafts[r.id] ?? "";
          const pct = attendancePct(attend[r.id] ?? {}, today);
          const dirty = draft !== (evals[r.id] ?? "");
          return (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-medium">{r.fullName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {r.regNumber} · kehadiran {pct}%
                  </p>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  placeholder="Penilaian coach — bebas: teknik, attitude, potensi, catatan khusus…"
                  rows={2}
                  maxLength={2000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-end gap-2">
                  {savedId === r.id && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                      <Check className="h-3 w-3" /> Tersimpan
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={dirty ? "default" : "outline"}
                    disabled={!dirty || savingId === r.id}
                    onClick={() => save(r)}
                  >
                    {savingId === r.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    Simpan
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ponytail: keep both panels in one file — they share AttendanceMap, RecruitLite,
// and the session helpers. Split only if a third A18 panel appears.
