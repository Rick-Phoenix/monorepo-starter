import { promptIfFileExists, tryThrow } from "@monorepo-starter/utils";
import FastGlob from "fast-glob";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import nunjucks from "nunjucks";

const nunjucksOpts = {
  trimBlocks: true,
  lstripBlocks: true,
};

interface RecursiveRenderOptions {
  templatesDir: string;
  nunjucksRoot?: string;
  outputDir: string;
  ctx?: { [key: string]: unknown };
  retainStructure?: boolean;
  overwrite?: boolean;
}

export async function recursiveRender(options: RecursiveRenderOptions) {
  const nj = nunjucks.configure(
    options.nunjucksRoot || options.templatesDir,
    nunjucksOpts,
  );
  const retainStructure = options.retainStructure ?? true;
  const overwrite = options.overwrite ?? true;
  const files = await FastGlob("**/*.j2", {
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
}

export async function writeRender(opts: WriteRenderOptions) {
  const nj = nunjucks.configure(
    opts.nunjucksRoot || opts.templateFile,
    nunjucksOpts,
  );

  const overwrite = opts.overwrite ?? true;

  const { nunjucksRoot, templateFile, outputDir, ctx } = opts;
  const filePath = nunjucksRoot
    ? join(nunjucksRoot, templateFile)
    : templateFile;

  const outputFilename = basename(filePath).replace(/\.j2$/, "");

  const renderedText = nj.render(filePath, ctx);

  const outputPath = join(outputDir, outputFilename);

  if (!overwrite) await promptIfFileExists(outputPath);

  await tryThrow(
    writeFile(outputPath, renderedText),
    `writing the rendered template at ${outputFilename}`,
  );
}
