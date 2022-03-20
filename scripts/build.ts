import url from "url";
import path from "path";
import fs from "fs-extra";

import json5 from "json5";

import { renderMdx } from "./mdx.ts";

const PUBLIC_DIR = "public";

const PEOPLE_DIR = "people";
const PEOPLE_INFO_FILENAME = "info.json5";
const PEOPLE_PAGE_FILE = "page.md";

const DIST_DIR = "dist";
const DIST_PEOPLE_LIST = "people-list.json";
const DIST_PEOPLE_INFO_FILENAME = "info.json";
const DIST_PEOPLE_PAGE_FILE = "page.js";

const projectRoot = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const peopleDir = path.join(projectRoot, PEOPLE_DIR);
const people = fs.readdirSync(peopleDir).map(person => ({
  dirname: person,
  srcPath: path.join(peopleDir, person),
  distPath: path.join(projectRoot, DIST_DIR, PEOPLE_DIR, person)
}));

// Transform `info.json5` to `info.json`.
// Extract metadata from `people/${dirname}/info.json5` to `dist/people-list.json`.
function buildPeopleInfoAndList() {
  const PEOPLE_LIST_KEYS = ["id", "name", "profileUrl"] as const;

  type PeopleMeta = Record<"path" | typeof PEOPLE_LIST_KEYS[number], unknown>;
  const peopleList: PeopleMeta[] = [];

  for (const { dirname, srcPath, distPath } of people) {
    const infoFile = fs.readFileSync(path.join(srcPath, PEOPLE_INFO_FILENAME), "utf-8");
    const info = json5.parse(infoFile);

    const peopleMeta = {
      path: dirname,
      ...Object.fromEntries(PEOPLE_LIST_KEYS.map(key => [key, info[key]]))
    } as PeopleMeta;

    peopleList.push(peopleMeta);

    fs.ensureDirSync(distPath);
    fs.writeFileSync(path.join(distPath, DIST_PEOPLE_INFO_FILENAME), JSON.stringify(info));
  }

  fs.writeFileSync(path.join(projectRoot, DIST_DIR, DIST_PEOPLE_LIST), JSON.stringify(peopleList));
}

// Render `people/${dirname}/page.md` to `dist/people/${dirname}/page.js`.
function buildPeoplePages() {
  for (const { srcPath, distPath } of people) {
    const markdown = fs.readFileSync(path.join(srcPath, PEOPLE_PAGE_FILE), "utf-8");
    const result = renderMdx(markdown);

    fs.ensureDirSync(distPath);
    fs.writeFileSync(path.join(distPath, DIST_PEOPLE_PAGE_FILE), result);
  }
}

// Copy `people/${dirname}/comments` and `photos` to `dist/people/${dirname}/`.
function copyPeopleAssets() {
  const PEOPLE_ASSETS = ["comments", "photos"];

  for (const { srcPath, distPath } of people) {
    fs.ensureDirSync(distPath);

    for (const assetDirname of PEOPLE_ASSETS) {
      const assetSrcPath = path.join(srcPath, assetDirname);
      if (fs.pathExistsSync(assetSrcPath)) {
        fs.copySync(assetSrcPath, path.join(distPath, assetDirname));
      }
    }
  }
}

// Copy files `public` to dist.
function copyPublic() {
  fs.copySync(path.join(projectRoot, PUBLIC_DIR), path.join(projectRoot, DIST_DIR));
}

buildPeopleInfoAndList();
buildPeoplePages();
copyPeopleAssets();
copyPublic();
