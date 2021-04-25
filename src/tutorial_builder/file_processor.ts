import * as fs from 'fs';

import {AnySection} from './markdown_parser';
import {Entry, makeBlock} from './tutorial_builder';
import {parseArgs, rightJustify} from './utilities';

export function fileProcessor(blocks: AnySection[], group: Entry[]) {
  for (const entry of group) {
    const block = entry.block;
    const [[file], [numbered]] = parseArgs(
      block.command,
      1,
      true,
      block.parameters
    );

    let body = fs.readFileSync(file, 'utf-8').split(/\r?\n/);

    if (numbered) {
      const fieldWidth = body.length.toString().length;
      body = body.map((l, i) => {
        return rightJustify((i + 1).toString(), fieldWidth) + ': ' + l;
      });
    }

    blocks[entry.index] = makeBlock(block, body);
  }
}
