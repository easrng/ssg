/**
 * Run scripts in your HTML during the build by adding a `build` attribute
 * <script build src="./header.js"></script>
 * Available APIs:
 *  - location
 *  - document.write
 *  - everything Deno provides
 * Note that there is no DOM!
 */

import { Handler } from "../build.ts";
import { ParserStream } from "npm:parse5-parser-stream@7";
import { DefaultTreeAdapterMap, serialize } from "npm:parse5@7";
import {
  getAttribute,
  hasAttribute,
  removeNode,
} from "npm:@parse5/tools@0.6.0";
import { Writable } from "node:stream";
import { toFileUrl } from "jsr:@std/path@1/posix/to-file-url";
import { resolve } from "jsr:@std/path@1/posix";

export const handlers: Handler[] = [
  {
    extensions: ["html"],
    async handle(content, path) {
      const parser = new ParserStream<DefaultTreeAdapterMap>();
      parser.on("script", async (element, documentWrite, resume) => {
        try {
          if (hasAttribute(element, "build")) {
            removeNode(element);
            const src = getAttribute(element, "src");
            // @ts-ignore no dom types
            const prevDocument = globalThis.document;
            const prevLocation = Object.getOwnPropertyDescriptor(
              globalThis,
              "location",
            );
            Object.defineProperty(globalThis, "location", {
              configurable: true,
              enumerable: false,
              value: new URL("http://localhost/" + path),
            });
            // @ts-ignore no dom types
            globalThis.document = {
              write: documentWrite,
            };
            try {
              if (!src) throw new Error("build-time scripts can't be inline");
              const u = new URL(
                src,
                toFileUrl(resolve("src", path)),
              );
              u.searchParams.set("_", Math.random() + "");
              await import(
                u.href
              );
            } catch (e) {
              console.error("script error in %o: ", path, e);
            } finally {
              // @ts-ignore no dom types
              globalThis.document = prevDocument;
              // @ts-ignore yeag
              Object.defineProperty(globalThis, "location", prevLocation);
            }
          }
        } finally {
          resume();
        }
      });
      await content.body!.pipeThrough(new TextDecoderStream("utf-8")).pipeTo(
        Writable.toWeb(parser),
      );
      return new Response(serialize(parser.document));
    },
  },
];
