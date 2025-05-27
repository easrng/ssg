# setup

make a folder for your site with a `src` subfolder containing your site files and a `plugins` subfolder (empty for now)

```
my-site/
| src/
| | index.html
| | etc...
| plugins/
```

open a terminal inside the `my-site` folder

```sh
# download the build script
wget https://raw.githubusercontent.com/easrng/ssg/refs/heads/main/build.ts -O build.ts
# make it executable
chmod +x build.ts
```

# how it works

to build your site, run `./build.ts` in the `my-site` folder. by default the build script just copies every file from `./src` to `./dist`, but plugins in your `./plugins` folder can rewrite files in ~any way.

# plugins

plugins apply transformations to files with specific file extensions and are applied sequentially ordered according to their file names. (so `00_markdown.ts` would run before `01_rewrite_links.ts`, for example.)

for an example plugin, look at [markdown.ts](https://github.com/easrng/ssg/blob/main/plugins/markdown.ts).