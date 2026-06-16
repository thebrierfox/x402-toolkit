/**
 * templates — weekly watch cron starters
 *
 * Create recurring paid data jobs that run on schedule.
 * Each template persists its schedule to ~/.x402-toolkit/schedules.json
 */

import cron from "node-cron";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as defaults from "../defaults/index.js";

const CONFIG_DIR = join(homedir(), ".x402-toolkit");
const SCHEDULES_FILE = join(CONFIG_DIR, "schedules.json");

function loadSchedules() {
  try {
    return JSON.parse(readFileSync(SCHEDULES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveSchedule(entry) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const schedules = loadSchedules();
  schedules.push({ ...entry, created: new Date().toISOString() });
  writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

/**
 * createPriceAlert — fires at schedule, calls webhook if threshold crossed
 *
 * @param {object} opts
 * @param {string} opts.ticker      - Stock ticker (e.g. "AAPL")
 * @param {object} opts.threshold   - { below: number, above: number }
 * @param {string} opts.schedule    - Cron expression (e.g. "0 9 * * 1-5")
 * @param {string} [opts.notify]    - Webhook URL to POST result to
 * @returns {object} Cron task handle
 */
export function createPriceAlert({ ticker, threshold, schedule, notify }) {
  const task = cron.schedule(schedule, async () => {
    try {
      const data = await defaults.getStockPrice(ticker);
      const price = data?.price ?? data?.last ?? data?.close;
      if (price == null) return;

      const triggered =
        (threshold.below && price < threshold.below) ||
        (threshold.above && price > threshold.above);

      if (triggered && notify) {
        await fetch(notify, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker, price, threshold, timestamp: new Date().toISOString() }),
        });
      }
    } catch (err) {
      console.error(`[x402-toolkit] priceAlert error:`, err.message);
    }
  });

  saveSchedule({ type: "priceAlert", ticker, threshold, schedule, notify });
  return task;
}

/**
 * createProtocolRevenueDigest — weekly DeFi protocol revenue digest
 *
 * @param {object} opts
 * @param {string} opts.schedule - Cron expression (e.g. "0 8 * * 1")
 * @param {string} [opts.notify] - Webhook URL to POST digest to
 */
export function createProtocolRevenueDigest({ schedule, notify }) {
  const task = cron.schedule(schedule, async () => {
    try {
      const yields = await defaults.getDeFiYields({});
      if (notify) {
        await fetch(notify, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "defi_digest", data: yields, timestamp: new Date().toISOString() }),
        });
      }
    } catch (err) {
      console.error(`[x402-toolkit] protocolRevenueDigest error:`, err.message);
    }
  });

  saveSchedule({ type: "protocolRevenueDigest", schedule, notify });
  return task;
}

/**
 * createMarketRegimeMonitor — weekly market regime change detection
 *
 * @param {object} opts
 * @param {string} opts.schedule - Cron expression (e.g. "0 7 * * 1")
 * @param {string} [opts.notify] - Webhook URL to POST regime signal to
 */
export function createMarketRegimeMonitor({ schedule, notify }) {
  const task = cron.schedule(schedule, async () => {
    try {
      const [overview, macro, yields] = await Promise.all([
        defaults.getMarketOverview(),
        defaults.getMacroIndicators({}),
        defaults.getTreasuryYields(),
      ]);
      const digest = { type: "market_regime", overview, macro, yields, timestamp: new Date().toISOString() };
      if (notify) {
        await fetch(notify, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(digest),
        });
      }
    } catch (err) {
      console.error(`[x402-toolkit] marketRegimeMonitor error:`, err.message);
    }
  });

  saveSchedule({ type: "marketRegimeMonitor", schedule, notify });
  return task;
}
