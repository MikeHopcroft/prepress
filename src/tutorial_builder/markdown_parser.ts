import {PeekableSequence} from './peekable_sequence';

// https://stackoverflow.com/questions/4823468/comments-in-markdown

export enum CodeBlockType {
  FILE,
  REPL,
  SPAWN,
  VERBATIM,
  WARNING,
}

export interface CodeBlock {
  type: CodeBlockType;
  lines: string[];
}

export interface FileBlock extends CodeBlock {
  type: CodeBlockType.FILE;
  file: string;
  numbered: boolean;
}

export interface ReplBlock extends CodeBlock {
  type: CodeBlockType.REPL;
}

export interface SpawnBlock extends CodeBlock {
  type: CodeBlockType.SPAWN;
  executable: string;
  args: string[];
}

export interface VerbatimBlock extends CodeBlock {
  type: CodeBlockType.VERBATIM;
}

export interface WarningBlock extends CodeBlock {
  type: CodeBlockType.WARNING;
}

export type AnyBlock =
  | FileBlock
  | ReplBlock
  | SpawnBlock
  | VerbatimBlock
  | WarningBlock;

export function createBlock(info: string, lines: string[]): AnyBlock {
  const terms = info.trim().split(/\s+/);
  switch (terms[0]) {
    case 'file': {
      const file = terms[1];
      const numbered = terms.length === 3 && terms[2] === 'numbered';
      const block: FileBlock = {
        type: CodeBlockType.FILE,
        file,
        lines,
        numbered,
      };
      return block;
    }
    case 'repl': {
      const block: ReplBlock = {
        type: CodeBlockType.REPL,
        lines,
      };
      return block;
    }
    case 'spawn': {
      if (terms.length < 2) {
        const message = 'spawn: expected an executable name';
        throw new TypeError(message);
      }
      const executable = terms[1];
      const args = terms.slice(2);
      const block: SpawnBlock = {
        type: CodeBlockType.SPAWN,
        executable,
        args,
        lines,
      };
      return block;
    }
    case 'verbatim': {
      const block: VerbatimBlock = {
        type: CodeBlockType.VERBATIM,
        lines,
      };
      return block;
    }
    case 'warning': {
      const block: WarningBlock = {
        type: CodeBlockType.WARNING,
        lines,
      };
      return block;
    }
    default: {
      const message = `Unknown code block annotation "${terms[0]}"`;
      throw new TypeError(message);
    }
  }
}

///////////////////////////////////////////////////////////////////////////////
//
// parseMarkdown()
//
// Parses markdown file into interleaved sequence of text blocks and code
// blocks (delimited by ~~~).
//
///////////////////////////////////////////////////////////////////////////////
export function parseMarkdown(text: string): AnyBlock[] {
  const input = new PeekableSequence(text.split(/\r?\n/).values());
  const blocks: AnyBlock[] = [];

  parseRoot();

  return blocks;

  function parseRoot() {
    let current = createBlock('verbatim', []);
    blocks.push(current);

    while (!input!.atEOS()) {
      const block = tryParseBlock();
      if (block) {
        blocks.push(block);
        current = createBlock('verbatim', []);
        blocks.push(current);
      } else {
        current.lines.push(input.get());
      }
    }
  }

  function tryParseBlock(): AnyBlock | null {
    const line = input.peek();
    const blockInfo = line.match(/\[\/\/\]:\s#\s\((.*)\)/);
    if (blockInfo) {
      input.get();
      if (input.peek() === '~~~') {
        return parseCode(line);
      } else {
        const message = `Expected code block after "${line}"`;
        throw new TypeError(message);
      }
    } else if (line === '~~~') {
      return parseCode();
    }

    return null;
  }

  function parseCode(header?: string): AnyBlock {
    const lines: string[] = [];

    if (header) {
      lines.push(header);
    }

    input.skip('~~~');
    lines.push('~~~');
    while (input.peek() !== '~~~') {
      lines.push(input.get());
    }
    lines.push('~~~');

    if (!input.skip('~~~')) {
      const message = 'Expected closing ~~~.';
      throw new TypeError(message);
    }

    if (header) {
      const blockInfo = header.match(/\[\/\/\]:\s#\s\((.*)\)/);
      if (!blockInfo) {
        const message = `Illegal block header "${header}"`;
        throw new TypeError(message);
      } else {
        return createBlock(blockInfo[1], lines);
      }
    } else {
      return createBlock('verbatim', lines);
    }
  }
}

///////////////////////////////////////////////////////////////////////////////
//
// parseMarkdown2()
//
// Parses markdown file into interleaved sequence of text blocks and code
// blocks (delimited by ~~~).
//
///////////////////////////////////////////////////////////////////////////////
export enum SectionType {
  TEXT,
  CODE,
}

export interface Section {
  type: SectionType;
  body: string[];
}

export interface TextSection extends Section {
  type: SectionType.TEXT;
}

export interface CodeBlockSection extends Section {
  type: SectionType.CODE;
  command: string;
  parameters: string;
  open: string;
  close: string;
}

export type AnySection = TextSection | CodeBlockSection;

export function parseMarkdown2(text: string): AnySection[] {
  const input = new PeekableSequence(text.split(/\r?\n/).values());
  const blocks: AnySection[] = [];

  parseRoot();
  return blocks;

  function parseRoot() {
    let current: TextSection = {type: SectionType.TEXT, body: []};
    blocks.push(current);

    while (!input!.atEOS()) {
      const block = tryParseHeaderAndBlock();
      if (block) {
        blocks.push(block);
        current = {type: SectionType.TEXT, body: []};
        blocks.push(current);
      } else {
        current.body.push(input.get());
      }
    }
  }

  function tryParseHeaderAndBlock(): CodeBlockSection | undefined {
    let command: string | undefined = undefined;
    let parameters: string | undefined = undefined;

    const line = input.peek();
    const match = line.match(/\[\/\/\]: # \(([^\s]+)\s+(.*)\).*$/);
    if (match) {
      command = match[1];
      parameters = match[2];
      input.get();
      const block = tryParseBlock(command, parameters);
      if (!block) {
        const message = `Expected code block after "${line}"`;
        throw new TypeError(message);
      }
      return block;
    } else {
      return tryParseBlock();
    }
  }

  function tryParseBlock(
    command = 'verbatim',
    parameters = ''
  ): CodeBlockSection | undefined {
    const open = input.peek();
    const matchOpen = open.match(/(~~~~*)(.*)/);
    if (!matchOpen) {
      return undefined;
    }

    input.get();

    const body: string[] = [];
    while (!input.atEOS()) {
      const line = input.peek();
      const matchClose = line.match(/(~~~~*)/);
      if (matchClose && matchClose[1] === matchOpen[1]) {
        const close = matchClose[1];
        input.get();
        return {type: SectionType.CODE, command, parameters, open, body, close};
      } else {
        body.push(input.get());
      }
    }

    const message = `Expected closing ${matchOpen[1]}.`;
    throw new TypeError(message);
  }
}
