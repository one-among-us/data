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

export function handleFeatures(markdown: string): string {
    // Handle Footnote
    let md = handleFootnote(markdown)

    // Handle Delete Line: ~~something~~ to <del>something</del>
    md = handleDeleteLine(md)

    // Handle Icon
    md = handleNoteIcon(md)

    return md
}