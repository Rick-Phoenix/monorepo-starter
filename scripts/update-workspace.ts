// eslint-disable no-console
import { parse as JSONCParse } from "jsonc-parser";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface WorkspaceFolder {
  path: string;
  name: string;
}

interface CodeWorkspace {
  folders: WorkspaceFolder[];
  settings?: object;
  extensions?: object;
}

export async function addFolderToWorkspace(
  workspaceFilePath: string,
  newFolderRelativePath: string
): Promise<void> {
  console.log(`Attempting to add folder '${newFolderRelativePath}' to workspace...`);
  let rawContent: string;

  try {
    rawContent = await readFile(workspaceFilePath, "utf-8");
  } catch (error: any) {
    console.error(`Error reading workspace file '${workspaceFilePath}':`, error);
    throw error;
  }

  const workspaceData = JSONCParse(rawContent) as CodeWorkspace;
  if (!workspaceData || typeof workspaceData !== "object") {
    throw new Error("Workspace file content is not a valid object.");
  }
  if (
    !Array.isArray(workspaceData.folders) ||
    !workspaceData.folders.some((folder) => folder.path === ".")
  ) {
    throw new TypeError("Workspace file has a missing or invalid 'folders' array");
  }

  const packageName = newFolderRelativePath.split("/").at(-1);
  if (!packageName) throw new Error("Invalid project name.");

  workspaceData.folders = workspaceData.folders.filter((project) =>
    existsSync(path.resolve(import.meta.dirname, `../${project.path}`))
  );

  workspaceData.folders.push({ path: newFolderRelativePath, name: packageName });

  const updatedJsonString = JSON.stringify(workspaceData, null, 2);

  try {
    await writeFile(workspaceFilePath, updatedJsonString + "\n", "utf-8");
    console.log(`✓ Successfully updated workspace file .`);
  } catch (writeError) {
    console.error(`Error writing updated workspace file:`, writeError);
    throw writeError;
  }

  const tsconfigPath = path.resolve(import.meta.dirname, "../tsconfig.json");
  const tsconfigRaw = await readFile(tsconfigPath, "utf-8");
  const tsconfig = JSON.parse(tsconfigRaw) as { references: { path: string }[] };
  tsconfig.references = tsconfig.references.filter((folder) =>
    existsSync(path.resolve(import.meta.dirname, "..", folder.path))
  );
  tsconfig.references.push({ path: newFolderRelativePath });
  await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
}
