import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'r') as f:
    content = f.read()

# Make sure all occurrences of the old hashing call are fixed
content = content.replace("const colorIdx = getDeterministicShirtColor(dateStr);", "const colorIdx = getDeterministicShirtColor(dateStr);")
content = content.replace("shirtColor: SHIRT_COLORS[getDeterministicShirtColor(dateStr)]", "shirtColor: SHIRT_COLORS[getDeterministicShirtColor(dateStr)]")

# Fix the actual iCal title logic so it shows the shirt
old_title_logic = """if (entry.status === "tambahan") {
      summary = `[Tambahan] Latihan Crown Allstar - ${entry.shirtColor?.name}`;
    } else if (entry.status === "event") {
      summary = `${entry.eventEmoji || "🏆"} ${entry.eventName || "Event Crown Allstar"}`;
    } else if (entry.status === "latihan") {
      summary = `Latihan Crown Allstar - Baju ${entry.shirtColor?.name}`;
    }"""
new_title_logic = """if (entry.status === "tambahan") {
      summary = `[Tambahan] Latihan Crown Allstar - Baju ${entry.shirtColor?.name || ""}`;
    } else if (entry.status === "event") {
      summary = `${entry.eventEmoji || "🏆"} ${entry.eventName || "Event Crown Allstar"}`;
    } else if (entry.status === "latihan") {
      summary = `Latihan Crown Allstar - Baju ${entry.shirtColor?.name || ""}`;
    }"""
content = content.replace(old_title_logic, new_title_logic)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/api/calendar/route.ts', 'w') as f:
    f.write(content)
