// Manual check (not part of `npm run test:pricing`): maps the REAL rows from the
// production `villas` table through the same code the browser runs, which is the
// only path that reproduced the white-screen.
import { toVillaProps } from "../app/lib/catalog";
import { fromNightlyPrice, rateWarnings } from "../app/lib/rates";

const SB = "https://zbtwzdwrwjpsmsgxlsbl.supabase.co";
const KEY = "sb_publishable_Rm67pmD3YIpaYmCcGbBZqA_d81dcXcO";

(async () => {
  const res = await fetch(`${SB}/rest/v1/villas?select=*&order=id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const rows = (await res.json()) as unknown[];
  console.log(`\nrows from production: ${rows.length}\n`);

  let bad = 0;
  for (const row of rows) {
    const villa = toVillaProps(row as never);
    if (!Array.isArray(villa.units)) {
      console.log(`  FAIL  id=${villa.id} — units is not an array`);
      bad++;
      continue;
    }
    const from = fromNightlyPrice(villa.units);
    const blockers = rateWarnings(villa.units).filter((w) => w.severity === "blocker");
    console.log(
      `  ok    id=${villa.id} "${villa.title}"  units=${villa.units.length}  ` +
      `from=${from ? `GHS ${from.amount.toLocaleString()} / night (${from.unitName})` : "Enquire"}  ` +
      `blockers=${blockers.length}`,
    );
    for (const b of blockers) console.log(`           BLOCKED ${b.unitName}: ${b.message.slice(0, 88)}…`);
    // The two calls that crashed the deployed page:
    fromNightlyPrice(villa.units);
    villa.units.map((u) => u.id);
  }
  console.log(bad === 0 ? "\n  ALL REAL ROWS MAP SAFELY\n" : `\n  ${bad} FAILED\n`);
  process.exit(bad === 0 ? 0 : 1);
})();
