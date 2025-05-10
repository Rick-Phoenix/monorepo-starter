import {
  getFileInfo,
  throwErr,
  tryThrow,
  tryThrowSync,
} from "@monorepo-starter/utils";
import FastGlob from "fast-glob";
import console from "node:console";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import nunjucks from "nunjucks";

const nunjucksOpts = {
  trimBlocks: true,
  lstripBlocks: true,
};

export function writeRenderSync(
  templatePath: string,
  targetPath: string,
  ctx: { [key: string]: unknown } = {},
) {
  const rawTemplate = readFileSync(templatePath, "utf8");

  const renderedText = nunjucks.renderString(rawTemplate, ctx);

  if (!renderedText.length) {
    console.warn("⚠️ The output of the render was empty ⚠️");
  }

  tryThrowSync(
    () => writeFileSync(targetPath, renderedText, "utf8"),
    `writing the render at ${templatePath} to ${targetPath}`,
  );
}

export async function writeRenderString(
  templatePath: string,
  targetPath: string,
  ctx: { [key: string]: unknown } = {},
) {
  const rawTemplate = await readFile(templatePath, "utf8");

  nunjucks.configure({
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });

  const renderedText = nunjucks.renderString(rawTemplate, ctx);

  if (!renderedText.length) {
    console.warn("⚠️ The output of the render was empty ⚠️");
  }

  await tryThrow(
    writeFile(targetPath, renderedText, "utf8"),
    `writing the render at ${templatePath} to ${targetPath}`,
  );
}

interface WriteRendersInDirOptions {
  templatesDir: string;
  targetDir: string;
  ctx?: { [key: string]: unknown };
}

export async function writeAllTemplates(options: WriteRendersInDirOptions) {
  const dirContent = await readdir(options.templatesDir);
  await mkdir(options.targetDir, { recursive: true });
  for (const contentRelPath of dirContent) {
    const absolutePath = join(options.templatesDir, contentRelPath);
    const { isFile, isDirectory } = await getFileInfo(absolutePath);
    if (isFile) {
      const templateFile = absolutePath;
      const outputFilename = contentRelPath.replace(/.j2$/, "");
      const targetPath = join(options.targetDir, outputFilename);
      await writeRenderString(templateFile, targetPath, options.ctx);
    } else if (isDirectory) {
      const dir = absolutePath;
      await writeAllTemplates({
        ctx: options.ctx,
        templatesDir: dir,
        targetDir: join(options.targetDir, contentRelPath),
      });
    } else {
      throwErr(`${contentRelPath} is not a valid file or directory.`);
    }
  }
}

interface RecursiveRenderOptions {
  templatesDir: string;
  templatesRoot?: string;
  outputDir: string;
  ctx?: { [key: string]: unknown };
  retainStructure?: boolean;
}

export async function recursiveRender(options: RecursiveRenderOptions) {
  const nj = nunjucks.configure(
    options.templatesRoot || options.templatesDir,
    nunjucksOpts,
  );
  const retainStructure = options.retainStructure ?? true;
  const files = await FastGlob("**/*.j2", {
    onlyFiles: true,
    cwd: options.templatesRoot
      ? join(options.templatesRoot, options.templatesDir)
      : options.templatesDir,
  });

  const dirsToCreate = new Set<string>();
  const { outputDir, templatesRoot, templatesDir } = options;

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

    const templateLocation = templatesRoot ? join(templatesDir, file) : file;

    const renderedText = nj.render(templateLocation, options.ctx);

    await tryThrow(
      writeFile(join(outputDir, outputFilename), renderedText),
      `writing the rendered template at ${outputFilename}`,
    );
  }
}

interface WriteRenderOptions {
  outputDir: string;
  templateFile: string;
  nunjucksRoot?: string;
  ctx?: Record<string, unknown>;
}

export async function writeRenderV2(opts: WriteRenderOptions) {
  const nj = nunjucks.configure(
    opts.nunjucksRoot || opts.templateFile,
    nunjucksOpts,
  );

  const { nunjucksRoot, templateFile, outputDir, ctx } = opts;
  const filePath = nunjucksRoot
    ? join(nunjucksRoot, templateFile)
    : templateFile;

  const outputFilename = basename(filePath).replace(/\.j2$/, "");

  const renderedText = nj.render(filePath, ctx);

  await tryThrow(
    writeFile(join(outputDir, outputFilename), renderedText),
    `writing the rendered template at ${outputFilename}`,
  );
}
