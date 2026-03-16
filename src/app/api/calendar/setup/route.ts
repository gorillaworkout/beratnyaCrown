import { NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-calendar";

// Create the shared calendar and make it public
// Run this ONCE to set up
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const adminKey = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;

    if (body.key !== adminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const calendar = getCalendarClient();

    // Check if calendar already exists
    const existingId = process.env.GOOGLE_CALENDAR_ID;
    if (existingId) {
      // Just return the existing calendar info
      const cal = await calendar.calendars.get({ calendarId: existingId });
      return NextResponse.json({
        message: "Calendar already exists",
        calendarId: existingId,
        summary: cal.data.summary,
      });
    }

    // Create new calendar
    const newCal = await calendar.calendars.insert({
      requestBody: {
        summary: "Crown Allstar - Jadwal Latihan",
        description:
          "Jadwal latihan dan event Crown Allstar Cheerleading. Auto-sync dari web app.",
        timeZone: "Asia/Jakarta",
      },
    });

    const calendarId = newCal.data.id!;

    // Make it publicly readable
    await calendar.acl.insert({
      calendarId,
      requestBody: {
        role: "reader",
        scope: { type: "default" },
      },
    });

    // Also share with admin email
    await calendar.acl.insert({
      calendarId,
      requestBody: {
        role: "owner",
        scope: { type: "user", value: "darmawanbayu1@gmail.com" },
      },
    });

    return NextResponse.json({
      success: true,
      calendarId,
      summary: newCal.data.summary,
      subscribeUrl: `https://calendar.google.com/calendar/r?cid=${calendarId}`,
      message:
        "Calendar created! Add GOOGLE_CALENDAR_ID to your .env, then run /api/calendar/sync to populate events.",
    });
  } catch (error) {
    console.error("Calendar setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}
