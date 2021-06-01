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
