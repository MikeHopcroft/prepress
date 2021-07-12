import {spawnSync} from 'child_process';

import {IFS} from './ifs';
import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder';
import {parseArgs} from './utilities';

export function scriptProcessor(fs: IFS, blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    const [[executable], args] = parseArgs(
      block.command.name,
      1,
      true,
      block.command.parameters
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
