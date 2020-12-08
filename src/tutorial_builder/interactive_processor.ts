import {spawn} from 'child_process';
import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder2';
import {parseArgs} from './utilities';

// https://github.com/nodejs/node-v0.x-archive/issues/2792

export async function interactiveProcessor(
  blocks: AnySection[],
  group: Entry[]
) {
  console.log('interactiveProcessor()');
  const sessions = groupBySession(group);

  for (const session of sessions.values()) {
    await processSession(blocks, session);
  }
}

function groupBySession(group: Entry[]) {
  const sessions = new Map<string, Entry[]>();
  for (const entry of group) {
    const block = entry.block;
    const [[prompt, sessionId, executable], args] = parseArgs(
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

type CmdGenerator = Generator<string, void, string>;
type CmdGeneratorFactory = (prologue: string) => Generator<string, void, string>;

async function processSession(blocks: AnySection[], group: Entry[]) {
  const block = group[0].block;
  const [[session, prompt, executable], args] = parseArgs(
    block.command,
    3,
    true,
    block.parameters
  );

  // Build CmdGeneratorFactory.
  const factory: CmdGeneratorFactory = (prologue: string) => {
    // TODO: remove the prompt + space hack
    return cmdGenerator(blocks, prompt + ' ', group, prologue);
  }

  // TODO: remove the prompt + space hack
  const output = await startSession(prompt + ' ', executable, args, factory);
}

function* cmdGenerator(
  blocks: AnySection[],
  prompt: string,
  group: Entry[],
  prologue: string
): Generator<string, void, string> {
  console.log(`cmdGenerator: prompt="${prompt}", prologue="${prologue}"`);
  const keepPrologue = !group[0].block.body[0].startsWith(prompt);
  for (const [index, entry] of group.entries()) {
    const block = entry.block;

    // Get the commands in this block.
    const commands: string[] = [];
    for (const line of block.body) {
      if (line.startsWith(prompt)) {
        commands.push(line.slice(prompt.length));
      }
    }

    // Set up body for this block.
    const bodyFragments: string[] = [];
    if (index === 0 && keepPrologue) {
      // Prologue appears in the first block.
      bodyFragments.push(prologue);
    } else {
      bodyFragments.push(prompt);
    }

    // Run commands.
    for (const command of commands) {
      const output = yield command;
      bodyFragments.push(command + '\n' + output.slice())
    }

    // Update the block.
    // NOTE: slice() on next line trims off final prompt and newline.
    const body = [bodyFragments.join('').slice(0, -prompt.length - 1)];
    blocks[entry.index] = makeBlock(block, body);
  }
}

function startSession(
  prompt: string,
  executable: string,
  args: string[],
  factory: CmdGeneratorFactory
): Promise<string> {
  console.log(`session("${prompt}", "${executable}", "${args}")`);

  return new Promise<string>((resolve, reject) => {
    try {
      let commands: Generator<string, void, string> | undefined = undefined;
      const program = spawn(executable, args, { shell: false });
      const iStream = program.stdin;
      const oStream = program.stdout;

      oStream.on('error', (e: Error) => {
        console.log(`Error: ${e.message}`);
      });

      // Position of next character to match in the prompt.
      // An undefined value means we're looking for the beginning of a line
      // before comparing with characters in the prompt.
      // Initialize to zero initially to allow prompts at the first
      // character position in the stream.
      let nextMatch: number | undefined = 0;
      let text: string = '';

      function process(c: string) {
        text += c;
        if (c === '\n' || c === '\r') {
          // We're at the beginning of a line.
          // Start comparing with the first character of the prompt.
          nextMatch = 0;
        } else if (nextMatch !== undefined && c === prompt[nextMatch]) {
          nextMatch++;
          if (nextMatch === prompt.length) {
            // We've encountered a prompt.
            // Reset the state machine.
            nextMatch = 0;

            if (commands === undefined) {
              commands = factory(text);
            }

            console.log(`commands.next("${text}")`);
            const curr = commands.next(text);
            if (curr.done) {
              iStream.end();
            } else {
              // Dispatch the next command.
              iStream.write(curr.value + '\n');
            }

            text = '';
          }
        } else {
          // Character didn't match pattern. Reset state machine.
          nextMatch = undefined;
        }
      }

      oStream.on('data', (data: Buffer) => {
        const text = data.toString('utf8');
        console.log(`oStream: "${text}"`);
        for (const c of text) {
          process(c);
        }
      });

      program.on('close', (code: number) => {
        resolve(text);
      });
    } catch (e) {
      reject(e);
    }
  });
}
