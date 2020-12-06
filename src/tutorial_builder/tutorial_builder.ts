import {spawnSync} from 'child_process';
import * as fs from 'fs';
import stripAnsi = require('strip-ansi');

import {
  AnyBlock,
  CodeBlockType,
  createBlock,
  parseMarkdown,
  ReplBlock,
} from './markdown_parser';

import {scriptHandshake} from './script_handshake';

export async function updateMarkdown(text: string) {
  let blocks = parseMarkdown(text);

  blocks = processFile(blocks);
  blocks = await processRepl(blocks);
  blocks = await processSpawn(blocks);
  blocks = processWarnings(blocks);

  return combine(blocks);
}

function processFile(blocks: AnyBlock[]): AnyBlock[] {
  return blocks.map(block => {
    if (block.type === CodeBlockType.FILE) {
      // console.log(`spawnSync(${block.executable},${block.args})`);
      let lines = fs.readFileSync(block.file, 'utf-8').split(/\r?\n/);

      // TODO: parameter to enable line numbering.
      const fieldWidth = lines.length.toString().length;
      if (block.numbered) {
        lines = lines.map((l, i) => {
          return rightJustify((i + 1).toString(), fieldWidth) + ': ' + l;
        });
      }

      return createBlock('verbatim', [block.lines[0], '~~~', ...lines, '~~~']);
    } else {
      return block;
    }
  });
}

async function processRepl(blocks: AnyBlock[]): Promise<AnyBlock[]> {
  // Make a script by extracting shell input from code blocks.
  const replBlocks = blocks.filter(
    block => block.type === CodeBlockType.REPL
  ) as ReplBlock[];

  if (replBlocks.length === 0) {
    return blocks;
  }

  const scriptLines = makeScript(replBlocks);

  // Run the script to gather new output.
  const outputLines = await runScript(scriptLines);

  // Break the output into sections corresponding to code blocks.
  const outputSections = makeOutputSections(outputLines);

  let i = 0;
  return blocks.map(block => {
    if (block.type === CodeBlockType.REPL) {
      if (
        i === 0 &&
        replBlocks[i].lines.length >= 3 &&
        replBlocks[i].lines[2].startsWith('$')
      ) {
        // First block starts with command to invoke repl.
        return createBlock('verbatim', [
          '~~~',
          replBlocks[i].lines[2],
          ...outputSections[i++],
          '~~~',
        ]);
      } else {
        return createBlock('verbatim', ['~~~', ...outputSections[i++], '~~~']);
      }
    } else {
      return block;
    }
  });
}

async function processSpawn(blocks: AnyBlock[]): Promise<AnyBlock[]> {
  return blocks.map(block => {
    if (block.type === CodeBlockType.SPAWN) {
      // console.log(`spawnSync(${block.executable},${block.args})`);
      const program = spawnSync(block.executable, block.args, {shell: true});
      const ostream = program.stdout;

      return createBlock('verbatim', [
        block.lines[0],
        '~~~',
        `$ ${block.executable} ${block.args.join(' ')}`,
        ostream.toString(),
        '~~~',
      ]);
    } else {
      return block;
    }
  });
}

function processWarnings(blocks: AnyBlock[]): AnyBlock[] {
  return blocks.map(block => {
    if (block.type === CodeBlockType.WARNING) {
      console.log('WARNING: the following block may need manual fixup:');
      for (const line of block.lines) {
        console.log('  ' + line);
      }
      return createBlock('verbatim', block.lines);
    } else {
      return block;
    }
  });
}

function combine(blocks: AnyBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type !== CodeBlockType.VERBATIM) {
      const message = `Expected VERBATIM block but found ${block.type}`;
      throw new TypeError(message);
    }
    lines.push(...block.lines);
  }
  return lines.join('\n');
}

function makeScript(replBlocks: ReplBlock[]) {
  const re = /%\s(.*)/;
  const codeLines: string[] = [];

  for (const block of replBlocks) {
    for (const line of block.lines) {
      const m = line.match(re);
      if (m) {
        codeLines.push(m[1]);
      }
    }

    // TODO: use a less brittle marker than '#SECTION'. This string
    // could be returned by the repl.
    // End block with a '#SECTION' comment to allow us to partition the
    // Shell output.
    codeLines.push('#SECTION');
  }
  return codeLines;
}

async function runScript(scriptLines: string[]): Promise<string[]> {
  // TODO: pull executable name and args from markdown file
  const outputText = await scriptHandshake(
    'node.exe',
    // TODO: parameterize executable from block comment.
    ['build/samples/repl.js', '-x', '-d=..\\shortorder\\samples\\menu'],
    '% ',
    scriptLines
  );

  const outputLines = outputText.map(stripAnsi);

  return outputLines;
}

function makeOutputSections(lines: string[]) {
  const outputSections: string[][] = [];
  let currentSection: string[] = [];
  for (const line of lines) {
    if (line.includes('#SECTION')) {
      outputSections.push(currentSection);
      currentSection = [];
    } else {
      currentSection.push(line);
    }
  }

  for (const section of outputSections) {
    trimLeadingBlankLines(section);
    trimTrailingBlankLines(section);
  }

  // NOTE: it's ok that we're dropping the last section because it is just
  // the output from the REPL shutting down at the end of input.

  return outputSections;
}

function trimLeadingBlankLines(lines: string[]) {
  // Remove trailing blank lines.
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
}

function trimTrailingBlankLines(lines: string[]) {
  // Remove trailing blank lines.
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
}

// function leftJustify(text: string, width: number) {
//   if (text.length >= width) {
//     return text;
//   } else {
//     const paddingWidth = width - text.length;
//     const padding = new Array(paddingWidth + 1).join(' ');
//     return text + padding;
//   }
// }

function rightJustify(text: string, width: number) {
  if (text.length >= width) {
    return text;
  } else {
    const paddingWidth = width - text.length;
    const padding = new Array(paddingWidth + 1).join(' ');
    return padding + text;
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// //
// // updateMarkdown2
// //
// ///////////////////////////////////////////////////////////////////////////////
// interface Entry {
//   index: number;
//   block: CodeBlockSection;
// };

// type Processor = (blocks: AnySection[], group: Entry[]) => void;

// const processors = new Map<string, Processor>([
//   ['file', fileProcessor2],
//   ['spawn', spawnProcessor2],
// ]);

// export async function updateMarkdown3(text: string): Promise<string> {
//   return await updateMarkdown2(processors, text);
// }

// async function updateMarkdown2(
//   processors: Map<string, Processor>,
//   text: string
// ): Promise<string> {
//   let blocks = parseMarkdown2(text);

//   const groups = new Map<string, Entry[]>();
//   for (const [index, block] of blocks.entries()) {
//     if (block.type === SectionType.CODE) {
//       const entry = groups.get(block.command!);
//       if (entry) {
//         entry.push({index, block});
//       } else {
//         groups.set(block.command!, [{index, block}]);
//       }
//     }
//   }

//   for (const [command, group] of groups.entries()) {
//     const processor = processors.get(command);
//     if (processor === undefined) {
//       const message = `Unknown block type "${command}"`;
//       throw new TypeError(message);
//     }
//     await processor(blocks, group);
//   }

//   return combine2(blocks);
// }

// function combine2(blocks: AnySection[]): string {
//   const lines: string[] = [];
//   for (const block of blocks) {
//     lines.push(...block.body);
//   }
//   return lines.join('\n');
// }

// function makeBlock(block: CodeBlockSection, lines: string[]): TextSection {
//   // TODO: choose alternate open/close based on contents
//   // of body (e.g. if body has ~~~, use ~~~~).

//   const body: string[] = [
//     `[//]: # (${block.command} ${block.parameters})`,
//     block.open,
//     ...lines,
//     block.close
//   ];
//   // const body = `[//]: # (${
//   //   block.command
//   // } ${
//   //   block.parameters
//   // })\n${
//   //   block.open
//   // }\n${

//   // }\n${
//   //   block.close
//   // }`;

//   return { type: SectionType.TEXT, body };
// }

// function fileProcessor2(blocks: AnySection[], group: Entry[]) {
//   for (const entry of group) {
//     const block = entry.block;
//     const terms = block.parameters!.split(/\s+/);
//     const file = terms[0];
//     const numbered = terms.length === 2 && terms[1] === 'numbered';

//     let body = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

//     if (numbered) {
//       const fieldWidth = body.length.toString().length;
//       body = body.map((l, i) => {
//         return rightJustify((i + 1).toString(), fieldWidth) + ': ' + l;
//       });
//     }

//     blocks[entry.index] = makeBlock(block, body);
//   }
// }

// function spawnProcessor2(blocks: AnySection[], group: Entry[]) {
//   for (const entry of group) {
//     const block = entry.block;
//     // TODO: better param splitting.
//     const params = block.parameters!.split(/\s+/);
//     if (params.length < 1) {
//       const message = `${block.command!}: expected an executable name`;
//       throw new TypeError(message);
//     }
//     const executable = params[0];
//     const args = params.slice(1);

//     const program = spawnSync(executable, args, {shell: true});
//     const body = [
//       // TODO: escape args
//       `$ ${executable} ${args.join(' ')}`,
//       program.stdout.toString(),
//     ];

//     blocks[entry.index] = makeBlock(block, body);
//   }
// }
