#!/usr/bin/env -S deno run --allow-env --allow-net --allow-import --allow-read=src --allow-read=plugins --allow-write=dist

import { extname, join, relative, toFileUrl } from "jsr:@std/path@1/posix";
import { walk } from "jsr:@std/fs@1/walk";

type MaybePromise<T> = T | Promise<T>;
export type Handler = {
  extensions: string[];
  handle(
    content: Response,
    path: string,
  ): MaybePromise<Response | { extension: string; content: Response }>;
};

async function loadHandlers() {
  const pluginDir = join(Deno.cwd(), "plugins");
  const handlersByExtension = new Map<
    string,
    Array<Handler>
  >();
  for (
    const [name, plugin] of await Promise.all(
      Deno.readDirSync(pluginDir)
        .filter((entry) => entry.isFile)
        .toArray()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (
          entry,
        ) => [
          entry.name,
          await import(toFileUrl(join(pluginDir, entry.name)).href),
        ]),
    )
  ) {
    if (!("handlers" in plugin && Array.isArray(plugin.handlers))) {
      console.error("expected plugin %o to export an array of handlers", name);
    } else {
      for (const handler of plugin.handlers as Array<Handler>) {
        for (const extension of handler.extensions) {
          let array = handlersByExtension.get(extension);
          if (!array) {
            array = [];
            handlersByExtension.set(extension, array);
          }
          array.push(handler);
        }
      }
    }
  }
  return handlersByExtension;
}

async function process(path: string, handlers: Map<string, Array<Handler>>) {
  const ogExtension = extname(path);
  let extension = ogExtension.slice(1);
  let content = new Response(
    (await Deno.open(join("src", path), {
      read: true,
    })).readable,
  );
  handle: while (true) {
    for (const handler of (handlers.get(extension)! ?? [])) {
      const result = await handler.handle(content, path);
      if (result instanceof Response) {
        content = result;
      } else {
        content = result.content;
        if (result.extension) {
          extension = result.extension;
          continue handle;
        }
      }
    }
    break;
  }
  const newPath = `${path.slice(0, path.length - ogExtension.length)}${
    extension ? "." + extension : ""
  }`;
  return { content, path: newPath, extension };
}

async function build() {
  const handlers = await loadHandlers();
  await Deno.remove("dist", { recursive: true }).catch(() => {});
  await Deno.mkdir("dist");
  for await (const entry of walk("src")) {
    const path = relative("src/", entry.path);
    if (entry.isDirectory) {
      await Deno.mkdir(join("dist", path), { recursive: true });
    } else if (entry.isFile) {
      const { content, path: finalPath } = await process(path, handlers);
      content.body!.pipeTo(
        (await Deno.open(
          join(
            "dist",
            finalPath,
          ),
          { write: true, createNew: true },
        )).writable,
      );
    }
  }
}

await build();
console.log("build succeeded!");
