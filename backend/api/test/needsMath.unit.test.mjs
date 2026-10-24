import test from "node:test";
import assert from "node:assert/strict";
import needs from "../dist/needs.js";

const { parseDurationMinutes, computeNetAmounts } = needs;

test("durées : minutes, heures décimales et heures/minutes ont le même sens", () => {
  for (const duration of ["1h30", "1 h 30", "1.5h", "1,5 h", "90 min", "90 minutes"]) {
    assert.equal(parseDurationMinutes(duration), 90, duration);
  }
  assert.equal(parseDurationMinutes("30 min"), 30);
  assert.equal(parseDurationMinutes("2h00"), 120);
  assert.equal(parseDurationMinutes("0,25h"), 15);
  assert.equal(parseDurationMinutes(undefined), 90);
});

test("durées : aucune durée invalide n'est silencieusement convertie en une heure", () => {
  for (const duration of ["1h60", "1h30extra", "1.5h30", "0h", "14 min", "25h", "-1h", "texte"]) {
    assert.throws(() => parseDurationMinutes(duration), /durée/, duration);
  }
});

test("gains : commission bornée et division par la durée réelle de séance", () => {
  assert.deepEqual(computeNetAmounts(10000, 15, "1h30"), {
    netTeacherAmount: 8500, netTeacherHourly: 5667, commissionPct: 15,
  });
  assert.equal(computeNetAmounts(10000, 15, "2h00").netTeacherHourly, 4250);
  assert.throws(() => computeNetAmounts(10000, 101, "1h30"));
  assert.throws(() => computeNetAmounts(-1, 15, "1h30"));
});
