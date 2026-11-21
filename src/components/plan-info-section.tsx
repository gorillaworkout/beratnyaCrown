"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  INSTALLMENT_PLAN_ID,
  shortMonthLabel,
  type InstallmentPlan,
} from "@/lib/installments";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

/**
 * Bagian terstruktur untuk rencana cicilan Kejurda & Kejurnas di Information
 * Board: tabel rincian biaya + timeline termin. Data dibaca langsung dari
 * dokumen rencana (crown-installment-plans). Bila dokumen tidak ada,
 * bagian ini tidak tampil sama sekali.
 */
export function PlanInfoSection() {
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);

  useEffect(() => onSnapshot(doc(db, "crown-installment-plans", INSTALLMENT_PLAN_ID), (snapshot) => {
    setPlan(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as InstallmentPlan) : null);
  }), []);

  if (!plan) return null;

  const firstExpected = plan.terms[0]?.expected;

  return (
    <Card className="border-amber-500/25 bg-amber-950/10 backdrop-blur-md shadow-xl text-slate-100">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-amber-100">{plan.name}</CardTitle>
            <CardDescription className="text-amber-200/60 mt-1">
              Biaya per atlet · total {rupiah.format(plan.totalTarget)}
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300">CICILAN</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Rincian biaya</p>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">Item</TableHead>
                <TableHead className="text-right text-slate-400">Biaya</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.items.map((item, index) => (
                <TableRow key={item.label} className={`border-white/5 ${index % 2 === 1 ? "bg-white/[0.03]" : ""}`}>
                  <TableCell className="py-2 text-slate-200">{item.label}</TableCell>
                  <TableCell className="py-2 text-right text-slate-200">{rupiah.format(item.amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-amber-500/20 bg-amber-500/10">
                <TableCell className="py-2 font-bold text-amber-100">Total per atlet</TableCell>
                <TableCell className="py-2 text-right font-bold text-amber-100">{rupiah.format(plan.totalTarget)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Termin cicilan</p>
          <div className="flex flex-wrap gap-2">
            {plan.terms.map((term) => (
              <span
                key={term.month}
                className={`rounded-full border px-3 py-1.5 text-xs ${term.expected !== firstExpected ? "border-amber-500/40 bg-amber-500/15 text-amber-200" : "border-white/10 bg-white/5 text-slate-200"}`}
              >
                <span className="font-semibold">{shortMonthLabel(term.month)}</span>
                {" · "}
                {rupiah.format(term.expected)}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Nominal bayar boleh beda tiap bulan — progres tiap atlet tercatat di{" "}
          <Link href="/dashboard/savings" className="font-medium text-amber-300 hover:text-amber-200">
            Tabungan
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
