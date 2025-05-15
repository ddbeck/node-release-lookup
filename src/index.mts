import { Temporal } from "@js-temporal/polyfill";
import fetch from "node-fetch";
import semver from "semver";

interface ReleaseSchedule {
  [key: string]: ReleaseLine;
}

interface ReleaseLine {
  start: string;
  lts?: string;
  maintenance?: string;
  codename?: string;
  end: string;
}

const releaseSchedule: ReleaseSchedule = (await (
  await fetch(
    "https://raw.githubusercontent.com/nodejs/Release/refs/heads/main/schedule.json",
  )
).json()) as ReleaseSchedule;

interface Release {
  version: string;
  date: string;
  lts: string | false;
}

const releases: Release[] = (await (
  await fetch("https://nodejs.org/dist/index.json")
).json()) as Release[];

export const versionToLatest: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const setOrUpdateVersion = (key: string, value: string) => {
    const existingVersion = map.get(key);
    if (!existingVersion || semver.gte(value, existingVersion)) {
      map.set(key, value);
    }
  };

  for (const release of releases) {
    const sv = semver.coerce(release.version);
    if (!sv) {
      throw new Error(
        `Expected Node.js releases to contain v1.2.3 version numbers, but got ${release.version}`,
      );
    }

    const version = sv.version ?? null;
    const { major, minor } = sv;

    const keys = [`${major}`, `${major}.${minor}`, "latest", "current"];
    if (release.lts) {
      setOrUpdateVersion(release.lts.toLocaleLowerCase(), version);
      setOrUpdateVersion("lts", version);
    }
    for (const key of keys) {
      setOrUpdateVersion(key, version);
    }
  }
  return map;
})();

function isPast(date: Temporal.PlainDateLike) {
  const now = Temporal.Now.plainDateISO();
  return now.until(date).sign === -1;
}

export function getEOL(version: string): { isEOL: boolean; endDate: string } {
  const sv = semver.parse(version);
  if (!sv) {
    throw new Error(`Got malformed version string ${version}`);
  }

  const releaseLine = `v${sv.major}`;
  const schedule = releaseSchedule[releaseLine];
  if (!schedule) {
    throw new Error(`No data for release line ${releaseLine}`);
  }

  const end = Temporal.PlainDate.from(schedule.end);

  return {
    isEOL: isPast(end),
    endDate: schedule.end,
  };
}

export function getMaintenanceRelease(): string {
  let oldestSupportedRelease: string = versionToLatest.get("latest") as string;
  for (const [line, info] of Object.entries(releaseSchedule)) {
    if (isPast(Temporal.PlainDate.from(info.end))) {
      continue;
    }
    const lineNumber = line.split("v")[1];
    const version = versionToLatest.get(`${lineNumber}`);
    if (!version) {
      continue;
    }

    if (!oldestSupportedRelease) {
      oldestSupportedRelease = version;
    } else {
      if (semver.lt(version, oldestSupportedRelease)) {
        oldestSupportedRelease = version;
      }
    }
  }
  return oldestSupportedRelease;
}
