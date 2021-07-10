import {spawn} from 'child_process';

import {IFS} from './ifs';
import {AnySection, CodeBlock, CodeBlockSection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder';
import {parseArgs} from './utilities';

// https://github.com/nodejs/node-v0.x-archive/issues/2792

export async function interactiveProcessor2(
  fs: IFS,
  blocks: AnySection[],
  group: Entry[]
) {
  console.log('interactiveProcessor2()');
  const sessions = groupBySession(group);

  for (const session of sessions.values()) {
    await processSession(blocks, session);
  }
}

function groupBySession(group: Entry[]) {
  const sessions = new Map<string, Entry[]>();
  for (const entry of group) {
    const block = entry.block;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [[sessionId, prompt, executable], args] = parseArgs(
      block.parameters,
      3,
      true,
      block.parameters
    );
    const session = sessions.get(sessionId);
    if (session) {
      session.push(entry);
    } else {
      sessions.set(sessionId, [entry]);
    }
  }
  return sessions;
}

// type CmdGenerator = Generator<string, void, string>;
// type CmdGeneratorFactory = (prologue: string) => CmdGenerator;

interface BlockInfo {
  index: number;
  commands: string[];
  codeBlock: CodeBlockSection;
}

interface Script {
  includePrologue: boolean;
  blocks: BlockInfo[];
}

async function processSession(blocks: AnySection[], group: Entry[]) {
  const block = group[0].block;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [[session, prompt, executable], args] = parseArgs(
    block.command,
    3,
    true,
    block.parameters
  );

  // Process blocks to produce
  //   1. Command script
  //   2. Information for mapping session output to blocks
  //      a) Commands in each block
  //      b) Whether to retain prologue
  //      c) Whether to retain trailing prompt
  const script = generateScript(prompt, group);

  // Run script in session and gather output.
  const output = await runScript(executable, args, script);

  // Process output back into blocks.
  updateBlocks(blocks, prompt, script, output);
}

function generateScript(prompt: string, group: Entry[]): Script {
  const blocks: BlockInfo[] = [];

  // Determine whether to include the prologue in this session.
  // Prologue should be included if source block has any text
  // before the first prompt.
  const includePrologue =
    group.length > 0 &&
    group[0].block.body.length > 0 &&
    !group[0].block.body[0].startsWith(prompt);

  // Get the commands for each block.
  for (const {block, index} of group) {
    const commands: string[] = [];
    for (const line of block.body) {
      if (line.startsWith(prompt)) {
        commands.push(line.slice(prompt.length).trim());
      }
    }
    blocks.push({
      codeBlock: block,
      commands,
      index,
    });
  }
  return {includePrologue, blocks};
}

async function runScript(
  executable: string,
  args: string[],
  script: Script
): Promise<string> {
  let output = '';

  return new Promise<string>((resolve, reject) => {
    try {
      // executable = "node";
      // const args = [
      //   "d:\\git\\menubot\\PrixFixe\\build\\samples\\repl.js",
      //   '-x',
      //   '-d=d:\\git\\menubot\\PrixFixe\\samples\\menu'
      // ];
      const program = spawn(executable, args, {shell: false});
      const iStream = program.stdin;
      const oStream = program.stdout;

      oStream.on('error', (e: Error) => {
        console.log(`Error: ${e.message}`);
      });

      oStream.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        // console.log(`onData: text=${JSON.stringify(text)}`);
        output += text;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      program.on('close', (code: number) => {
        resolve(output);
      });

      for (const block of script.blocks) {
        for (const command of block.commands) {
          iStream.write(command + '\n');
        }
      }
      iStream.end();
    } catch (e) {
      reject(e);
    }
  });
}

function updateBlocks(
  blocks: AnySection[],
  prompt: string,
  script: Script,
  output: string
) {
  // Need to know which commands are in which blocks
  // Need to know whether to include or exclude prologue
  const lines = new Lines(prompt, output);

  let body: string[] = [];
  if (script.includePrologue) {
    lines.copyPrologue(body);
  } else {
    lines.copyPrologue();
  }

  for (const block of script.blocks) {
    for (const command of block.commands) {
      lines.copyTurn(body, command);
    }
    blocks[block.index] = makeBlock(block.codeBlock, body);
    body = [];
  }
}

class Lines {
  prompt: string;
  lines: string[];
  lastLine: number;
  nextLine = 0;

  constructor(prompt: string, text: string) {
    this.prompt = prompt;
    this.lines = text
      .split(prompt + ' ')
      .map(line => line.replace(/\r?\n$/, ''))
      .slice(0, -1);
    this.lastLine = this.lines.length - 1;
  }

  linesRemaining() {
    return this.nextLine <= this.lastLine;
  }

  copyPrologue(body?: string[]) {
    if (this.linesRemaining()) {
      const line = this.lines[this.nextLine];
      if (line !== '') {
        // There is a prologue.
        this.nextLine++;
        // Copy it if a body was supplied.
        if (body !== undefined) {
          body.push(line);
        }
      }
    }
  }

  copyTurn(body: string[], command: string) {
    if (this.linesRemaining()) {
      if (command.trim() !== '') {
        body.push(this.prompt + ' ' + command);
      } else {
        body.push(this.prompt);
      }
      // if (command.trim() !== '') {
        const line = this.lines[this.nextLine++];
        if (line !== '') {
          body.push(line);
        }
      // }
    }
  }
}

class LinesOld {
  prompt: string;
  lines: string[];
  lastLine: number;
  nextLine = 0;

  constructor(prompt: string, text: string) {
    this.prompt = prompt;
    this.lines = text.split(/\r?\n/);
    this.lastLine = this.lines.length - 1;
  }

  linesRemaining() {
    return this.nextLine <= this.lastLine;
  }

  copyOutput(body: string[]) {
    while (
      this.nextLine <= this.lastLine &&
      !this.lines[this.nextLine].startsWith(this.prompt)
    ) {
      body.push(this.lines[this.nextLine++]);
    }
  }

  skipOutput() {
    while (
      this.nextLine <= this.lastLine &&
      !this.lines[this.nextLine].startsWith(this.prompt)
    ) {
      this.nextLine++;
    }
  }

  // skipPrompt() {
  //   if (
  //     this.nextLine <= this.lastLine &&
  //     this.lines[this.nextLine].startsWith(this.prompt)
  //   ) {
  //     this.nextLine++;
  //   }
  // }

  copyPrompt(body: string[], command: string) {
    if (
      this.nextLine <= this.lastLine &&
      this.lines[this.nextLine].startsWith(this.prompt)
    ) {
      const line = this.lines[this.nextLine++];
      body.push(this.prompt + command);
      body.push(line.slice(this.prompt.length + 1));
      this.copyOutput(body);
    }
  }
}
