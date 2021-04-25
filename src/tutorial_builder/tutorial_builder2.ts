import {fileProcessor} from './file_processor';
import {scriptProcessor} from './script_processor';
import {spawnProcessor} from './spawn_processor';
import {verbatimProcessor} from './verbatim_processor';

import {
  AnySection,
  CodeBlockSection,
  parseMarkdown2,
  SectionType,
  TextSection,
} from './markdown_parser';
import {interactiveProcessor} from './interactive_processor';

///////////////////////////////////////////////////////////////////////////////
//
// updateMarkdown
//
///////////////////////////////////////////////////////////////////////////////
export interface Entry {
  index: number;
  block: CodeBlockSection;
}

export type Processor = (blocks: AnySection[], group: Entry[]) => void;

const processors = new Map<string, Processor>([
  ['file', fileProcessor],
  ['interactive', interactiveProcessor],
  ['script', scriptProcessor],
  ['spawn', spawnProcessor],
  ['verbatim', verbatimProcessor],
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

export function makeBlock(
  block: CodeBlockSection,
  lines: string[]
): TextSection {
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
