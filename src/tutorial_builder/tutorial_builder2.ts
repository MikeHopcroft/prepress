import {spawnSync} from 'child_process';
import * as fs from 'fs';

import {
  AnySection,
  CodeBlockSection,
  parseMarkdown2,
  SectionType,
  TextSection,
} from './markdown_parser';

///////////////////////////////////////////////////////////////////////////////
//
// updateMarkdown2
//
///////////////////////////////////////////////////////////////////////////////
interface Entry {
  index: number;
  block: CodeBlockSection;
}

type Processor = (blocks: AnySection[], group: Entry[]) => void;

const processors = new Map<string, Processor>([
  ['file', fileProcessor2],
  ['spawn', spawnProcessor2],
  ['verbatim', verbatimProcessor2],
]);

export async function updateMarkdown3(text: string): Promise<string> {
  return await updateMarkdown2(processors, text);
}

async function updateMarkdown2(
  processors: Map<string, Processor>,
  text: string
): Promise<string> {
  const blocks = parseMarkdown2(text);

  const groups = new Map<string, Entry[]>();
  for (const [index, block] of blocks.entries()) {
    if (block.type === SectionType.CODE) {
      const entry = groups.get(block.command);
      if (entry) {
        entry.push({index, block});
      } else {
        groups.set(block.command, [{index, block}]);
      }
    }
  }

  for (const [command, group] of groups.entries()) {
    const processor = processors.get(command);
    if (processor === undefined) {
      const message = `Unknown block type "${command}"`;
      throw new TypeError(message);
    }
    await processor(blocks, group);
  }

  return combine2(blocks);
}

function combine2(blocks: AnySection[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    lines.push(...block.body);
  }
  return lines.join('\n');
}

function makeBlock(block: CodeBlockSection, lines: string[]): TextSection {
  // TODO: choose alternate open/close based on contents
  // of body (e.g. if body has ~~~, use ~~~~).

  const body: string[] = [
    `[//]: # (${block.command} ${block.parameters})`,
    block.open,
    ...lines,
    block.close,
  ];

  return {type: SectionType.TEXT, body};
}

///////////////////////////////////////////////////////////////////////////////
//
// Processors
//
///////////////////////////////////////////////////////////////////////////////
function fileProcessor2(blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    const [[file], [numbered]] = parseArgs(
      block.command,
      1,
      true,
      block.parameters
    );

    let body = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

    if (numbered) {
      const fieldWidth = body.length.toString().length;
      body = body.map((l, i) => {
        return rightJustify((i + 1).toString(), fieldWidth) + ': ' + l;
      });
    }

    blocks[entry.index] = makeBlock(block, body);
  }
}

function spawnProcessor2(blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    // TODO: better param splitting.
    const params = block.parameters.split(/\s+/);
    if (params.length < 1) {
      const message = `${block.command}: expected an executable name`;
      throw new TypeError(message);
    }
    const executable = params[0];
    const args = params.slice(1);

    const program = spawnSync(executable, args, {shell: false});
    if (program.error) {
      throw program.error;
    }
    const body = [
      // TODO: escape args
      `$ ${executable} ${args.join(' ')}`,
      program.stdout.toString(),
    ];

    blocks[entry.index] = makeBlock(block, body);
  }
}

function verbatimProcessor2(blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;

    const body: string[] = [block.open, ...block.body, block.close];

    blocks[entry.index] = {type: SectionType.TEXT, body};
  }
}

///////////////////////////////////////////////////////////////////////////////
//
// Utility functions
//
///////////////////////////////////////////////////////////////////////////////
function rightJustify(text: string, width: number) {
  if (text.length >= width) {
    return text;
  } else {
    const paddingWidth = width - text.length;
    const padding = new Array(paddingWidth + 1).join(' ');
    return padding + text;
  }
}

function parseArgs(
  command: string,
  required: number,
  restAllowed: boolean,
  text: string
): [string[], string[]] {
  const args = text.split(/\s+/);
  if (args.length < required) {
    const message = `${command}: parameters missing (expected ${required}).`;
    throw new TypeError(message);
  }
  if (args.length > required && !restAllowed) {
    const message = `${command}: found extra parameters (expected ${required}).`;
    throw new TypeError(message);
  }

  return [args.slice(0, required), args.slice(required)];
}
