import chai, {assert} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Volume} from 'memfs';
import 'mocha';

chai.use(chaiAsPromised);

import {IFS} from '../../src/tutorial_builder/ifs';
import {Updater} from '../../src/tutorial_builder/tutorial_builder';

const updater = new Updater();
async function updateMarkdown(fs: IFS, text: string): Promise<string> {
  return updater.updateMarkdown(fs, text);
}

// Files for virtual file system used by tests.
const files = {
  'test.txt':
    'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven',
};

describe('Tutorial builder', () => {
  const volume = Volume.fromJSON({});
  const fs: IFS = (volume as unknown) as IFS;

  beforeEach(() => {
    volume.reset();
    volume.fromJSON(files, 'test/tutorial_builder');
  });

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
      updateMarkdown(fs, markdown),
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
        updateMarkdown(fs, markdown),
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

      const observed = await updateMarkdown(fs, markdown);
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

      const observed = await updateMarkdown(fs, markdown);
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

      const observed = await updateMarkdown(fs, markdown);
      assert.equal(observed, expected);
    });
  });

  describe('script', () => {
    // TODO: DESIGN: what should the prepress return code be when a script fails?
    // It is possible that one is demonstrating a script that fails.
    // Should distinguish between two scenarios:
    //   1. Prepress fails to invoke script - this should report a failure.
    //   2. Script was invoked and then failed on its own - this should not
    //      report a failure.
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
        updateMarkdown(fs, markdown),
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

      const result = await updateMarkdown(fs, markdown);
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
        updateMarkdown(fs, markdown),
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

      const observed = await updateMarkdown(fs, markdown);
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

      const observed = await updateMarkdown(fs, markdown);
      assert.equal(observed, expected);
    });
  });

  // DESIGN NOTE: most of the iscript cases are tested by the ispawn tests.
  // The simple iscript block case tests that a script can be run in a shell.
  describe('iscript block', () => {
    it('simple', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (iscript one > npm --version)
        ~~~
        prologue
        ~~~

        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (iscript one > npm --version)
        ~~~
        X.Y.Z
        ~~~

        Text after interactive block
      `);

      const observed = await updateMarkdown(fs, markdown);
      const normalized = observed.replace(/\d+\.\d+\.\d+/, 'X.Y.Z');
      assert.equal(normalized, expected);
    });
  });

  describe('ispawn block', () => {
    it('empty body', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (ispawn one > node -i)
        ~~~
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block
      
        [//]: # (ispawn one > node -i)
        ~~~
        ~~~
      
        Text after interactive block
      `);

      const observed = await updateMarkdown(fs, markdown);
      assert.equal(observed, expected);
    });

    it('invocation', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (ispawn one > node -i)
        [//]: # (invocation $ node -i)
        ~~~
        prologue
        > 1
        > 2
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
      Text before interactive block

      [//]: # (ispawn one > node -i)
      [//]: # (invocation $ node -i)
      ~~~
      $ node -i

      Welcome to Node.js vX.Y.Z.
      Type ".help" for more information.
      > 1
      1
      > 2
      2
      ~~~
    
      Text after interactive block
    `);

      const observed = await updateMarkdown(fs, markdown);

      // DESIGN NOTE: need to normalize the version so that the test will
      // pass for the entire matrix of Node versions used in GitHub actions.
      const normalized = normalizeNodeVersion(observed);
      assert.equal(normalized, expected);
    });

    it('preserve empty prompt', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (ispawn one > node -i)
        ~~~
        > a = 1+2
        >
        > b = 3
        > a + b
        >
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block
      
        [//]: # (ispawn one > node -i)
        ~~~
        > a = 1+2
        3
        >
        > b = 3
        3
        > a + b
        6
        >
        ~~~
      
        Text after interactive block
      `);

      const observed = await updateMarkdown(fs, markdown);
      assert.equal(observed, expected);
    });

    it('suppress prologue', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (ispawn one > node -i)
        ~~~
        > a = 1+2
        > b = 3
        > a + b
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block
      
        [//]: # (ispawn one > node -i)
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

      const observed = await updateMarkdown(fs, markdown);
      assert.equal(observed, expected);
    });

    it('display prologue', async () => {
      const markdown = stripLeadingSpaces(`\
        Text before interactive block

        [//]: # (ispawn one > node -i)
        ~~~
        Placeholder for prologue
        > a = 1+2
        > b = 3
        > a + b
        ~~~
      
        Text after interactive block
      `);

      const expected = stripLeadingSpaces(`\
        Text before interactive block
      
        [//]: # (ispawn one > node -i)
        ~~~
        Welcome to Node.js vX.Y.Z.
        Type ".help" for more information.
        > a = 1+2
        3
        > b = 3
        3
        > a + b
        6
        ~~~
      
        Text after interactive block
      `);

      const observed = await updateMarkdown(fs, markdown);

      // DESIGN NOTE: need to normalize the version so that the test will
      // pass for the entire matrix of Node versions used in GitHub actions.
      const normalized = normalizeNodeVersion(observed);
      assert.equal(normalized, expected);
    });

    it('one session, multiple blocks', async () => {
      const markdown = stripLeadingSpaces(`\
        Before first block

        [//]: # (ispawn one > node -i)
        ~~~
        Prologue
        > 1
        >
        > 3
        >
        ~~~

        Before second block

        [//]: # (ispawn one > node -i)
        ~~~
        > 3 + 4
        ~~~

        After second block
      `);

      const expected = stripLeadingSpaces(`\
        Before first block

        [//]: # (ispawn one > node -i)
        ~~~
        Welcome to Node.js vX.Y.Z.
        Type ".help" for more information.
        > 1
        1
        >
        > 3
        3
        >
        ~~~

        Before second block

        [//]: # (ispawn one > node -i)
        ~~~
        > 3 + 4
        7
        ~~~

        After second block
    `);

      const observed = await updateMarkdown(fs, markdown);

      // DESIGN NOTE: need to normalize the version so that the test will
      // pass for the entire matrix of Node versions used in GitHub actions.
      const normalized = normalizeNodeVersion(observed);
      assert.equal(normalized, expected);
    });

    it('multiple sessions', async () => {
      const markdown = stripLeadingSpaces(`\
        Interactive block for session one

        [//]: # (ispawn one > node -i)
        ~~~
        > a = 'hello'
        ~~~

        Interactive block for session two

        [//]: # (ispawn two > node -i)
        ~~~
        > a
        > a = 'goodbye'
        ~~~

        Return to session one

        [//]: # (ispawn one > node -i)
        ~~~
        > a
        ~~~

        Return to session two

        [//]: # (ispawn two > node -i)
        ~~~
        > a
        ~~~
      `);

      const expected = stripLeadingSpaces(`\
        Interactive block for session one

        [//]: # (ispawn one > node -i)
        ~~~
        > a = 'hello'
        'hello'
        ~~~

        Interactive block for session two

        [//]: # (ispawn two > node -i)
        ~~~
        > a
        Uncaught ReferenceError: a is not defined
        > a = 'goodbye'
        'goodbye'
        ~~~

        Return to session one

        [//]: # (ispawn one > node -i)
        ~~~
        > a
        'hello'
        ~~~

        Return to session two

        [//]: # (ispawn two > node -i)
        ~~~
        > a
        'goodbye'
        ~~~
      `);

      const observed = await updateMarkdown(fs, markdown);
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

function normalizeNodeVersion(text: string): string {
  return text.replace(
    /(Welcome to Node.js.*\n)/,
    'Welcome to Node.js vX.Y.Z.\n'
  );
}
