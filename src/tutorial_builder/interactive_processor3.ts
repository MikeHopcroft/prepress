import {spawn} from 'child_process';

import {IFS} from './ifs';
import {AnySection, CodeBlockSection, Command} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder';
import {parseArgs} from './utilities';

// https://github.com/nodejs/node-v0.x-archive/issues/2792

/******************************************************************************
 * DESIGN FACTORS
 * 
 * 1. Some interactive programs do nothing when presented with the string '\n',
 *    even though pressing enter at the prompt would result in a new prompt.
 *    Mitigate this by simulating empty lines.
 * 2. Some interactive programs print a prompt, when presented with the string
 *    '\n', but this prompt is not preceded by a newline. Example is 'node -i'.
 * 3. Some interactive programs run differently, in a sort of "batch mode",
 *    when presented with input that contains multiple newlines.
 * 4. Some interactive programs exit, when presented with the string, '\n'.
 */

export async function interactiveProcessor3(
  fs: IFS,
  blocks: AnySection[],
  group: Entry[]
) {
  console.log('interactiveProcessor3()');
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
      block.command.parameters,
      3,
      true,
      block.command.parameters
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

interface BlockInfo {
  index: number;
  commands: string[];
  codeBlock: CodeBlockSection;
}

interface Script {
  includePrologue: boolean;
  invocation?: string;
  blocks: BlockInfo[];
}

async function processSession(blocks: AnySection[], group: Entry[]) {
  // console.log('processSession');
  const block = group[0].block;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [[session, prompt, executable], args] = parseArgs(
    block.command.name,
    3,
    true,
    block.command.parameters
  );

  // Process blocks to produce
  //   1. Command script
  //   2. Information for mapping session output to blocks
  //      a) Commands in each block
  //      b) Whether to retain prologue
  //      c) Whether to retain trailing prompt
  const script = generateScript(prompt, group);

  // Run script in session and gather output.
  const output = await runScript(executable, args, prompt, script);

  // Process output back into blocks.
  updateBlocks(blocks, prompt, script, output);
}

function generateScript(prompt: string, group: Entry[]): Script {
  // console.log('generateScript');
  const blocks: BlockInfo[] = [];

  // Determine whether to include the prologue in this session.
  // Prologue should be included if source block has any text
  // before the first prompt.
  const includePrologue =
    group.length > 0 &&
    group[0].block.body.length > 0 &&
    !group[0].block.body[0].startsWith(prompt);

  let invocation: string | undefined;
  const option: Command | undefined = group[0].block.options[0];
  if (option && option.name === 'invocation') {
    invocation = option.parameters;
  }

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
  return {includePrologue, invocation, blocks};
}

async function runScript(
  executable: string,
  args: string[],
  prompt: string,
  script: Script
): Promise<string[]> {
  // console.log(`runScript prompt(${prompt})`);
  const detector = new PromptDetector(prompt);
  const segments: string[] = [];

  const commands: string[] = [];
  for (const block of script.blocks) {
    for (const command of block.commands) {
      commands.push(command);
    }
  }
  let nextCommand = 0;
  let ended = false;

  return new Promise<string[]>((resolve, reject) => {
    try {
      // executable = "node";
      // const args = [
      //   "d:\\git\\menubot\\PrixFixe\\build\\samples\\repl.js",
      //   '-x',
      //   '-d=d:\\git\\menubot\\PrixFixe\\samples\\menu'
      // ];

      // executable = 'node';
      // const args = [
      //   'd:\\git\\menubot\\PrixFixe\\build\\samples\\repl.js',
      //   '-x',
      //   '-d=d:\\git\\menubot\\PrixFixe\\samples\\menu',
      // ];

      const program = spawn(executable, args, {shell: false});
      const iStream = program.stdin;
      const oStream = program.stdout;

      oStream.on('error', (e: Error) => {
        console.log(`Error: ${e.message}`);
      });

      oStream.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        if (!ended) {
          for (const c of text) {
            const segment = detector.feedChar(c);
            if (segment !== null) {
              // We've detected a prompt and are ready to dispatch the next command.
              // console.log(`segment = ${JSON.stringify(segment)}`);
              segments.push(segment);

              // Skip over empty commands.
              while (nextCommand < commands.length && commands[nextCommand] === '') {
                ++nextCommand;
              }

              if (nextCommand === commands.length) {
                // No more commands. Close stream.
                ended = true;
                iStream.end();
              } else {
                // Dispatch the next command.
                // console.log(`dispatch('${commands[nextCommand]}')`);
                // TODO: REVIEW: why set a different mode than set by PromptDetector.feedchar()?
                // detector.lookForPrompt();
                iStream.write(commands[nextCommand++] + '\n');
              }
            }
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      program.on('close', (code: number) => {
        resolve(segments);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function updateBlocks(
  blocks: AnySection[],
  prompt: string,
  script: Script,
  segments: string[]
) {
  let body: string[] = [];
  let nextOutput = 0;

  if (script.invocation !== undefined) {
    body.push(script.invocation);
    body.push('');
  }

  if (script.includePrologue) {
    body.push(segments[nextOutput]);
  }
  nextOutput++;

  for (const block of script.blocks) {
    for (const command of block.commands) {
      if (command.length === 0) {
        body.push(prompt);
      } else {
        body.push(prompt + ' ' + command);
        const segment = segments[nextOutput++];
        if (segment.length > 0) {
          // Only allow a new line output was generated.
          body.push(segment);
        }
      }
    }
    blocks[block.index] = makeBlock(block.codeBlock, body);
    body = [];
  }
}

class PromptDetector {
  prompt: string;

  // state = State.LOOKING_FOR_PROMPT;
  lookingForNewline = false;
  promptCharsMatched = 0;
  text = '';

  constructor(prompt: string) {
    this.prompt = prompt + ' ';
  }

  feedChar(c: string): string | null {
    this.text += c;
    // console.log(
    //   `text = ${JSON.stringify(this.text)}, lookingForNewline: ${
    //     this.lookingForNewline
    //   }, matched=${this.promptCharsMatched}`
    // );
    if (this.lookingForNewline) {
      // console.log(1);
      if (c === '\n') {
        this.lookForPrompt();
      }
    } else {
      // Looking for the prompt or newline
      // console.log(2);
      // console.log(
      //   `2: c=${JSON.stringify(c)}, prompt=${JSON.stringify(
      //     this.prompt
      //   )}`
      // );
      if (c === '\n') {
        // console.log('c is newline');
        this.lookForPrompt();
      } else if (c === this.prompt[this.promptCharsMatched]) {
        ++this.promptCharsMatched;
        // console.log(`matched=${this.promptCharsMatched}`);
        if (this.promptCharsMatched === this.prompt.length) {
          const save = this.text;
          this.text = '';
          this.lookForNewline();
          return this.normalize(save);
          // return save.slice(0, -this.prompt.length);
        } else {
          // console.log(
          //   `fallthrough: c=${JSON.stringify(c)}, prompt=${JSON.stringify(
          //     this.prompt
          //   )}`
          // );
        }
      } else {
        // console.log(3);
        this.lookForNewline();
      }
    }
    return null;
  }

  private lookForNewline() {
    this.lookingForNewline = true;
  }

  lookForPrompt() {
    this.lookingForNewline = false;
    this.promptCharsMatched = 0;
  }

  private normalize(segment: string) {
    // Trim off the prompt and any preceding CR/LF.
    return segment.slice(0, -this.prompt.length).replace(/\r?\n$/, '');
  }
}

// for (b of script.blocks) { for (c of b.commands) {console.log(c)}}
