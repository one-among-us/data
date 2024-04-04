import url from "url";
import path from "path";
import fs from "fs-extra";
import autocorrect from "autocorrect-node";

import YAML from 'js-yaml';
import metadataParser from 'markdown-yaml-metadata-parser';

import { renderMdx } from "./mdx.js";
import moment from "moment";
import { Icon } from "./icon.js";

const PUBLIC_DIR = "public";

const PEOPLE_DIR = "people";
const COMMENTS_DIR = "comments";

const DIST_DIR = "dist";

const DATA_DIR = "data";

const projectRoot = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const peopleDir = path.join(projectRoot, PEOPLE_DIR);
const people = fs.readdirSync(peopleDir).map(person => ({
  dirname: person,
  srcPath: path.join(peopleDir, person),
  distPath: path.join(projectRoot, DIST_DIR, PEOPLE_DIR, person)
}));

interface HData {
  commentOnly: string[]
  exclude: string[]
  notShowOnHome: string[]
}

const hdata = JSON.parse(fs.readFileSync(path.join(projectRoot, DATA_DIR, "hdata.json")).toString()) as HData;
const commentOnlyList = hdata.commentOnly;
const excludeList = commentOnlyList.concat(hdata.exclude);
const notShowOnHomeList = hdata.notShowOnHome;

interface PeopleMeta {
  id: string
  name: string
  profileUrl: string
  path: string
  sortKey: string
}

// Transform `info.json5` to `info.json`.
// Extract metadata from `people/${dirname}/info.json5` to `dist/people-list.json`.
function buildPeopleInfoAndList() {
  // Read internationalized key names
  const infoKeys = YAML.load(fs.readFileSync('info-i18n.yml').toString())

  // Compile into multiple languages
  for (const lang of ['', '.zh_hant', '.en']) {

    // Compiled meta of list of people for the front page (contains keys id, name, profileUrl)
    const peopleList: PeopleMeta[] = [];
    const peopleHomeList: PeopleMeta[] = [];

    // For each person
    for (const { dirname, srcPath, distPath } of people) {

      if (excludeList.includes(dirname)) continue;

      const infoFile = fs.readFileSync(path.join(srcPath, `info.yml`), "utf-8");
      const info: any = YAML.load(infoFile);

      // Read the page.md of that language
      const markdown = fs.readFileSync(path.join(srcPath, `page${lang}.md`), "utf-8").replaceAll("<!--", "{/* ").replaceAll("-->", " */}");

      // Get the markdown header
      const mdMeta = metadataParser(markdown).metadata
      info.name = mdMeta.name

      // Convert website dict into entries [[k, v], ...]
      info.websites = Object.entries(info.websites ?? {})

      // Get sort key
      const sortKey = info.info?.died ?? mdMeta.info?.died ?? '0'

      // Add age
      if (info.info && info.info.died && info.info.born)
      {
        try { info.info.age = Math.abs(moment(info.info.died).diff(info.info.born, 'years', false)) }
        catch (e) { console.log(`Unable to calculate age for ${dirname}`) }
      }

      // Convert info dict to [[key, value], ...]
      // And add info k-v pairs from markdown to the info object in json5
      info.info = [...Object.entries(mdMeta.info ?? {}), ...Object.entries(info.info ?? {})]

      // Convert key names to internationalized key names
      let langKey = trim(lang, ".")
      if (langKey == '') langKey = "zh_hans"
      const keys = infoKeys[langKey]['key']
      info.info = info.info.map(pair => [pair[0] in keys ? keys[pair[0]] : pair[0], pair[1]])

      // Combine comments in people/${dirname}/comments/${cf}.json
      const commentPath = path.join(srcPath, COMMENTS_DIR)
      fs.ensureDirSync(commentPath)
      info.comments = fs.readdirSync(commentPath)
        .filter(cf => cf.endsWith('.json'))
        .map(cf => JSON.parse(fs.readFileSync(path.join(commentPath, cf), 'utf-8')))

      // Autocorrect comment contents
      info.comments.forEach(c => c.content = autocorrect.format(c.content))

      // Write info.json
      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `info${lang}.json`), JSON.stringify(info));

      // Create people list meta information
      const peopleMeta = {
        path: dirname,
        sortKey: sortKey,
        ...Object.fromEntries(["id", "name", "profileUrl"].map(key => [key, info[key]]))
      } as PeopleMeta;

      // Add meta to people list
      if (peopleList.filter(it => it.id == peopleMeta.id).length == 0) {
        peopleList.push(peopleMeta);
        if (!hdata.notShowOnHome.includes(peopleMeta.id))
          peopleHomeList.push(peopleMeta)
      }
    }

    peopleList.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    peopleHomeList.sort((a, b) => b.sortKey.localeCompare(a.sortKey))

    // Write people-list.json
    fs.writeFileSync(path.join(projectRoot, DIST_DIR, `people-list${lang}.json`), JSON.stringify(peopleList));
    fs.writeFileSync(path.join(projectRoot, DIST_DIR, `people-home-list${lang}.json`), JSON.stringify(peopleHomeList));
  }
}

// Render `people/${dirname}/page.md` to `dist/people/${dirname}/page.js`.
function buildPeoplePages() {
  for (const { dirname, srcPath, distPath } of people) {

    if (excludeList.includes(dirname)) continue;

    for (const lang of ['', '.zh_hant', '.en'])
    {
      // Read markdown page and remove markdown meta
      let markdown = metadataParser(fs.readFileSync(path.join(srcPath, `page${lang}.md`), "utf-8")).content.replaceAll("<!--", "{/* ").replaceAll("-->", " */}");

      // Handle Footnote
      markdown = handleFootnote(markdown)

      // Handle Icon
      markdown = handleNoteIcon(markdown)

      // Autocorrect markdown
      markdown = autocorrect.formatFor(markdown, 'markdown')

      // Render mdx
      console.log('GENERATED: '+dirname+lang)
      const result = renderMdx(markdown);

      fs.ensureDirSync(distPath);
      fs.writeFileSync(path.join(distPath, `page${lang}.json`), JSON.stringify(result));
    }
  }
}

function handleFootnote(md: string) {
  if (!md.includes('[^')) return md

  // Replace footnote references with HTML superscript tags
  return md.replace(/\[\^(\d+)\](?::\s*(.*))?/g, (match, id, text) => text ?
      // Footnote definition
      `<li id="footnote-${id}">${text}<a href="#footnote-ref-${id}">↩</a></li>` :
      // Footnote reference
      `<sup><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`
  )
  
  // Wrap the footnote definitions in an ordered list
  .replace(/(<li id="footnote.*<\/li>)/gs, '<ol>\n$1\n</ol>')
}

function handleNoteIcon(md: string): string {
  if (!md.includes('[!')) return md;
  return md.replace(/\[\!(\w+)\](?::\s*(.*))?/g, (match, icon, _) => (Icon[icon as string]));
}

// Copy `people/${dirname}/photos` to `dist/people/${dirname}/`.
function copyPeopleAssets() {
  const PEOPLE_ASSETS = ["photos", "backup", "page.md"];

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

function copyComments() {
  for (const dirname of commentOnlyList) {
    const commentPath = path.join(peopleDir, dirname as string, COMMENTS_DIR);
    const distPath = path.join(projectRoot, DIST_DIR, PEOPLE_DIR, dirname as string);
    fs.ensureDirSync(commentPath);
    var info = { comments: [] };
    info.comments = fs
        .readdirSync(commentPath)
        .filter((cf) => cf.endsWith(".json"))
        .map((cf) =>
            JSON.parse(fs.readFileSync(path.join(commentPath, cf), "utf-8"))
        );
    info.comments.forEach((c) => (c.content = autocorrect.format(c.content)));
    fs.ensureDirSync(distPath);
    fs.writeFileSync(path.join(distPath, "info.json"), JSON.stringify(info));
    fs.writeFileSync(path.join(distPath, "info.en.json"), JSON.stringify(info));
    fs.writeFileSync(path.join(distPath, "info.zh_hant.json"), JSON.stringify(info));
  }
}

buildPeopleInfoAndList();
buildPeoplePages();
copyPeopleAssets();
copyPublic();
copyComments();

/**
 * Trim a specific char from a string
 *
 * @param str String
 * @param ch Character (must have len 1)
 */
function trim(str: string, ch: string) {
  let start = 0
  let end = str.length

  while (start < end && str[start] === ch)
    ++start;

  while (end > start && str[end - 1] === ch)
    --end;

  return (start > 0 || end < str.length) ? str.substring(start, end) : str;
}
