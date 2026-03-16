import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getCalendarClient } from "@/lib/google-calendar";

// ─── Constants ─────────────────────────────────────────────────────────────

const JERSEY_COLORS = [
  { name: "Merah", emoji: "🔴" },
  { name: "Biru", emoji: "🔵" },
  { name: "Pink", emoji: "🩷" },
  { name: "Ungu", emoji: "🟣" },
  { name: "Hijau", emoji: "🟢" },
  { name: "Hitam", emoji: "⚫" },
];

const REGULAR_DAYS = new Set([0, 3, 6]);
const TRAINING_START = new Date(2026, 3, 1);

function getJerseyForDate(dateStr: string, index: number, prev: number | null): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  hash = Math.abs(hash + index * 7);
  let idx = hash % JERSEY_COLORS.length;
  if (prev !== null && idx === prev) idx = (idx + 1) % JERSEY_COLORS.length;
  return idx;
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Sync Handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // Simple auth check - only admin can trigger sync
    const { authorization } = Object.fromEntries(request.headers);
    const body = await request.json().catch(() => ({}));
    const adminKey = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
    
    if (body.key !== adminKey && authorization !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return NextResponse.json(
        { error: "GOOGLE_CALENDAR_ID not configured" },
        { status: 500 }
      );
    }

    const calendar = getCalendarClient();

    // 1. Fetch all data from Firestore
    const [customDatesSnap, overridesSnap, eventsSnap] = await Promise.all([
      adminDb.collection("crown-custom-dates").get(),
      adminDb.collection("crown-jersey-overrides").doc("overrides").get(),
      adminDb.collection("crown-events").get(),
    ]);

    const customDates = new Map<string, string>();
    customDatesSnap.docs.forEach((doc) => {
      const d = doc.data();
      customDates.set(d.date, d.label || "Latihan Tambahan");
    });

    const overrides = (overridesSnap.exists ? overridesSnap.data() : {}) as Record<string, number>;

    // 2. Generate schedule (6 months)
    const now = new Date();
    const entries: { date: string; jersey: string; jerseyEmoji: string; isCustom: boolean; label?: string }[] = [];
    let prev: number | null = null;

    for (let offset = 0; offset < 6; offset++) {
      const month = (now.getMonth() + offset) % 12;
      const year = now.getFullYear() + Math.floor((now.getMonth() + offset) / 12);
      const days = getDaysInMonth(year, month);

      for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
        const isRegular = REGULAR_DAYS.has(date.getDay()) && date >= TRAINING_START;
        const isCustom = customDates.has(dateStr);

        if (isRegular || isCustom) {
          const colorIdx: number = overrides[dateStr] !== undefined
            ? overrides[dateStr]
            : getJerseyForDate(dateStr, entries.length, prev);
          const jersey = JERSEY_COLORS[colorIdx];

          entries.push({
            date: dateStr,
            jersey: jersey.name,
            jerseyEmoji: jersey.emoji,
            isCustom,
            label: isCustom ? customDates.get(dateStr) : undefined,
          });
          prev = colorIdx;
        }
      }
    }

    // 3. Get existing events from Google Calendar (to diff)
    const existingEvents = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 500,
      singleEvents: true,
    });

    const existingMap = new Map<string, string>();
    for (const ev of existingEvents.data.items || []) {
      if (ev.id && ev.extendedProperties?.private?.crownId) {
        existingMap.set(ev.extendedProperties.private.crownId, ev.id);
      }
    }

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // 4. Upsert training events
    const activeIds = new Set<string>();

    for (const entry of entries) {
      const crownId = `training-${entry.date}`;
      activeIds.add(crownId);

      const summary = entry.isCustom
        ? `🏋️ Latihan Tambahan: ${entry.label || "Latihan"}`
        : "🏋️ Latihan Crown Allstar";

      const description = [
        `Jersey: ${entry.jerseyEmoji} ${entry.jersey}`,
        entry.isCustom ? "Tipe: Latihan Tambahan" : "Tipe: Latihan Rutin (Rabu/Sabtu/Minggu)",
        "",
        "📍 Crown Allstar Cheerleading, Bandung",
      ].join("\n");

      const eventBody = {
        summary,
        description,
        location: "Crown Allstar Cheerleading, Bandung",
        start: { date: entry.date },
        end: { date: entry.date },
        extendedProperties: { private: { crownId } },
        colorId: getGoogleColorId(entry.jersey),
      };

      if (existingMap.has(crownId)) {
        await calendar.events.update({
          calendarId,
          eventId: existingMap.get(crownId)!,
          requestBody: eventBody,
        });
        updated++;
      } else {
        await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        created++;
      }
    }

    // 5. Upsert competition events
    for (const doc of eventsSnap.docs) {
      const ev = doc.data();
      const crownId = `event-${ev.date}`;
      activeIds.add(crownId);

      const eventBody = {
        summary: `${ev.emoji || "🏆"} ${ev.name}`,
        description: "Kompetisi Crown Allstar Cheerleading",
        start: { date: ev.date as string },
        end: { date: ev.date as string },
        extendedProperties: { private: { crownId } },
        colorId: "6", // Orange for competitions
      };

      if (existingMap.has(crownId)) {
        await calendar.events.update({
          calendarId,
          eventId: existingMap.get(crownId)!,
          requestBody: eventBody,
        });
        updated++;
      } else {
        await calendar.events.insert({
          calendarId,
          requestBody: eventBody,
        });
        created++;
      }
    }

    // 6. Delete events that no longer exist
    for (const [crownId, eventId] of existingMap) {
      if (!activeIds.has(crownId)) {
        await calendar.events.delete({ calendarId, eventId });
        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      deleted,
      total: entries.length + eventsSnap.size,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

// Map jersey color name to Google Calendar color ID
function getGoogleColorId(jerseyName: string): string {
  const map: Record<string, string> = {
    Merah: "11",   // Tomato
    Biru: "9",     // Blueberry
    Pink: "4",     // Flamingo
    Ungu: "3",     // Grape
    Hijau: "10",   // Basil
    Hitam: "8",    // Graphite
  };
  return map[jerseyName] || "7"; // Default: Peacock
}
