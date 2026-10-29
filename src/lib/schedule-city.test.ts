import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarTileClass,
  resolveAdditionalCity,
  selectCalendarPaintEntry,
} from "./schedule-city.ts";

test("Bandung existing forces additional schedule to Jakarta", () => {
  assert.equal(resolveAdditionalCity(["Bandung"], "Bandung"), "Jakarta");
});

test("Jakarta existing forces additional schedule to Bandung", () => {
  assert.equal(resolveAdditionalCity(["Jakarta"], "Jakarta"), "Bandung");
});

test("duplicate city is rejected when both cities already exist", () => {
  assert.equal(resolveAdditionalCity(["Bandung", "Jakarta"], "Bandung"), null);
});

test("selected city remains available on an empty date", () => {
  assert.equal(resolveAdditionalCity([], "Bandung"), "Bandung");
});

test("rest and holiday entries do not get a colored tile", () => {
  assert.equal(calendarTileClass({ status: "libur" }), "");
  assert.equal(
    calendarTileClass({ status: "libur", holidayName: "Maulid Nabi Muhammad SAW" }),
    ""
  );
  assert.equal(
    calendarTileClass({ status: "libur", shirtColor: { name: "Merah" } }),
    ""
  );
  assert.equal(calendarTileClass(undefined), "");
  assert.equal(calendarTileClass(null), "");
});

test("training tiles keep shirt colors and extra-session amber", () => {
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Merah" } }),
    "bg-gradient-to-br from-red-500 to-red-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Hitam" } }),
    "bg-gradient-to-br from-slate-700 to-slate-900"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Biru" } }),
    "bg-gradient-to-br from-blue-500 to-blue-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Orange" } }),
    "bg-gradient-to-br from-orange-500 to-orange-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Ungu" } }),
    "bg-gradient-to-br from-purple-500 to-purple-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Pink" } }),
    "bg-gradient-to-br from-pink-500 to-pink-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Kuning" } }),
    "bg-gradient-to-br from-yellow-500 to-yellow-700"
  );
  assert.equal(
    calendarTileClass({ status: "latihan", shirtColor: { name: "Hijau" }, holidayName: "Natal" }),
    "bg-gradient-to-br from-green-500 to-green-700"
  );
  assert.equal(calendarTileClass({ status: "latihan" }), "bg-gradient-to-br from-blue-500 to-blue-600");
  assert.equal(calendarTileClass({ status: "tambahan" }), "bg-gradient-to-br from-amber-500 to-amber-600");
  assert.equal(
    calendarTileClass({ status: "tambahan", shirtColor: { name: "Biru" } }),
    "bg-gradient-to-br from-blue-500 to-blue-700"
  );
});

test("event tiles keep their own color", () => {
  assert.equal(
    calendarTileClass({ status: "event" }),
    "bg-gradient-to-br from-indigo-500 to-purple-600"
  );
});

test("a rest-only day is painted from the rest entry and stays plain", () => {
  const picked = selectCalendarPaintEntry([{ status: "libur", timeStart: "10:00" }]);
  assert.equal(picked?.status, "libur");
  assert.equal(calendarTileClass(picked), "");
});

test("a day with a real training session is colored from that session, not a rest row", () => {
  const picked = selectCalendarPaintEntry([
    { status: "libur", timeStart: "10:00" },
    { status: "latihan", city: "Jakarta", shirtColor: { name: "Orange" } },
  ]);
  assert.equal(picked?.status, "latihan");
  assert.equal(calendarTileClass(picked), "bg-gradient-to-br from-orange-500 to-orange-700");
});

test("an event is preferred over rest when the day has no training", () => {
  const picked = selectCalendarPaintEntry([{ status: "libur" }, { status: "event" }]);
  assert.equal(picked?.status, "event");
  assert.equal(calendarTileClass(picked), "bg-gradient-to-br from-indigo-500 to-purple-600");
});
