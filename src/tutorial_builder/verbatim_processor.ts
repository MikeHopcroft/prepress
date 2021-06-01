import {IFS} from './ifs';
import {AnySection, SectionType} from './markdown_parser';
import {Entry} from './tutorial_builder';

export function verbatimProcessor(
  fs: IFS,
  blocks: AnySection[],
  group: Entry[]
) {
  for (const entry of group) {
    const block = entry.block;

    const body: string[] = [block.open, ...block.body, block.close];

    blocks[entry.index] = {type: SectionType.TEXT, body};
  }
}
