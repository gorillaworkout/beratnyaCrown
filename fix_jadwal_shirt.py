import re

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'r') as f:
    content = f.read()

# Make the status color function return the shirt color for Latihan Tambahan as well if it's set
old_getStatusColor = """const getStatusColor = (entryObj?: ScheduleEntry) => {
    if (!entryObj) return "";
    if (entryObj.status === "libur") return "bg-gradient-to-br from-red-500 to-red-600";
    if (entryObj.status === "event") return "bg-gradient-to-br from-indigo-500 to-purple-600";
    if (entryObj.holidayName && entryObj.status !== "tambahan" && entryObj.status !== "latihan" && entryObj.status !== "event") return "bg-gradient-to-br from-zinc-600 to-zinc-800";
    if (entryObj.status === "tambahan") return "bg-gradient-to-br from-amber-500 to-amber-600";
    // Latihan Biasa -> ikuti warna baju
    if (entryObj.shirtColor) {
        switch(entryObj.shirtColor.name) {
          case "Merah": return "bg-gradient-to-br from-red-500 to-red-700";
          case "Hitam": return "bg-gradient-to-br from-slate-700 to-slate-900";
          case "Biru": return "bg-gradient-to-br from-blue-500 to-blue-700";
          case "Orange": return "bg-gradient-to-br from-orange-500 to-orange-700";
          case "Putih": return "bg-slate-200 text-slate-900 border border-slate-300"; // Teks jadi gelap untuk putih
          case "Pink": return "bg-gradient-to-br from-pink-500 to-pink-700";
        }
    }
    return "bg-gradient-to-br from-blue-500 to-blue-600";
  };"""

new_getStatusColor = """const getStatusColor = (entryObj?: ScheduleEntry) => {
    if (!entryObj) return "";
    if (entryObj.status === "libur") return "bg-gradient-to-br from-red-500 to-red-600";
    if (entryObj.status === "event") return "bg-gradient-to-br from-indigo-500 to-purple-600";
    if (entryObj.holidayName && entryObj.status !== "tambahan" && entryObj.status !== "latihan" && entryObj.status !== "event") return "bg-gradient-to-br from-zinc-600 to-zinc-800";
    
    // Jika Latihan / Latihan Tambahan dan ada warna bajunya, paksa ikuti warna bajunya
    if ((entryObj.status === "latihan" || entryObj.status === "tambahan") && entryObj.shirtColor) {
        switch(entryObj.shirtColor.name) {
          case "Merah": return "bg-gradient-to-br from-red-500 to-red-700";
          case "Hitam": return "bg-gradient-to-br from-slate-700 to-slate-900";
          case "Biru": return "bg-gradient-to-br from-blue-500 to-blue-700";
          case "Orange": return "bg-gradient-to-br from-orange-500 to-orange-700";
          case "Putih": return "bg-slate-200 text-slate-900 border border-slate-300";
          case "Pink": return "bg-gradient-to-br from-pink-500 to-pink-700";
        }
    }
    
    if (entryObj.status === "tambahan") return "bg-gradient-to-br from-amber-500 to-amber-600";
    
    return "bg-gradient-to-br from-blue-500 to-blue-600";
  };"""

content = content.replace(old_getStatusColor, new_getStatusColor)

with open('/home/ubuntu/apps/beratnyaCrown/src/app/dashboard/jadwal/page.tsx', 'w') as f:
    f.write(content)
