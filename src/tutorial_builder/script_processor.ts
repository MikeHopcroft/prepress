import {spawnSync} from 'child_process';

import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder2';
import {parseArgs} from './utilities';

export function scriptProcessor(blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    const [[executable], args] = parseArgs(
      block.command,
      1,
      true,
      block.parameters
    );

    const program = spawnSync(executable, args, {shell: true});
    if (program.error) {
      throw program.error;
    }

    // DESIGN NOTE: cannot distinguish between a missing script and a script
    // with a non-zero return code. Probably don't want to throw here because
    // user may intend to invoke a script that results in a non-zero return
    // code.
    //
    // TODO: investigate better solution.
    //
    // if (program.status !== 0) {
    //   const message = `script returned non-zero status ${program.status}`;
    //   throw new TypeError(message);
    // }

    const body = [
      // TODO: escape args
      `$ ${executable} ${args.join(' ')}`,
      program.stdout.toString(),
    ];

    blocks[entry.index] = makeBlock(block, body);
  }
}
