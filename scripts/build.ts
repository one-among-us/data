import url from "url";
import path from "path";
import fs from "fs-extra";

import YAML from 'js-yaml';
import metadataParser from 'markdown-yaml-metadata-parser';

import { renderMdx } from "./mdx.ts";

const PUBLIC_DIR = "public";

const PEOPLE_DIR = "people";
const COMMENTS_DIR = "comments";

const DIST_DIR = "dist";

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

  // Read internationalized key names
  const infoKeys = YAML.load(fs.readFileSync('info-i18n.yml'))

  // Compile into multiple languages
  for (const lang of ['', '.zh_hant']) {

    // Compiled meta of list of people for the front page (contains keys id, name, profileUrl)
    const peopleList: PeopleMeta[] = [];

    // For each person
    for (const { dirname, srcPath, distPath } of people) {
      const infoFile = fs.readFileSync(path.join(srcPath, `info.yml`), "utf-8");
      const info = YAML.load(infoFile);

      // Read the page.md of that language
      const markdown = fs.readFileSync(path.join(srcPath, `page${lang}.md`), "utf-8");

      // Get the markdown header
      const mdMeta = metadataParser(markdown).metadata
      info.name = mdMeta.name

      // Convert website dict into entries [[k, v], ...]
      info.websites = Object.entries(info.websites ?? {})

      // Convert info dict to [[key, value], ...]
      // And add info k-v pairs from markdown to the info object in json5
      info.info = [...Object.entries(mdMeta.info ?? {}), ...Object.entries(info.info ?? {})]

      // Convert key names to internationalized key names
      let langKey = indexTrim(lang, ".")
      if (langKey == '') langKey = "zh_hans"
      const keys = infoKeys[langKey]['key']
      info.info = info.info.map(pair => [pair[0] in keys ? keys[pair[0]] : pair[0], pair[1]])

      // Combine comments in people/${dirname}/comments/${cf}.json
      const commentPath = path.join(srcPath, COMMENTS_DIR)
      fs.ensureDirSync(commentPath)
      info.comments = fs.readdirSync(commentPath)
        .filter(cf => cf.endsWith('.json'))
        .map(cf => JSON.parse(fs.readFileSync(path.join(commentPath, cf), 'utf-8')))

      // Write info.json
      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `info${lang}.json`), JSON.stringify(info));

      // Create people list meta information
      const peopleMeta = {
        path: dirname,
        ...Object.fromEntries(PEOPLE_LIST_KEYS.map(key => [key, info[key]]))
      } as PeopleMeta;

      // Add meta to people list
      if (peopleList.filter(it => it.id == peopleMeta.id).length == 0)
        peopleList.push(peopleMeta);
    }

    // Write people-list.json
    fs.writeFileSync(path.join(projectRoot, DIST_DIR, `people-list${lang}.json`), JSON.stringify(peopleList));
  }
}

// Render `people/${dirname}/page.md` to `dist/people/${dirname}/page.js`.
function buildPeoplePages() {
  for (const { srcPath, distPath } of people) {
    for (const lang of ['', '.zh_hant'])
    {
      // Read markdown page and remove markdown meta
      const markdown = metadataParser(fs.readFileSync(path.join(srcPath, `page${lang}.md`), "utf-8")).content;
      const result = renderMdx(markdown);

      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `page${lang}.js`), result);
    }
  }
}

// Copy `people/${dirname}/photos` to `dist/people/${dirname}/`.
function copyPeopleAssets() {
  const PEOPLE_ASSETS = ["photos", "backup"];

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

/**
 * Trim a specific char from a string
 *
 * @param str String
 * @param ch Character (must have len 1)
 */
function indexTrim(str: string, ch: string) {
  let start = 0
  let end = str.length

  while (start < end && str[start] === ch)
    ++start;

  while (end > start && str[end - 1] === ch)
    --end;

  return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}
