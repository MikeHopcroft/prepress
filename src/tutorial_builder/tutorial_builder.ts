import stripAnsi from 'strip-ansi';

import {fileProcessor} from './file_processor';
import {IFS} from './ifs';
import {interactiveProcessor} from './interactive_processor';
import {interactiveProcessor2} from './interactive_processor2';
import {interactiveProcessor3} from './interactive_processor3';

import {
  AnySection,
  CodeBlockSection,
  parseMarkdown,
  SectionType,
  TextSection,
} from './markdown_parser';

import {scriptProcessor} from './script_processor';
import {spawnProcessor} from './spawn_processor';
import {verbatimProcessor} from './verbatim_processor';

///////////////////////////////////////////////////////////////////////////////
//
// updateMarkdown
//
///////////////////////////////////////////////////////////////////////////////
export interface Entry {
  index: number;
  block: CodeBlockSection;
}

export type Processor = (fs: IFS, blocks: AnySection[], group: Entry[]) => void;

const processors = new Map<string, Processor>([
  ['file', fileProcessor],
  ['interactive', interactiveProcessor3],
  ['script', scriptProcessor],
  ['spawn', spawnProcessor],
  ['verbatim', verbatimProcessor],
]);

export async function updateMarkdown(fs: IFS, text: string): Promise<string> {
  return await updateMarkdownInternal(fs, processors, text);
}

async function updateMarkdownInternal(
  fs: IFS,
  processors: Map<string, Processor>,
  text: string
): Promise<string> {
  const blocks = parseMarkdown(text);

  const groups = new Map<string, Entry[]>();
  for (const [index, block] of blocks.entries()) {
    if (block.type === SectionType.CODE) {
      const entry = groups.get(block.command.name);
      if (entry) {
        entry.push({index, block});
      } else {
        groups.set(block.command.name, [{index, block}]);
      }
    }
  }

  for (const [command, group] of groups.entries()) {
    const processor = processors.get(command);
    if (processor === undefined) {
      const message = `Unknown block type "${command}"`;
      throw new TypeError(message);
    }
    await processor(fs, blocks, group);
  }

  return combine(blocks);
}

function combine(blocks: AnySection[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    lines.push(...block.body);
  }
  // return lines.join('\n');
  return stripAnsi(lines.join('\n'));
}

export function makeBlock(
  block: CodeBlockSection,
  lines: string[]
): TextSection {
  // TODO: choose alternate open/close based on contents
  // of body (e.g. if body has ~~~, use ~~~~).
  const options = block.options.map(
    option => `[//]: # (${option.name} ${option.parameters})`
  );

  const body: string[] = [
    `[//]: # (${block.command.name} ${block.command.parameters})`,
    ...options,
    block.open,
    ...lines,
    block.close,
  ];

  return {type: SectionType.TEXT, body};
}
