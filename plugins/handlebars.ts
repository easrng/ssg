/**
 * to declare partials make a new folder named templates/ next to plugins/ and src/
 * all *.hbs files will be registered as partials, so if you have a file named
 * templates/layout.hbs you can use it like {{#> layout}} ... {{/layout}}
 *
 * the path of the file relative to src (without a leading slash) is provided (see this playground url)
 * https://handlebarsjs.com/playground.html#format=1&currentExample=%7B%22template%22%3A%22this%20file%20is%20named%20%5C%22%7B%7Bpath%7D%7D%5C%22%5Cn%22%2C%22partials%22%3A%5B%5D%2C%22input%22%3A%22%7B%5Cn%20%20%5C%22path%5C%22%3A%20%5C%22folder%2Findex.html%5C%22%5Cn%7D%22%2C%22output%22%3A%22this%20file%20is%20named%20%5C%22folder%2Findex.html%5C%22%5Cn%22%2C%22preparationScript%22%3A%22%22%2C%22handlebarsVersion%22%3A%224.7.8%22%7D
 */
import { fromFileUrl } from "jsr:@std/path@1/posix/from-file-url";
import { Handler } from "../build.ts";
import Handlebars from "npm:handlebars@4";
import { join } from "jsr:@std/path@1/posix/join";

Handlebars.registerHelper({
  eval(code) {
    return new Function("with (this) return (" + code + ")").call(this);
  },
});

const templatesDir = fromFileUrl(import.meta.resolve("../templates"));
for await (
  const file of Deno.readDir(templatesDir)
) {
  if (!(file.isFile && file.name.endsWith(".hbs"))) continue;
  Handlebars.registerPartial(
    file.name.replace(/\.hbs$/, ""),
    await Deno.readTextFile(join(templatesDir, file.name)),
  );
}

export const handlers: Handler[] = [
  {
    extensions: ["html"],
    async handle(content, path) {
      const render = Handlebars.compile(await content.text());
      return new Response(
        render({
          path,
        }),
      );
    },
  },
];
