import {spawnSync} from 'child_process';

import {IFS} from './ifs';
import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder';
import {parseArgs} from './utilities';

export function spawnProcessor(fs: IFS, blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    const [[executable], args] = parseArgs(
      block.command.name,
      1,
      true,
      block.command.parameters
    );

    const program = spawnSync(executable, args, {shell: false});
    if (program.error) {
      throw program.error;
    }
    const body = [
      // TODO: escape args
      `$ ${executable} ${args.join(' ')}`,
      program.stdout.toString(),
    ];

    blocks[entry.index] = makeBlock(block, body);
  }
}
