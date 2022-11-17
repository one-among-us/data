import url from "url";
import path from "path";
import fs from "fs-extra";

import json5 from "json5";

import { renderMdx } from "./mdx.ts";

const PUBLIC_DIR = "public";

const PEOPLE_DIR = "people";
const COMMENTS_DIR = "comments";

const DIST_DIR = "dist";
const DIST_PEOPLE_LIST = "people-list.json";

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
    for (const lang of ['', '.zh_hant']) {
      const infoFile = fs.readFileSync(path.join(srcPath, `info${lang}.json5`), "utf-8");
      const info = json5.parse(infoFile);

      // Add meta information
      const peopleMeta = {
        path: dirname,
        ...Object.fromEntries(PEOPLE_LIST_KEYS.map(key => [key, info[key]]))
      } as PeopleMeta;

      // Avoid duplicates
      if (peopleList.filter(it => it.id == peopleMeta.id).length == 0)
        peopleList.push(peopleMeta);

      // Combine comments in people/${dirname}/comments/${cf}.json
      const commentPath = path.join(srcPath, COMMENTS_DIR)
      fs.ensureDirSync(commentPath)
      info.comments = fs.readdirSync(commentPath)
        .filter(cf => cf.endsWith('.json'))
        .map(cf => JSON.parse(fs.readFileSync(path.join(commentPath, cf), 'utf-8')))

      // Write info.json
      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `info${lang}.json`), JSON.stringify(info));
    }
  }

  // Write people-list.json
  fs.writeFileSync(path.join(projectRoot, DIST_DIR, DIST_PEOPLE_LIST), JSON.stringify(peopleList));
}

// Render `people/${dirname}/page.md` to `dist/people/${dirname}/page.js`.
function buildPeoplePages() {
  for (const { srcPath, distPath } of people) {
    for (const lang of ['', '.zh_hant'])
    {
      const markdown = fs.readFileSync(path.join(srcPath, `page${lang}.md`), "utf-8");
      const result = renderMdx(markdown);

      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `page${lang}.js`), result);
    }
  }
}

// Copy `people/${dirname}/photos` to `dist/people/${dirname}/`.
function copyPeopleAssets() {
  const PEOPLE_ASSETS = ["photos"];

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
