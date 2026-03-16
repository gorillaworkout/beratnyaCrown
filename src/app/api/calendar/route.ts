import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ─── Constants ─────────────────────────────────────────────────────────────

const JERSEY_COLORS = [
  { name: "Merah", emoji: "🔴" },
  { name: "Biru", emoji: "🔵" },
  { name: "Pink", emoji: "🩷" },
  { name: "Ungu", emoji: "🟣" },
  { name: "Hijau", emoji: "🟢" },
  { name: "Hitam", emoji: "⚫" },
];

const REGULAR_DAYS = new Set([0, 3, 6]); // Sun, Wed, Sat
const TRAINING_START = new Date(2026, 3, 1); // April 1, 2026

// ─── Helpers ───────────────────────────────────────────────────────────────

function getJerseyForDate(
  dateStr: string,
  index: number,
  prevColorIndex: number | null
): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  hash = Math.abs(hash + index * 7);
  let colorIndex = hash % JERSEY_COLORS.length;
  if (prevColorIndex !== null && colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % JERSEY_COLORS.length;
  }
  return colorIndex;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function padDate(n: number): string {
  return String(n).padStart(2, "0");
}

function escapeICS(text: string): string {
  return text.replace(/[\\;,]/g, (m) => "\\" + m);
}

// ─── Generate schedule for a range of months ───────────────────────────────

type ScheduleEntry = {
  date: string; // YYYY-MM-DD
  jerseyName: string;
  jerseyEmoji: string;
  isCustom: boolean;
  customLabel?: string;
};

async function generateSchedule(
  monthsAhead: number = 6
): Promise<ScheduleEntry[]> {
  // Fetch Firestore data
  const [customDatesSnap, overridesSnap] = await Promise.all([
    adminDb.collection("crown-custom-dates").get(),
    adminDb.collection("crown-jersey-overrides").doc("overrides").get(),
  ]);

  const customDates = new Map<string, string>();
  customDatesSnap.docs.forEach((doc) => {
    const data = doc.data();
    customDates.set(data.date as string, (data.label as string) || "Latihan Tambahan");
  });

  const overrides = (overridesSnap.exists ? overridesSnap.data() : {}) as Record<string, number>;

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  const entries: ScheduleEntry[] = [];
  let prevColorIndex: number | null = null;

  for (let offset = 0; offset < monthsAhead; offset++) {
    const month = (startMonth + offset) % 12;
    const year = startYear + Math.floor((startMonth + offset) / 12);
    const daysInMonth = getDaysInMonth(year, month);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${padDate(month + 1)}-${padDate(day)}`;
      const dayOfWeek = date.getDay();

      const isRegular = REGULAR_DAYS.has(dayOfWeek) && date >= TRAINING_START;
      const isCustom = customDates.has(dateStr);

      if (isRegular || isCustom) {
        let colorIndex: number;
        if (overrides[dateStr] !== undefined) {
          colorIndex = overrides[dateStr];
        } else {
          colorIndex = getJerseyForDate(dateStr, entries.length, prevColorIndex);
        }

        const jersey = JERSEY_COLORS[colorIndex];

        entries.push({
          date: dateStr,
          jerseyName: jersey.name,
          jerseyEmoji: jersey.emoji,
          isCustom,
          customLabel: isCustom ? customDates.get(dateStr) : undefined,
        });

        prevColorIndex = colorIndex;
      }
    }
  }

  return entries;
}

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const schedule = await generateSchedule(6); // 6 months ahead

    // Also fetch events
    const eventsSnap = await adminDb.collection("crown-events").get();
    const events = eventsSnap.docs.map((doc) => doc.data());

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Crown Allstar Cheerleading//Jadwal Latihan//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Crown Allstar - Jadwal Latihan",
      "X-WR-TIMEZONE:Asia/Jakarta",
      "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
      "X-PUBLISHED-TTL:PT6H",
    ];

    // Training sessions
    for (const entry of schedule) {
      const dateCompact = entry.date.replace(/-/g, "");
      const uid = `crown-training-${entry.date}@crownallstar.id`;
      const summary = entry.isCustom
        ? `Latihan Tambahan: ${entry.customLabel || "Latihan"}`
        : "Latihan Crown Allstar";

      lines.push("BEGIN:VEVENT");
      lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
      lines.push(`DTEND;VALUE=DATE:${dateCompact}`);
      lines.push(`DTSTAMP:${timestamp}`);
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${escapeICS(summary)}`);
      lines.push(
        `DESCRIPTION:${escapeICS(
          `Jersey: ${entry.jerseyEmoji} ${entry.jerseyName}${entry.isCustom ? "\\nTipe: Latihan Tambahan" : "\\nTipe: Latihan Rutin (Rabu/Sabtu/Minggu)"}`
        )}`
      );
      lines.push("LOCATION:Crown Allstar Cheerleading\\, Bandung");
      lines.push("STATUS:CONFIRMED");
      if (entry.isCustom) {
        lines.push("CATEGORIES:Latihan Tambahan");
      } else {
        lines.push("CATEGORIES:Latihan Rutin");
      }
      lines.push("END:VEVENT");
    }

    // Competition events
    for (const event of events) {
      const dateCompact = (event.date as string).replace(/-/g, "");
      const uid = `crown-event-${event.date}@crownallstar.id`;

      lines.push("BEGIN:VEVENT");
      lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
      lines.push(`DTEND;VALUE=DATE:${dateCompact}`);
      lines.push(`DTSTAMP:${timestamp}`);
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${escapeICS(`${event.emoji || "🏆"} ${event.name as string}`)}`);
      lines.push("DESCRIPTION:Kompetisi Crown Allstar Cheerleading");
      lines.push("STATUS:CONFIRMED");
      lines.push("CATEGORIES:Kompetisi");
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="crown-jadwal.ics"',
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "Failed to generate calendar" },
      { status: 500 }
    );
  }
}
