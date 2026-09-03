import url from "url";
import path from "path";
import fs from "fs-extra";
import YAML from "js-yaml";
import metadataParser from "markdown-yaml-metadata-parser";
import { Solar, Lunar, LunarYear, LunarMonth } from "lunar-typescript";
import { HData } from "./data.js";

const projectRoot = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const peopleDir = path.join(projectRoot, "people");
const hdataPath = path.join(projectRoot, "data", "hdata.json");

export interface PersonRecord {
  id: string;
  name: string;
  anniversary: string;
  nextAnniversary: string;
  birthDate: string;
  deathDate: string;
  birthday: string;
  deathDay: string;
  isCommentOnly: string;
  isExcluded: string;
  notShowOnHome: string;
  actualHide: string;
  isTrigger: string;
  switchTarget: string;
  skipAge: string;
  probability: string;
  group: string;
}

export interface HDataIndex {
  commentOnlySet: Set<string>;
  excludeSet: Set<string>;
  notShowOnHomeSet: Set<string>;
  actualHideSet: Set<string>;
  triggerSet: Set<string>;
  skipAgesSet: Set<string>;
  switchMap: Map<string, string>;
  groupMap: Map<string, string>;
  probabilities: Record<string, number>;
}

function escapeCsvCell(val: unknown): string {
  const cell = val === null || val === undefined ? "" : String(val);
  if (cell.includes('"') || cell.includes(',') || cell.includes('\n') || cell.includes('\r')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function normalizeDateInput(val: unknown): string {
  if (typeof val === "string") {
    return val.trim();
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const yyyy = String(val.getUTCFullYear()).padStart(4, "0");
    const mm = String(val.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(val.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function getTodaySolarString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getSolarStringFromLunar(solarObj: any): string {
  return `${solarObj.getYear()}-${String(solarObj.getMonth()).padStart(2, "0")}-${String(solarObj.getDay()).padStart(2, "0")}`;
}

function findNextLunarAnniversary(month: number, day: number, todayStr: string): string {
  const absMonth = Math.abs(month);
  if (absMonth < 1 || absMonth > 12 || day < 1 || day > 30) {
    return "";
  }

  const todayYear = parseInt(todayStr.slice(0, 4), 10);
  const candidates: string[] = [];

  for (let y = todayYear - 1; y <= todayYear + 2; y++) {
    try {
      const lm = LunarMonth.fromYm(y, absMonth);
      if (lm) {
        const d = Math.min(day, lm.getDayCount());
        candidates.push(getSolarStringFromLunar(Lunar.fromYmd(y, absMonth, d).getSolar()));
      }
    } catch {
      // Ignored if lunar date cannot be constructed
    }

    try {
      const ly = LunarYear.fromYear(y);
      if (ly.getLeapMonth() === absMonth) {
        const lmLeap = LunarMonth.fromYm(y, -absMonth);
        if (lmLeap) {
          const d = Math.min(day, lmLeap.getDayCount());
          candidates.push(getSolarStringFromLunar(Lunar.fromYmd(y, -absMonth, d).getSolar()));
        }
      }
    } catch {
      // Ignored if leap lunar date cannot be constructed
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates)).sort();
  for (const candidate of uniqueCandidates) {
    if (candidate >= todayStr) {
      return candidate;
    }
  }
  return "";
}

function findNextSolarAnniversary(monthDay: string, todayStr: string): string {
  const parts = monthDay.split("-").map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return "";
  }
  const mm = parts[0];
  const dd = parts[1];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return "";
  }

  const todayYear = parseInt(todayStr.slice(0, 4), 10);

  for (let y = todayYear; y <= todayYear + 1; y++) {
    let d = dd;
    if (mm === 2 && dd === 29) {
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      if (!isLeap) {
        d = 28;
      }
    }
    const candidate = `${y}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (candidate >= todayStr) {
      return candidate;
    }
  }
  return "";
}

export function parseDates(infoObj: any, id: string, todayStr: string): {
  birthDate: string;
  deathDate: string;
  birthday: string;
  deathDay: string;
  anniversary: string;
  nextAnniversary: string;
} {
  let birthDate = "";
  let birthday = "";
  let deathDate = "";
  let deathDay = "";

  let lunarMonth = 0;
  let lunarDay = 0;
  let solarMd = "";

  const bornStr = normalizeDateInput(infoObj?.info?.born);
  const isLunar = Boolean(infoObj?.info?.lunar_birthday);

  const YEAR_SUFFIX = "\u5e74";
  const MONTH_SUFFIX = "\u6708";
  const LEAP_PREFIX = "\u95f0";

  if (bornStr) {
    if (isLunar) {
      if (bornStr.startsWith("0000-")) {
        const match = bornStr.match(/^0000-(-?\d+)-(\d+)$/);
        if (match) {
          const mm = parseInt(match[1], 10);
          const dd = parseInt(match[2], 10);
          const absMm = Math.abs(mm);
          lunarMonth = absMm;
          lunarDay = dd;

          const leap = mm < 0 ? LEAP_PREFIX : "";
          const refLunar = Lunar.fromYmd(2000, absMm, dd);
          const lunarMonthStr = refLunar.getMonthInChinese();
          const lunarDayStr = refLunar.getDayInChinese();
          birthDate = "";
          birthday = `${leap}${lunarMonthStr}${MONTH_SUFFIX}${lunarDayStr}`;
        } else {
          console.warn(`[Warning] Invalid lunar born format for "${id}": ${bornStr}`);
        }
      } else {
        const parts = bornStr.split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const solar = Solar.fromYmd(parts[0], parts[1], parts[2]);
          const lunar = solar.getLunar();
          lunarMonth = Math.abs(lunar.getMonth());
          lunarDay = lunar.getDay();

          const lunarYear = lunar.getYear();
          const lunarMonthStr = lunar.getMonthInChinese();
          const lunarDayStr = lunar.getDayInChinese();
          birthDate = `${lunarYear}${YEAR_SUFFIX}${lunarMonthStr}${MONTH_SUFFIX}${lunarDayStr}`;
          birthday = `${lunarMonthStr}${MONTH_SUFFIX}${lunarDayStr}`;
        } else {
          console.warn(`[Warning] Invalid lunar born date for "${id}": ${bornStr}`);
        }
      }
    } else {
      if (bornStr.startsWith("0000-")) {
        const match = bornStr.match(/^0000-(\d+)-(\d+)$/);
        if (match) {
          const mm = parseInt(match[1], 10);
          const dd = parseInt(match[2], 10);
          birthDate = "";
          birthday = `${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
          solarMd = birthday;
        } else {
          console.warn(`[Warning] Invalid born format for "${id}": ${bornStr}`);
        }
      } else {
        const match = bornStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          birthDate = bornStr;
          birthday = `${match[2]}-${match[3]}`;
          solarMd = birthday;
        } else {
          console.warn(`[Warning] Unexpected born format for "${id}": ${bornStr}`);
        }
      }
    }
  }

  const diedStr = normalizeDateInput(infoObj?.info?.died);
  if (diedStr) {
    const match = diedStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      deathDate = diedStr;
      deathDay = `${match[2]}-${match[3]}`;
    } else {
      console.warn(`[Warning] Unexpected died format for "${id}": ${diedStr}`);
    }
  }

  const anniversary = birthday || deathDay || "";

  let nextAnniversary = "";
  if (isLunar && lunarMonth > 0 && lunarDay > 0) {
    nextAnniversary = findNextLunarAnniversary(lunarMonth, lunarDay, todayStr);
  } else {
    const targetSolarMd = solarMd || deathDay || "";
    if (targetSolarMd) {
      nextAnniversary = findNextSolarAnniversary(targetSolarMd, todayStr);
    }
  }

  return {
    birthDate,
    deathDate,
    birthday,
    deathDay,
    anniversary,
    nextAnniversary
  };
}

export function buildHDataIndex(hdata: HData): HDataIndex {
  const switchMap = new Map<string, string>();
  if (Array.isArray(hdata.switch)) {
    for (const pair of hdata.switch) {
      if (pair.length >= 2) {
        switchMap.set(pair[0], pair[1]);
        switchMap.set(pair[1], pair[0]);
      }
    }
  }

  const groupMap = new Map<string, string>();
  if (Array.isArray(hdata.groups)) {
    for (let i = 0; i < hdata.groups.length; i++) {
      const grp = hdata.groups[i];
      const label = `group_${i + 1} (${grp.join(", ")})`;
      for (const member of grp) {
        groupMap.set(member, label);
      }
    }
  }

  return {
    commentOnlySet: new Set(hdata.commentOnly ?? []),
    excludeSet: new Set(hdata.exclude ?? []),
    notShowOnHomeSet: new Set(hdata.notShowOnHome ?? []),
    actualHideSet: new Set(hdata.actualHide ?? []),
    triggerSet: new Set(hdata.trigger ?? []),
    skipAgesSet: new Set(hdata.skipAges ?? []),
    switchMap,
    groupMap,
    probabilities: hdata.probabilities ?? {}
  };
}

export function queryHData(id: string, index: HDataIndex): {
  isCommentOnly: string;
  isExcluded: string;
  notShowOnHome: string;
  actualHide: string;
  isTrigger: string;
  switchTarget: string;
  skipAge: string;
  probability: string;
  group: string;
} {
  return {
    isCommentOnly: index.commentOnlySet.has(id) ? "true" : "",
    isExcluded: index.excludeSet.has(id) ? "true" : "",
    notShowOnHome: index.notShowOnHomeSet.has(id) ? "true" : "",
    actualHide: index.actualHideSet.has(id) ? "true" : "",
    isTrigger: index.triggerSet.has(id) ? "true" : "",
    switchTarget: index.switchMap.get(id) ?? "",
    skipAge: index.skipAgesSet.has(id) ? "true" : "",
    probability: index.probabilities[id] !== undefined ? String(index.probabilities[id]) : "",
    group: index.groupMap.get(id) ?? ""
  };
}

export function generateCsv(targetPath?: string, referenceDate?: string): string {
  const finalPath = targetPath ? path.resolve(targetPath) : path.join(projectRoot, "people.csv");
  const todayStr = referenceDate || getTodaySolarString();

  let hdata: HData = {
    commentOnly: [],
    exclude: [],
    notShowOnHome: [],
    actualHide: [],
    trigger: [],
    switch: [],
    skipAges: [],
    probabilities: {},
    groups: []
  };

  if (fs.existsSync(hdataPath)) {
    try {
      hdata = JSON.parse(fs.readFileSync(hdataPath, "utf-8")) as HData;
    } catch (err) {
      console.error(`[Error] Failed to parse ${hdataPath}:`, err);
    }
  }

  const hdataIndex = buildHDataIndex(hdata);

  const dirEntries = fs
    .readdirSync(peopleDir)
    .filter(name => !name.startsWith(".") && fs.statSync(path.join(peopleDir, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const records: PersonRecord[] = [];

  for (const dirName of dirEntries) {
    const personDirPath = path.join(peopleDir, dirName);
    const infoFilePath = path.join(personDirPath, "info.yml");

    if (!fs.existsSync(infoFilePath)) {
      continue;
    }

    let infoObj: any = null;
    try {
      const infoContent = fs.readFileSync(infoFilePath, "utf-8");
      infoObj = YAML.load(infoContent);
    } catch (err) {
      console.error(`[Error] Failed to parse ${infoFilePath}:`, err);
      continue;
    }

    const pageFilePath = path.join(personDirPath, "page.md");
    let name = "";
    if (fs.existsSync(pageFilePath)) {
      try {
        const pageContent = fs.readFileSync(pageFilePath, "utf-8");
        const parsed = metadataParser(pageContent);
        name = (parsed.metadata?.name ?? "").trim();
      } catch (err) {
        console.warn(`[Warning] Failed to parse frontmatter in ${pageFilePath}:`, err);
      }
    }

    if (!name && infoObj?.name) {
      name = String(infoObj.name).trim();
    }

    const id = (infoObj?.id || dirName).trim();
    const dates = parseDates(infoObj, id, todayStr);
    const hdataFields = queryHData(id, hdataIndex);

    records.push({
      id,
      name,
      ...dates,
      ...hdataFields
    });
  }

  records.sort((a, b) => {
    if (!a.nextAnniversary && !b.nextAnniversary) {
      return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
    }
    if (!a.nextAnniversary) return 1;
    if (!b.nextAnniversary) return -1;
    const diff = a.nextAnniversary.localeCompare(b.nextAnniversary);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
  });

  const headers = [
    "id",
    "name",
    "anniversary",
    "next_anniversary",
    "birth_date",
    "death_date",
    "birthday",
    "death_day",
    "is_comment_only",
    "is_excluded",
    "not_show_on_home",
    "actual_hide",
    "is_trigger",
    "switch_target",
    "skip_age",
    "probability",
    "group"
  ];

  const rows = [
    headers.join(","),
    ...records.map(r =>
      [
        escapeCsvCell(r.id),
        escapeCsvCell(r.name),
        escapeCsvCell(r.anniversary),
        escapeCsvCell(r.nextAnniversary),
        escapeCsvCell(r.birthDate),
        escapeCsvCell(r.deathDate),
        escapeCsvCell(r.birthday),
        escapeCsvCell(r.deathDay),
        escapeCsvCell(r.isCommentOnly),
        escapeCsvCell(r.isExcluded),
        escapeCsvCell(r.notShowOnHome),
        escapeCsvCell(r.actualHide),
        escapeCsvCell(r.isTrigger),
        escapeCsvCell(r.switchTarget),
        escapeCsvCell(r.skipAge),
        escapeCsvCell(r.probability),
        escapeCsvCell(r.group)
      ].join(",")
    )
  ];

  const BOM = "\uFEFF";
  const csvContent = BOM + rows.join("\n") + "\n";

  fs.ensureDirSync(path.dirname(finalPath));
  fs.writeFileSync(finalPath, csvContent, "utf-8");
  console.log(`Generated CSV with ${records.length} records at: ${finalPath}`);

  return finalPath;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === url.fileURLToPath(import.meta.url);
if (isDirectRun) {
  generateCsv(process.argv[2]);
}
