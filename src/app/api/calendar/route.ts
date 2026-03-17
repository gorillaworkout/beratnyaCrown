import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isHoliday } from "@/lib/holidays";

const SHIRT_COLORS = [
  { name: "Merah", hex: "#ef4444", emoji: "🔴" },
  { name: "Hitam", hex: "#374151", emoji: "⚫" },
  { name: "Biru", hex: "#3b82f6", emoji: "🔵" },
  { name: "Orange", hex: "#f97316", emoji: "🟠" },
  { name: "Putih", hex: "#f8fafc", emoji: "⚪" },
  { name: "Pink", hex: "#ec4899", emoji: "🩷" },
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
  const schedule: ScheduleEntry[] = [];
  const today = new Date();
  
  // Custom dates from Firestore override regular logic
  const customEventsMap = new Map<string, any>();
  if (adminDb) {
    try {
      const snap = await adminDb.collection("crown-events")
        .where("date", ">=", `${today.getFullYear()}-${padDate(today.getMonth() + 1)}-01`)
        .get();
      snap.forEach(doc => {
        const data = doc.data();
        customEventsMap.set(data.date, data);
      });
    } catch (err) {
      console.warn("Could not fetch custom events from Firestore (ICS sync)", err);
    }
  }

  let prevColorIdx = -1;

  for (let m = 0; m < monthsAhead; m++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (d < TRAINING_START) continue;

      const dateStr = `${year}-${padDate(month + 1)}-${padDate(day)}`;
      const isCustom = customEventsMap.has(dateStr);
      const customData = customEventsMap.get(dateStr);

      if (isCustom) {
        if (customData.status === "libur") {
          schedule.push({ date: dateStr, status: "libur", holidayName: customData.note });
        } else {
          const colorIdx = SHIRT_COLORS.findIndex(c => c.name === customData.shirtColor);
          if (colorIdx !== -1) prevColorIdx = colorIdx;
          
          schedule.push({
            date: dateStr,
            status: customData.status || "tambahan",
            timeStart: customData.timeStart || "19:00",
            timeEnd: customData.timeEnd || "21:00",
            note: customData.note,
            shirtColor: colorIdx !== -1 ? SHIRT_COLORS[colorIdx] : undefined,
          });
        }
        continue;
      }

      // Check National Holiday
      const holidayCheck = isHoliday(dateStr);
      if (holidayCheck) {
        // If it's a regular training day on a holiday, mark it as "libur" but keep a note
        if (REGULAR_DAYS.has(d.getDay())) {
           schedule.push({
             date: dateStr,
             status: "latihan", // Still marked as training, but with a warning note
             timeStart: "19:00",
             timeEnd: "21:00",
             holidayName: holidayCheck,
             shirtColor: SHIRT_COLORS[getDeterministicShirtColor(dateStr, prevColorIdx)]
           });
        }
        continue;
      }

      // Regular schedule
      if (REGULAR_DAYS.has(d.getDay())) {
        const colorIdx = getDeterministicShirtColor(dateStr, prevColorIdx);
        prevColorIdx = colorIdx;
        schedule.push({
          date: dateStr,
          status: "latihan",
          timeStart: "19:00",
          timeEnd: "21:00",
          shirtColor: SHIRT_COLORS[colorIdx],
        });
      }
    }
  }

  return schedule;
}

export async function GET() {
  try {
    const schedule = await generateSchedule();

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Crown Allstar//Jadwal Latihan//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Jadwal Crown Allstar",
      "X-WR-TIMEZONE:Asia/Jakarta",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H", // Auto refresh setiap 1 jam
      "X-PUBLISHED-TTL:PT1H",
    ];

    for (const entry of schedule) {
      if (entry.status === "libur") continue;

      const dateCompact = entry.date.replace(/-/g, "");
      const uid = `crown-training-${entry.date}@crownallstar.id`;
      
      let title = entry.status === "tambahan" ? "Latihan Ekstra Crown" : "Latihan Crown Allstar";
      
      // Inject EMOJI color into Title so users can see it at a glance
      if (entry.shirtColor && entry.shirtColor.emoji) {
        title = `${entry.shirtColor.emoji} ${title}`;
      }

      let descParts = [];
      if (entry.holidayName) {
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
      
      // ADD COLOR/CATEGORY PROPERTY (supported by Apple Calendar/Outlook to some extent)
      if (entry.shirtColor) {
        lines.push(`CATEGORIES:${entry.shirtColor.name}`);
        // Apple specific color property
        lines.push(`COLOR:${entry.shirtColor.hex}`);
      }
      
      // ALARM / REMINDER: 3 Jam sebelum event
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push("DESCRIPTION:" + escapeICS(title));
      lines.push("TRIGGER:-PT3H");
      lines.push("END:VALARM");

      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="jadwal-crown-allstar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Error generating ICS file:", err);
    return NextResponse.json({ error: "Failed to generate schedule" }, { status: 500 });
  }
}
