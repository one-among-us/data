import { Icon, backSVG } from "./icon.js";
import { BannerData } from "./data.js";

function handleFootnote(md: string) {
    if (!md.includes("[^")) return md;

    // Replace footnote references with HTML superscript tags
    return (
        md.replace(/\[\^(\d+)\](?::\s*(.*))?/g, (match, id, text) => text ? // Footnote definition
            `<li id="footnote-${id}">${text}<a href="#footnote-ref-${id}">${backSVG}</a></li>` : // Footnote reference
            `<sup><a href="#footnote-${id}" id="footnote-ref-${id}">${id}</a></sup>`
        )

        // Wrap the footnote definitions in an ordered list
        .replace(/(<li id="footnote.*<\/li>)/gs, "<ol>\n$1\n</ol>")
    );
}

function handleDeleteLine(md: string): string {
    if (!md.includes("~~")) return md;

    return md.replace(/~~(.*?)~~/g, (match, text) => "<del>" + text + "</del>");
}

function handleNoteIcon(md: string): string {
    if (!md.includes("[!")) return md;
    return md.replace(/\[\!(\w+)\](?::\s*(.*))?/g, (match, icon, _) => Icon[icon as string]);
}

function handleBanner(md: string): string {
    if (!md.includes('[[')) return md;
    return md.replace(/\[\[(.*?)\]\]/g, (match, raw) => {
        const data = JSON.parse(raw) as BannerData
        if (data.type != 'banner') return match
        return `<div style="width: 90%; margin: 10px auto; min-height: 100px; display: box; background: #fff4eb; border-radius: 30px; border-color: rgba(166, 134, 89, 0.84); border-style: solid; border-width: 2px"><div style="height: 80px; width: 80px; margin-left: 10px; margin-right: 10px; margin-top: 10px; margin-bottom: 10px; display: inline-grid; vertical-align: top"><img src="${data.icon}" style="width: 100%; height: 100%; border-radius: 20px" /></div><div style="height: 80px; width: calc(100% - 150px); margin-left: 10px; margin-right: 10px; margin-top: 10px; margin-bottom: 10px; display: inline-grid; vertical-align: top" ><h3 style="color: #70512a; margin: 5px; font-size: 1.4rem">${data.title}</h3><p style="color: rgba(166, 134, 89, 0.84); margin: 5px; font-size: 1rem">${data.text}</p></div></div>`
    })
}

export function handleFeatures(markdown: string): string {
    // Handle Footnote
    let md = handleFootnote(markdown)

    // Handle Delete Line: ~~something~~ to <del>something</del>
    md = handleDeleteLine(md)

    // Handle Icon
    md = handleNoteIcon(md)

    // Handle Banner
    md = handleBanner(md)

    return md
}