import { unified } from "npm:unified@11";
import rehypeStringify from "npm:rehype-stringify@10";
import remarkBreaks from "npm:remark-breaks@4";
import remarkGfm from "npm:remark-gfm@4";
import remarkParse from "npm:remark-parse@11";
import remarkRehype from "npm:remark-rehype@11";
import type { Element, Root } from "npm:hast@1";
import { SKIP, visit } from "npm:unist-util-visit@5";
import { Handler } from "../build.ts";

const cleanUpFootnotes = (hast: Root) => {
  visit(hast, "element", (node, index, parent) => {
    if (parent === null || index === null) return;
    // remove the link from the superscript number
    if (
      node.tagName === "a" &&
      (node.properties?.id as string)?.includes("fnref")
    ) {
      parent.children.splice(index, 1, ...node.children);
      return [SKIP, index];
    }

    // remove the little arrow at the bottom
    if (
      node.tagName === "a" &&
      (node.properties?.href as string)?.includes("fnref")
    ) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }

    // replace the invisible label with a hr
    if (
      node.tagName === "h2" &&
      (node.properties?.id as string)?.includes("footnote-label")
    ) {
      const hrEl: Element = {
        tagName: "hr",
        type: "element",
        children: [],
        properties: {
          "aria-label": "Footnotes",
          style: "margin-bottom: -0.5rem;",
        },
      };
      parent.children.splice(index, 1, hrEl);
    }
  });
};

const copyImgAltToTitle = (hast: Root) => {
  visit(hast, { type: "element", tagName: "img" }, (node) => {
    if (node.properties?.alt) {
      node.properties.title = node.properties.alt;
    }
  });
};

const markdownRenderStack = () =>
  unified().use(remarkParse).use(remarkBreaks).use(remarkGfm, {
    singleTilde: false,
  })
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(() => copyImgAltToTitle)
    .use(() => cleanUpFootnotes)
    .use(rehypeStringify, {
      allowDangerousHtml: true,
    });

export const handlers: Handler[] = [
  {
    extensions: ["md"],
    async handle(content) {
      const renderer = markdownRenderStack();
      return {
        extension: "html",
        content: new Response(
          renderer.processSync(await content.text()).toString(),
        ),
      };
    },
  },
];
