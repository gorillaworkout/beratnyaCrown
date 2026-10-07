"use client";

import { useEffect, useState } from "react";
import { Download, Maximize2, ShieldCheck, X } from "lucide-react";

type Payment = {
  title: string;
  label: string;
  image: string;
  merchant: string;
  nmid: string;
  purpose: string;
  amount: string;
  accent: string;
};

const PAYMENTS: Payment[] = [
  {
    title: "Kas Bandung",
    label: "BDG",
    image: "/qris-kas-bandung.jpg",
    merchant: "Warung Crown",
    nmid: "ID1026495356572",
    purpose: "Iuran latihan Bandung",
    amount: "Rp 13.000 / latihan",
    accent: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  },
  {
    title: "Kas Jakarta",
    label: "JKT",
    image: "/qris-kas-jakarta.jpeg",
    merchant: "Warung Crown Allstar Jakarta",
    nmid: "ID1026608490854",
    purpose: "Iuran latihan Jakarta",
    amount: "Rp 13.000 / latihan",
    accent: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
  },
  {
    title: "Donasi & Dana Non-Kas",
    label: "DONASI",
    image: "/qris-donasi.jpeg",
    merchant: "Firly Deasy Ocktrilyta",
    nmid: "ID1026525860767",
    purpose: "Donatur atau simpanan di luar kas",
    amount: "Sesuai kebutuhan",
    accent: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  },
];

export function PaymentMethods() {
  const [open, setOpen] = useState<Payment | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Metode Pembayaran</h2>
          <p className="mt-1 text-sm text-slate-400">Pilih QRIS sesuai kota dan tujuan. Ketuk QR untuk memperbesar saat scan.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> QRIS resmi Crown
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PAYMENTS.map((payment) => (
          <article key={payment.title} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="flex items-center justify-between gap-2 px-4 pt-4">
              <h3 className="font-semibold text-white">{payment.title}</h3>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${payment.accent}`}>{payment.label}</span>
            </div>

            <button
              type="button"
              onClick={() => setOpen(payment)}
              aria-label={`Perbesar QRIS ${payment.title}`}
              className="mx-4 mt-4 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-white p-2 transition hover:ring-2 hover:ring-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <img src={payment.image} alt={`QRIS ${payment.title}`} className="h-full w-full object-contain" />
            </button>

            <div className="grid grid-cols-2 gap-2 px-4 pb-4 pt-3">
              <button type="button" onClick={() => setOpen(payment)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.12]">
                <Maximize2 className="h-3.5 w-3.5" /> Perbesar
              </button>
              <a href={payment.image} download={`QRIS-Crown-${payment.label}.jpg`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.12]">
                <Download className="h-3.5 w-3.5" /> Simpan QR
              </a>
            </div>

            <dl className="mt-auto space-y-2 border-t border-white/10 px-4 py-3 text-xs">
              <Row label="Kegunaan" value={payment.purpose} />
              <Row label="Nominal" value={payment.amount} strong />
              <Row label="Merchant" value={payment.merchant} />
              <Row label="NMID" value={payment.nmid} mono />
            </dl>
          </article>
        ))}
      </div>

      <p className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-200/90">
        Sebelum bayar, cocokkan nama merchant di aplikasi dengan kartu di atas. Kas dibayar ke QRIS kota masing-masing.
        Bayar dari HP yang sama? Tekan <b>Simpan QR</b>, lalu pilih “scan dari galeri” di aplikasi pembayaran.
      </p>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`QRIS ${open.title}`}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-neutral-950 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">QRIS {open.title}</p>
            <p className="text-sm text-slate-400">{open.merchant} · {open.amount}</p>
          </div>
          <img
            src={open.image}
            alt={`QRIS ${open.title}`}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[78dvh] w-auto max-w-full rounded-xl bg-white object-contain p-2"
          />
          <p className="text-xs text-slate-500">Ketuk di luar gambar untuk menutup</p>
        </div>
      )}
    </section>
  );
}

function Row({ label, value, strong, mono }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className={`text-right ${strong ? "font-semibold text-white" : "text-slate-200"} ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}
