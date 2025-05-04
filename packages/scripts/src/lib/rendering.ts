import { tryThrow, tryThrowSync } from "@monorepo-starter/utils";
import { type } from "arktype";
import { writeFileSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { render } from "nunjucks";

export function writeRenderSync(
  renderPath: string,
  targetPath: string,
  ctx?: { [key: string]: unknown },
) {
  const validPaths = type({
    renderPath: "string > 0",
    targetPath: "string > 0",
  });

  validPaths.assert({ renderPath, targetPath });

  const renderedText = render(renderPath, ctx);

  if (!renderedText.length) {
    console.warn("⚠️ The output of the render was empty ⚠️");
  }

  tryThrowSync(
    () => writeFileSync(targetPath, renderedText),
    `writing the render at ${renderPath} to ${targetPath}`,
  );
}

export async function writeRender(
  renderPath: string,
  targetPath: string,
  ctx?: { [key: string]: unknown },
) {
  const validPaths = type({
    renderPath: "string > 0",
    targetPath: "string > 0",
  });

  validPaths.assert({ renderPath, targetPath });

  const renderedText = render(renderPath, ctx);

  if (!renderedText.length) {
    console.warn("⚠️ The output of the render was empty ⚠️");
  }

  await tryThrow(
    writeFile(targetPath, renderedText, "utf8"),
    `writing the render at ${renderPath} to ${targetPath}`,
  );
}

type WriteRendersInDirOptions = {
  templatesDir: string;
  targetDir: string;
  ctx?: { [key: string]: unknown };
};

export async function writeRendersInDir(options: WriteRendersInDirOptions) {
  const files = await readdir(options.templatesDir);
  await mkdir(options.targetDir, { recursive: true });
  for (const file of files) {
    const outputFilename = file.replace(/.j2$/, "");
    const templatePath = join(options.templatesDir, file);
    const targetPath = join(options.targetDir, outputFilename);
    await writeRender(templatePath, targetPath, options.ctx);
  }
}
