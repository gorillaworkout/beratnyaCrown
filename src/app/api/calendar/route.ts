import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isHoliday } from "@/lib/holidays";

const SHIRT_COLORS = [
  { name: "Merah", hex: "#ef4444" },
  { name: "Hitam", hex: "#374151" },
  { name: "Biru", hex: "#3b82f6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Putih", hex: "#f8fafc" },
  { name: "Pink", hex: "#ec4899" },
];

const REGULAR_DAYS = new Set([0, 3, 6]); // Sun, Wed, Sat
const TRAINING_START = new Date(2026, 3, 1); // April 1, 2026

function getDeterministicShirtColor(dateStr: string, prevColorIndex: number): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  let colorIndex = Math.abs(hash) % SHIRT_COLORS.length;
  if (colorIndex === prevColorIndex) {
    colorIndex = (colorIndex + 1) % SHIRT_COLORS.length;
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

type ScheduleStatus = "latihan" | "libur" | "tambahan";
type ScheduleEntry = {
  date: string;
  status: ScheduleStatus;
  timeStart?: string;
  timeEnd?: string;
  note?: string;
  shirtColor?: typeof SHIRT_COLORS[number];
  holidayName?: string;
};

async function generateSchedule(monthsAhead: number = 6): Promise<ScheduleEntry[]> {
  const customSchedulesSnap = await adminDb.collection("crown-schedules").get();
  const customSchedules = new Map<string, any>();
  customSchedulesSnap.docs.forEach((doc) => {
    customSchedules.set(doc.data().date, doc.data());
  });

  const now = new Date();
  const startYear = now.getFullYear();
  const startMonth = now.getMonth();
  const entries: ScheduleEntry[] = [];
  let prevColorIndex = -1;

  for (let offset = 0; offset < monthsAhead; offset++) {
    const month = (startMonth + offset) % 12;
    const year = startYear + Math.floor((startMonth + offset) / 12);
    const daysInMonth = getDaysInMonth(year, month);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${padDate(month + 1)}-${padDate(day)}`;
      const dayOfWeek = date.getDay();
      
      const holidayName = isHoliday(dateStr);
      const isRegular = REGULAR_DAYS.has(dayOfWeek) && date >= TRAINING_START;
      const customSchedule = customSchedules.get(dateStr);
      const isTrainingDay = customSchedule?.status !== "libur" && (customSchedule || isRegular);
      
      let currentShirtColor = undefined;
      if (isTrainingDay) {
        const colorIndex = getDeterministicShirtColor(dateStr, prevColorIndex);
        currentShirtColor = SHIRT_COLORS[colorIndex];
        prevColorIndex = colorIndex;
      }

      if (customSchedule) {
        entries.push({
          date: dateStr,
          status: customSchedule.status,
          timeStart: customSchedule.timeStart,
          timeEnd: customSchedule.timeEnd,
          note: customSchedule.note,
          shirtColor: currentShirtColor,
          holidayName: holidayName || undefined
        });
      } else if (isRegular) {
        const defaultTimeStart = dayOfWeek === 0 ? "10:00" : "19:00";
        const defaultTimeEnd = dayOfWeek === 0 ? "13:00" : "22:00";
        entries.push({
          date: dateStr,
          status: "latihan",
          timeStart: defaultTimeStart,
          timeEnd: defaultTimeEnd,
          shirtColor: currentShirtColor,
          holidayName: holidayName || undefined
        });
      } else if (holidayName) {
        entries.push({
          date: dateStr,
          status: "libur",
          holidayName
        });
      }
    }
  }

  return entries;
}

export async function GET() {
  try {
    const schedule = await generateSchedule(6);
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
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H", // Auto refresh setiap 1 jam
      "X-PUBLISHED-TTL:PT1H",
    ];

    for (const entry of schedule) {
      if (entry.status === "libur") continue;

      const dateCompact = entry.date.replace(/-/g, "");
      const uid = `crown-training-${entry.date}@crownallstar.id`;
      
      let title = entry.status === "tambahan" ? "Latihan Ekstra Crown" : "Latihan Crown Allstar";
      if (entry.holidayName && entry.status === "libur") {
         title = `Libur Nasional: ${entry.holidayName}`;
      }
      
      let descParts = [];
      if (entry.holidayName && entry.status !== "libur") {
         descParts.push(`⚠️ PERHATIAN: Hari ini bertepatan dengan Libur Nasional (${entry.holidayName}). Pastikan ada instruksi dari pelatih terkait libur/tidaknya latihan.`);
      }
      
      if (entry.shirtColor) {
        descParts.push(`👕 Jersey: ${entry.shirtColor.name}`);
      }
      if (entry.note) descParts.push(`📝 Catatan: ${entry.note}`);
      
      const description = descParts.join("\\n");

      lines.push("BEGIN:VEVENT");
      
      if (entry.timeStart && entry.timeEnd) {
        const startDateTime = `${dateCompact}T${entry.timeStart.replace(":", "")}00`;
        const endDateTime = `${dateCompact}T${entry.timeEnd.replace(":", "")}00`;
        lines.push(`DTSTART;TZID=Asia/Jakarta:${startDateTime}`);
        lines.push(`DTEND;TZID=Asia/Jakarta:${endDateTime}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
        lines.push(`DTEND;VALUE=DATE:${dateCompact}`);
      }

      lines.push(`DTSTAMP:${timestamp}`);
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${escapeICS(title)}`);
      if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
      
      // Inject Apple Calendar specific color tag
      if (entry.shirtColor) {
         lines.push(`COLOR:${entry.shirtColor.hex.toUpperCase()}`);
      }

      lines.push("LOCATION:Crown Allstar Cheerleading\\, Bandung");
      lines.push("STATUS:CONFIRMED");
      lines.push("END:VEVENT");
    }

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
      lines.push("COLOR:#f59e0b"); // Amber color for events
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    return new NextResponse(lines.join("\r\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="crown-jadwal.ics"',
        "Cache-Control": "s-maxage=1800, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ error: "Failed to generate calendar" }, { status: 500 });
  }
}
