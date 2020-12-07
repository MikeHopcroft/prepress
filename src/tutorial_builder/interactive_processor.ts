import {spawn} from 'child_process';

import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder2';
import {parseArgs} from './utilities';

// https://github.com/nodejs/node-v0.x-archive/issues/2792

export function interactiveProcessor(blocks: AnySection[], group: Entry[]) {
  // Group blocks into sessions

  // For each session
  //   Create script
  //   Run script
  //   Reassemble output



  for (const entry of group) {
    const block = entry.block;
    const [[session, prompt, executable], args] = parseArgs(
      block.command,
      3,
      true,
      block.parameters
    );

    // Group blocks into sessions
    // For each session
    //   Create script
    //   Run script
    //   Reassemble output

    // const program = spawnSync(executable, args, {shell: false});
    // if (program.error) {
    //   throw program.error;
    // }
    const body = [
      'placeholder'
    ];

    blocks[entry.index] = makeBlock(block, body);
  }
}

function processSession(blocks: AnySection[], group: Entry[]) {
  const block = group[0].block;
  const [[session, prompt, executable], args] = parseArgs(
    block.command,
    3,
    true,
    block.parameters
  );

  // Start session

  // For each block
  //   For each prompt
  //     Run command
  //     Capture output
  //     Reassemble
  //   Reassemble bock

  // Exit session
}

type GeneratorFactory = (prologue: string) => Generator<string, void, string>;

function session(
  prompt: string,
  executable: string,
  args: string[],
  // commands: Generator<string, void, string>
  factory: GeneratorFactory
): Promise<string> {
  console.log(`session("${prompt}", "${executable}", "${args}")`);

  return new Promise<string>((resolve, reject) => {
    try {
      let commands: Generator<string, void, string> | undefined = undefined;
      const program = spawn(executable, args, { shell: false });
      const iStream = program.stdin;
      const oStream = program.stdout;

      // Experiment: see if node needs input before producing output.
      // iStream.write('\n');

      oStream.on('error', (e: Error) => {
        console.log(`Error: ${e.message}`);
      });


      // console.log('after spawn');

      
      // Position of next character to match in the prompt.
      // An undefined value means we're looking for the beginning of a line
      // before comparing with characters in the prompt.
      // Initialize to zero initially to allow prompts at the first
      // character position in the stream.
      let nextMatch: number | undefined = 0;
      let text: string = '';

      function process(c: string) {
        // console.log(`process(${c})`);
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
        // console.log(`text: "${text}"`);
        for (const c of text) {
          process(c);
        }
      });

      program.on('close', (code: number) => {
        // console.log(`close: "${text}"`);
        resolve(text);
      });
    } catch (e) {
      // console.log('reject');
      reject(e);
    }
  });
}

const transcript: string[] = [];

// async function testSession(
//   prompt: string,
//   executable: string,
//   args: string[],
//   commands: string[]
// ) {
//   function* generator(): Generator<string, void, string> {
//     console.log('generator()');
//     for (const command of commands) {
//       console.log(`yield "${command}"`);
//       const output = yield command;
//       console.log(`yield returns "${output}"`);

//       transcript.push(output);
//       transcript.push(command);

//       console.log('=== output ===');
//       console.log(output);
//       console.log('=== command ===');
//       console.log(command);
//     }
//   }

//   const g = generator();
//   console.log('here');
//   const output = await session(prompt, executable, args, g);
//   console.log('=== output ===');
//   console.log(output);
//   transcript.push(output);
// }

async function testSession2(
  prompt: string,
  executable: string,
  args: string[],
  commands: string[]
) {
  function* generator(): Generator<string, void, string> {
    console.log('generator()');
    for (const command of commands) {
      console.log(`yield "${command}"`);
      const output = yield command;
      console.log(`yield returns "${output}"`);

      transcript.push(command + '\n' + output);
      // transcript.push(output);

      console.log('=== output ===');
      console.log(output);
      console.log('=== command ===');
      console.log(command);
    }
  }

  function generatorFactory(prologue: string): Generator<string, void, string> {
    console.log(prologue);
    transcript.push(prologue);
    return generator();
  }

  console.log('here');
  const output = await session(prompt, executable, args, generatorFactory);
  console.log('=== output ===');
  console.log(output);
  transcript.push(output);
}


// // Works
// testSession(
//   '% ',
//   'node.exe',
//   [
//     'd:\\git\\menubot\\ShortOrder\\build\\samples\\repl.js',
//     '-d=d:\\git\\menubot\\shortorder\\samples\\menu',
//     '-x'
//   ],
//   [
//     '1+2',
//     '.help'
//   ]
// );

async function go() {
  await testSession2(
    '> ',
    'node.exe',
    [
      '-i',
    ],
    [
      '1+2',
      '.help'
    ]
  );
  console.log('==========================');
  console.log(transcript.join(''));
  // for (const line of transcript) {
  //   console.log(line);
  // }
}

go();
