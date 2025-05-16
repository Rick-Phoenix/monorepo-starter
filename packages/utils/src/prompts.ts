import type { TextOptions } from "@clack/prompts";
import * as p from "@clack/prompts";
import pico from "picocolors";

export async function text(options: TextOptions, exitMessage?: string) {
  const prompt = await p.text(options);

  if (p.isCancel(prompt)) {
    printExit(exitMessage);
    process.exit(0);
  }

  return prompt;
}

export async function confirm(options: p.ConfirmOptions, exitMessage?: string) {
  const prompt = await p.confirm(options);

  if (p.isCancel(prompt)) {
    printExit(exitMessage);
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
    printExit(exitMessage);
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
    printExit(exitMessage);
    process.exit(0);
  }

  return prompt;
}

export async function confirmOrQuit(message: string, initialValue: boolean) {
  const confirmation = await confirm({ message, initialValue });

  if (!confirmation) {
    printExit();
    process.exit(0);
  }
  return true;
}

export function consoleSuccess(message: string, dot?: boolean) {
  const symbol = dot ? pico.green("") : "✅";
  // eslint-disable-next-line no-console
  console.log(`  ${symbol}  ${message}`);
}

export function consoleInfo(message: string, dot?: boolean) {
  const symbol = dot ? pico.blue("") : "ℹ️";
  // eslint-disable-next-line no-console
  console.log(`  ${symbol}  ${message}`);
}

export function consoleWarn(message: string, dot?: boolean) {
  const symbol = dot ? pico.yellow("") : "⚠️";
  // eslint-disable-next-line no-console
  console.log(`  ${symbol}  ${message}`);
}

export function consoleError(message: string, dot?: boolean) {
  const symbol = dot ? pico.red("") : "❌";
  // eslint-disable-next-line no-console
  console.log(`  ${symbol}  ${message}`);
}

export function printWarn(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${pico.bgYellow(pico.black(`  WARN  `))}  ${message}`);
}

export function printInfo(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${pico.bgBlue(pico.black(`  INFO  `))}  ${message}`);
}

export function printDebug(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${pico.bgMagentaBright(pico.black(`  DEBUG  `))}  ${message}`);
}

export function printError(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${pico.bgRed(pico.black(`  DEBUG  `))}  ${message}`);
}

export function printExit(message?: string) {
  printInfo(message || "Operation canceled by the user.");
}
