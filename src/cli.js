#!/usr/bin/env node
/**
 * cli.js — x402-toolkit CLI entry point
 *
 * Without args: starts the MCP server (for use with Claude Code, Cursor, etc.)
 * With args: wallet setup helper
 */

import { loadAccount, printSetupInstructions } from "./wallet/index.js";

const args = process.argv.slice(2);

if (args[0] === "wallet") {
  try {
    const account = loadAccount();
    await printSetupInstructions(account.address);
  } catch (err) {
    console.error(`\n[x402-toolkit] ${err.message}\n`);
    process.exit(1);
  }
} else {
  // Default: start MCP server
  await import("./mcp.js");
}
