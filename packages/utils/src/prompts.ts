import type { TextOptions } from "@clack/prompts";
import * as p from "@clack/prompts";

export async function text(options: TextOptions, exitMessage?: string) {
  const prompt = await p.text(options);

  if (p.isCancel(prompt)) {
    p.cancel(exitMessage || "Operation canceled.");
    process.exit(0);
  }

  return prompt;
}

export async function confirm(options: p.ConfirmOptions, exitMessage?: string) {
  const prompt = await p.confirm(options);

  if (p.isCancel(prompt)) {
    p.cancel(exitMessage || "Operation canceled.");
    process.exit(0);
  }

  return prompt;
}

export async function select<T>(
  options: p.SelectOptions<T>,
  exitMessage?: string,
) {
  const prompt = await p.select(options);

  if (p.isCancel(prompt)) {
    p.cancel(exitMessage || "Operation canceled.");
    process.exit(0);
  }

  return prompt;
}

export async function multiselect<T>(
  options: p.MultiSelectOptions<T>,
  exitMessage?: string,
) {
  const prompt = await p.multiselect(options);

  if (p.isCancel(prompt)) {
    p.cancel(exitMessage || "Operation canceled.");
    process.exit(0);
  }

  return prompt;
}

export async function confirmOrQuit(message: string, initialValue: boolean) {
  const confirmation = await confirm({ message, initialValue });

  if (!confirmation) {
    p.cancel("Operation canceled.");
    process.exit(0);
  }
  return true;
}
