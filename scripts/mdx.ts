import * as mdx from "@mdx-js/mdx";
import * as swc from "@swc/core";
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export function renderMdx(markdown: string): string {
  const esmCode = mdx.compileSync(markdown, {
    jsxRuntime: "classic",
    pragma: "Vue.h",
    pragmaFrag: "Vue.Fragment",
    pragmaImportSource: "vue",
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex]
  }).value.toString("utf-8");

  const codeRemovedImport = esmCode.replace(/^import .*$/m, "");

  return swc.transformSync(codeRemovedImport, {
    jsc: {
      parser: {
        syntax: "ecmascript"
      },
      loose: true,
    },
    minify: true,
    module: { type: "commonjs" },
  }).code;
}
