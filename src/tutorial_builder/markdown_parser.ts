import {PeekableSequence} from './peekable_sequence';

// https://stackoverflow.com/questions/4823468/comments-in-markdown

///////////////////////////////////////////////////////////////////////////////
//
// parseMarkdown()
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

export interface Command {
  name: string;
  parameters: string;
}

export interface CodeBlockSection extends Section {
  type: SectionType.CODE;
  command: Command;
  options: Command[];
  open: string;
  close: string;
}

export type AnySection = TextSection | CodeBlockSection;

export function parseMarkdown(text: string): AnySection[] {
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
      return tryParseBlock('verbatim', '');
    }
  }

  function tryParseBlock(
    command: string,
    parameters: string
  ): CodeBlockSection | undefined {
    const options: Command[] = [];
    let option: Command | undefined;
    while ((option = tryParseOption())) {
      options.push(option);
    }
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
        return {
          type: SectionType.CODE,
          command: {name: command, parameters},
          options,
          open,
          body,
          close,
        };
      } else {
        body.push(input.get());
      }
    }

    const message = `Expected closing ${matchOpen[1]}.`;
    throw new TypeError(message);
  }

  function tryParseOption(): Command | undefined {
    if (!input.atEOS()) {
      const line = input.peek();
      const match = line.match(/\[\/\/\]: # \(([^\s]+)\s+(.*)\).*$/);
      if (match) {
        const name = match[1];
        const parameters = match[2];
        input.get();
        return {name, parameters};
      }
    }

    return undefined;
  }
}
