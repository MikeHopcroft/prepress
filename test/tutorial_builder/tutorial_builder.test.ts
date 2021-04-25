import * as chai from 'chai';
import {assert} from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import 'mocha';

chai.use(chaiAsPromised);

import {updateMarkdown3} from '../../src/tutorial_builder/tutorial_builder2';

describe('Tutorial builder', () => {
  it('bad block', async () => {
    const markdown = stripLeadingSpaces(`\
      Text before block
    
      [//]: # (bad_command_name 1 2 3)
      ~~~
      one
      two
      ~~~
    
      Text after block
    `);

    await assert.isRejected(
      updateMarkdown3(markdown),
      'Unknown block type "bad_command_name"'
    );
  });

  describe('file block', () => {
    it('file not found', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file bad_file_name)
        ~~~
        one
        two
        ~~~
      
        Text after file block
      `);

      await assert.isRejected(
        updateMarkdown3(markdown),
        "ENOENT: no such file or directory, open 'bad_file_name'"
      );
    });

    it('file', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt)
        ~~~
        one
        two
        ~~~
      
        Text after file block
      `);

      const expected = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt)
        ~~~
        one
        two
        three
        four
        five
        six
        seven
        eight
        nine
        ten
        eleven
        ~~~
      
        Text after file block
      `);

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });

    it('file numbered', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt numbered)
        ~~~
        one
        two
        ~~~
      
        Text after file block
      `);

      const expected = stripLeadingChars(
        8,
        `\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt numbered)
        ~~~
         1: one
         2: two
         3: three
         4: four
         5: five
         6: six
         7: seven
         8: eight
         9: nine
        10: ten
        11: eleven
        ~~~
      
        Text after file block
      `
      );

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });

    it('file yaml', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt)
        ~~~yaml
        one
        two
        ~~~
      
        Text after file block
      `);

      const expected = stripLeadingSpaces(`\
        Text before file block
      
        [//]: # (file test/tutorial_builder/test.txt)
        ~~~yaml
        one
        two
        three
        four
        five
        six
        seven
        eight
        nine
        ten
        eleven
        ~~~
      
        Text after file block
      `);

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });
  });

  describe('script', () => {
    it.skip('bad script', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before script block
      
        [//]: # (script script_does_not_exist)
        ~~~
        one
        two
        ~~~
      
        Text after script block
      `);

      await assert.isRejected(
        updateMarkdown3(markdown),
        'script returned non-zero status 1'
      );
    });

    it('good script', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before script block
      
        [//]: # (script npm --version)
        ~~~
        one
        two
        ~~~
      
        Text after script block
      `);

      const expected = stripLeadingSpaces(`\
        Text before script block
      
        [//]: # (script npm --version)
        ~~~
        $ npm --version
        X.Y.Z

        ~~~
      
        Text after script block
      `);

      const result = await updateMarkdown3(markdown);
      const observed = result.replace(/(\d+\.\d+\.\d+)/, 'X.Y.Z');
      assert.equal(observed, expected);
    });
  });

  describe('spawn', () => {
    it('bad executable', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before spawn block
      
        [//]: # (spawn executable_does_not_exist)
        ~~~
        one
        two
        ~~~
      
        Text after spawn block
      `);

      await assert.isRejected(
        updateMarkdown3(markdown),
        'spawnSync executable_does_not_exist ENOENT'
      );
    });

    it('good executable', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before spawn block
      
        [//]: # (spawn node build/test/tutorial_builder/test.js)
        ~~~
        one
        two
        ~~~
      
        Text after spawn block
      `);

      const expected = stripLeadingSpaces(`\
        Text before spawn block
      
        [//]: # (spawn node build/test/tutorial_builder/test.js)
        ~~~
        $ node build/test/tutorial_builder/test.js
        hello, world

        ~~~
      
        Text after spawn block
      `);

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });
  });

  describe('verbatim block', () => {
    it('verbatim', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before verbatim block
      
        ~~~
        one
        two
        ~~~
      
        Text after verbatim block
      `);

      const expected = stripLeadingSpaces(`\
        Text before verbatim block
      
        ~~~
        one
        two
        ~~~
      
        Text after verbatim block
      `);

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });
  });

  describe('interactive block', () => {
    it('no prologue', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (interactive one > node.exe -i)
        ~~~
        > a = 1+2
        > b = 3
        > a + b
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block
      
        [//]: # (interactive one > node.exe -i)
        ~~~
        > a = 1+2
        3
        > b = 3
        3
        > a + b
        6
        ~~~
      
        Text after interactive block
      `);

      // TODO:
      //   Multiple sessions
      //   Show prologue
      //   Shell mode

      const observed = await updateMarkdown3(markdown);
      assert.equal(observed, expected);
    });
  });
});

///////////////////////////////////////////////////////////////////////////////
//
// Utility functions
//
///////////////////////////////////////////////////////////////////////////////
export function stripLeadingSpaces(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map(l => l.trimLeft())
      // .slice(1)  // Originally for removing first \n.
      .join('\n')
  );
}

export function stripLeadingChars(count: number, text: string) {
  return text
    .split(/\r?\n/)
    .map(l => l.slice(count))
    .join('\n');
}
