// eslint-disable no-console
import { tryThrowSync } from "@monorepo-starter/utils";
import { type } from "arktype";
import { writeFileSync } from "node:fs";
import { render } from "nunjucks";

export function writeRender(
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
    console.warn("⚠️ The output of the render was empty");
  }

  tryThrowSync(
    () => writeFileSync(targetPath, renderedText),
    `writing the render at ${renderPath} to ${targetPath}`,
  );
}
