#!/usr/bin/env -S npx tsx

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getEOL, getMaintenanceRelease, versionToLatest } from "./index.mjs";

const argv = yargs(hideBin(process.argv))
  .command(
    "* <shorthand>",
    "Get the version number for a given Node.js version shorthand.",
    (yargs) => {
      return yargs.positional("shorthand", {
        describe: `The Node.js version shorthand, such as "lts", "latest", "current", or "maintenance", a codename (such as "Iron"), or a complete or partial version number (such as "20" or "20.1" or "20.1.0").`,
        type: "string",
      });
    },
  )
  .example(
    "$0 latest",
    "Get the latest version number for the current release line.",
  )
  .example(
    "$0 lts",
    "Get the latest version number for the active LTS release line.",
  )
  .example(
    "$0 iron",
    `Get the latest version number for the "Iron" release line.`,
  )
  .example(
    "$0 maintenance",
    "Get the latest version number for the oldest supported (maintenance) release line.",
  )
  .parseSync();

const shorthand = argv.shorthand as string;
const version =
  shorthand === "maintenance"
    ? getMaintenanceRelease()
    : versionToLatest.get(shorthand);

if (!version) {
  console.error("No such release!");
  process.exit(1);
}

const eol = getEOL(version);
if (eol.isEOL) {
  console.error(`Warning: ${version} is end-of-life since ${eol.endDate}`);
}

console.log(version);
