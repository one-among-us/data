import url from "url";
import path from "path";
import fs from "fs-extra";
import Parse from 'args-parser'
import translate from "google-translate-api-x";

const PEOPLE_DIR = 'people'

const projectRoot = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const peopleDir = path.join(projectRoot, PEOPLE_DIR);

type lang = 'zh-CN' | 'en' | 'zh-TW'

const m = {
    'zh-CN': '',
    'en': '.en',
    'zh-TW': '.zh_hant'
}

const args = Parse(process.argv)

console.log(args)

async function translateFile(id: string, from: lang, to: lang) {
    const md = fs.readFileSync(path.join(peopleDir, id, `page${m[from]}.md`)).toString()
    const td = await translate(md, {
        from: from,
        to: to,
        autoCorrect: true
    })
    fs.writeFileSync(path.join(peopleDir, id, `page${m[to]}.md`), td.text)
}

if (!(args['from'] && args['to'] && args['id'])) {
    throw new Error('args should be --from=from --to=to --id=id')
}

await translateFile(args['id'], args['from'], args['to'])