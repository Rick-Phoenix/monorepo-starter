import glob from "fast-glob";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import nunjucks from "nunjucks";
import { tryThrow } from "./error_handling.js";
import { promptIfFileExists } from "./paths.js";

const nunjucksOpts = {
  trimBlocks: true,
  lstripBlocks: true,
};

interface NunjucksSource {
  src: string;
  path: string;
  noCache?: boolean;
}

interface CustomLoaderOptions {
  noCache?: boolean;
  // Can potentially add extra options here
}

export class StandardFileSystemLoader {
  private searchPaths: string[];
  private noCache: boolean;

  constructor(searchPaths: string | string[], opts?: CustomLoaderOptions) {
    if (!searchPaths) {
      throw new Error("FileSystemLoader: searchPaths must be specified");
    }
    this.searchPaths = Array.isArray(searchPaths) ? searchPaths : [searchPaths];
    this.noCache = (opts && opts.noCache) || false;
  }

  public getSource(templateName: string): NunjucksSource | null {
    if (!templateName) {
      return null;
    }

    let fullPath: string | undefined;

    for (const basePath of this.searchPaths) {
      const resolvedPath = resolve(basePath, templateName);
      if (existsSync(resolvedPath) && statSync(resolvedPath).isFile()) {
        fullPath = resolvedPath;
        break;
      }
    }

    if (fullPath) {
      const templateSource = readFileSync(fullPath, "utf-8");
      return {
        src: templateSource,
        path: fullPath,
        noCache: this.noCache,
      };
    }

    return null;
  }
}

interface RecursiveRenderOptions {
  templatesDir: string;
  nunjucksRoot?: string;
  outputDir: string;
  ctx?: { [key: string]: unknown };
  retainStructure?: boolean;
  overwrite?: boolean;
}

export async function recursiveRender(options: RecursiveRenderOptions) {
  const loader = new StandardFileSystemLoader(
    options.nunjucksRoot || options.templatesDir,
  );
  const nj = new nunjucks.Environment(
    //@ts-expect-error Extra fields like on, emit and so on are not necessary
    loader,
    nunjucksOpts,
  );
  const retainStructure = options.retainStructure ?? true;
  const overwrite = options.overwrite;
  const files = await glob("**/*.j2", {
    onlyFiles: true,
    cwd: options.nunjucksRoot
      ? join(options.nunjucksRoot, options.templatesDir)
      : options.templatesDir,
  });

  const dirsToCreate = new Set<string>();
  const { outputDir, nunjucksRoot, templatesDir } = options;

  for (const file of files) {
    const outputFilename = !retainStructure
      ? basename(file).replace(/\.j2$/, "")
      : file.replace(/\.j2$/, "");
    const targetDir = !retainStructure
      ? outputDir
      : join(outputDir, dirname(file));

    if (!dirsToCreate.has(targetDir)) {
      dirsToCreate.add(targetDir);
      await mkdir(targetDir, { recursive: true });
    }

    const templateLocation = nunjucksRoot ? join(templatesDir, file) : file;

    const renderedText = nj.render(templateLocation, options.ctx);

    const outputPath = join(outputDir, outputFilename);
    if (!overwrite) await promptIfFileExists(outputPath);
    await tryThrow(
      writeFile(outputPath, renderedText),
      `writing the rendered template at ${outputFilename}`,
    );
  }
}

interface WriteRenderOptions {
  outputDir: string;
  templateFile: string;
  nunjucksRoot?: string;
  ctx?: Record<string, unknown>;
  overwrite?: boolean;
  outputFilename?: string;
}

export async function writeRender(opts: WriteRenderOptions) {
  const loader = new StandardFileSystemLoader(
    opts.nunjucksRoot || opts.templateFile,
  );
  const nj = new nunjucks.Environment(
    //@ts-expect-error Extra fields like on, emit and so on are not necessary
    loader,
    nunjucksOpts,
  );

  const { nunjucksRoot, templateFile, outputDir, ctx, overwrite } = opts;
  const filePath = nunjucksRoot
    ? join(nunjucksRoot, templateFile)
    : templateFile;

  const outputFilename = opts.outputFilename ||
    basename(filePath).replace(/\.j2$/, "");

  const renderedText = nj.render(filePath, ctx);

  const outputPath = join(outputDir, outputFilename);

  if (!overwrite) await promptIfFileExists(outputPath);

  await tryThrow(
    writeFile(outputPath, renderedText),
    `writing the rendered template at ${outputFilename}`,
  );
}
