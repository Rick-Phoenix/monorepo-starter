import {
  getFileInfo,
  throwErr,
  tryThrow,
  tryThrowSync,
} from "@monorepo-starter/utils";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nunjucks from "nunjucks";

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

export async function writeRender(
  templatePath: string,
  targetPath: string,
  ctx: { [key: string]: unknown } = {},
) {
  const rawTemplate = await readFile(templatePath, "utf8");

  const renderedText = nunjucks.renderString(rawTemplate, ctx);

  if (!renderedText.length) {
    console.warn("⚠️ The output of the render was empty ⚠️");
  }

  await tryThrow(
    writeFile(targetPath, renderedText, "utf8"),
    `writing the render at ${templatePath} to ${targetPath}`,
  );
}

type WriteRendersInDirOptions = {
  templatesDir: string;
  targetDir: string;
  ctx?: { [key: string]: unknown };
};

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
      await writeRender(templateFile, targetPath, options.ctx);
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
