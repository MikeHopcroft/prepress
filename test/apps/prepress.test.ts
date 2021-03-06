import {assert} from 'chai';
const {patchFs} = require('fs-monkey');
import {DirectoryJSON, Volume} from 'memfs';
import 'mocha';
import sinon from 'sinon';

import {tutorialBuilderMain} from '../../src/tutorial_builder';

describe('Apps', () => {
  describe('prepress', () => {
    let consoleSpy: sinon.SinonSpy;
    beforeEach(() => {
      consoleSpy = sinon.fake();
      sinon.replace(console, 'log', consoleSpy);
    });

    afterEach(() => {
      sinon.restore();
    });

    function consoleLog(): string {
      return consoleSpy.args.map(x => x[0]).join('\n');
    }

    it('show usage -h', async () => {
      const argv = ['node', 'build/apps/prepress.js', '-h'];
      const succeeded = await tutorialBuilderMain(argv);
      assert.isTrue(succeeded);

      // DESIGN NOTE: Using a simple regex to verify the existence of three
      // specific section headers. This strikes a balance between a thorough
      // test and a brittle test. Some considerations were
      //   1. Handle Windows and Posix line terminations.
      //   2. Shouldn't be sensitive to small edits in help message.
      //   3. Shouldn't be sensitive to changes in ANSI escape codes emitted by
      //      the command-line-usage package. Note that ANSI escape codes for
      //      underlining prevent the use of \b to detect word boundaries in
      //      the regex.
      //   4. Handles mocha scenario (program name is mocha) and nyc scenario
      //      (program name is bundle.js)
      //   5. Should give reasonable assurance that -h and --help flags
      //      produced a help message.
      const observed = consoleLog();
      const match = observed.match(/^.*Tutorial Builder.+Usage.+Options/s);
      assert.isNotNull(match);
    });

    it('show usage --help', async () => {
      const argv = ['node', 'build/apps/prepress.js', '--help'];
      const succeeded = await tutorialBuilderMain(argv);
      assert.isTrue(succeeded);

      // DESIGN NOTE: Using a simple regex to verify the existence of three
      // specific section headers. This strikes a balance between a thorough
      // test and a brittle test. Some considerations were
      //   1. Handle Windows and Posix line terminations.
      //   2. Shouldn't be sensitive to small edits in help message.
      //   3. Shouldn't be sensitive to changes in ANSI escape codes emitted by
      //      the command-line-usage package. Note that ANSI escape codes for
      //      underlining prevent the use of \b to detect word boundaries in
      //      the regex.
      //   4. Handles mocha scenario (program name is mocha) and nyc scenario
      //      (program name is bundle.js)
      //   5. Should give reasonable assurance that -h and --help flags
      //      produced a help message.
      const observed = consoleLog();
      const match = observed.match(/^.*Tutorial Builder.+Usage.+Options/s);
      assert.isNotNull(match);
    });

    describe('with mock filesystem', () => {
      const vol = Volume.fromJSON({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let unpatch: any;

      beforeEach(() => {
        unpatch = patchFs(vol);
      });

      afterEach(() => {
        unpatch();
      });

      function initializeFS(json: DirectoryJSON) {
        vol.reset();
        vol.fromJSON(json);
      }

      describe('errors', () => {
        it('no input file', async () => {
          const argv = ['node', 'build/apps/prepress.js'];

          const succeeded = await tutorialBuilderMain(argv);
          const observed = consoleLog();
          const expected =
            '\t\nExpected an <input file>.\n\t\nUse the -h flag for help.\n\t\nAborting\n\t';

          assert.isFalse(succeeded);
          assert.equal(observed, expected);
        });

        it('input file not found', async () => {
          initializeFS({});

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/input.src.md',
            '/output.md',
          ];

          const succeeded = await tutorialBuilderMain(argv);
          const observed = consoleLog();
          const expected =
            'Error: Cannot find input file or directory "/input.src.md".';

          assert.isFalse(succeeded);
          assert.equal(observed, expected);
        });

        it('input file does not end with .src.md', async () => {
          initializeFS({
            '/input.md': 'some test',
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/input.md',
            '/output.md',
          ];

          const succeeded = await tutorialBuilderMain(argv);
          const observed = consoleLog();
          const expectedSuffix = ' does not end with .src.md';
          assert.isFalse(succeeded);
          assert.isTrue(observed.endsWith(expectedSuffix));
        });

        it('output file ends with .src.md', async () => {
          initializeFS({
            '/input.src.md': 'some test',
          });
          const argv = [
            'node',
            'build/apps/prepress.js',
            '/input.src.md',
            '/output.src.md',
          ];

          const succeeded = await tutorialBuilderMain(argv);
          const observed = consoleLog();
          const expectedSuffix = ' cannot end with .src.md';
          assert.isFalse(succeeded);
          assert.isTrue(observed.endsWith(expectedSuffix));
        });

        it('input directory to existing output file', async () => {
          initializeFS({
            '/src/input.src.md': 'some text',
            '/output.md': 'some more text',
          });

          const argv = ['node', 'build/apps/prepress.js', '/src', '/output.md'];

          const succeeded = await tutorialBuilderMain(argv);
          const observed = consoleLog();
          const expected =
            'Error: Cannot process directory /src to single output file /output.md.';

          assert.isFalse(succeeded);
          assert.equal(observed, expected);
        });
      });

      describe('valid', () => {
        it('from file to explicit existing file', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/input.src.md': sourceText,
            '/output.md': 'other text',
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/input.src.md',
            '/output.md',
          ];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/input.src.md': sourceText,
            '/output.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from file to explicit new file', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/input.src.md': sourceText,
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/input.src.md',
            '/output.md',
          ];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/input.src.md': sourceText,
            '/output.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from file to implicit existing file', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/input.src.md': sourceText,
            '/input.md': 'other text',
          });

          const argv = ['node', 'build/apps/prepress.js', '/input.src.md'];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/input.src.md': sourceText,
            '/input.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from file to implicit new file', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/input.src.md': sourceText,
          });

          const argv = ['node', 'build/apps/prepress.js', '/input.src.md'];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/input.src.md': sourceText,
            '/input.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from file to explicit directory (new file)', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/src/dir1/dir2/input.src.md': sourceText,
            '/output': null,
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/src/dir1/dir2/input.src.md',
            '/output',
          ];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/src/dir1/dir2/input.src.md': sourceText,
            '/output/input.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from file to explicit directory (existing file)', async () => {
          const sourceText = 'any source text';
          const generatedText = sourceText;
          initializeFS({
            '/src/dir1/dir2/input.src.md': sourceText,
            '/output/input.md': 'some text',
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/src/dir1/dir2/input.src.md',
            '/output',
          ];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/src/dir1/dir2/input.src.md': sourceText,
            '/output/input.md': generatedText,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from directory to explicit existing directory', async () => {
          const sourceText1 = 'any source text';
          const sourceText2 = 'text two';
          const sourceText3 = 'a third text';
          initializeFS({
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
            '/dest/one.md': 'some text',
          });

          const argv = ['node', 'build/apps/prepress.js', '/src', '/dest'];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/dest/one.md': sourceText1,
            '/dest/two.md': sourceText2,
            '/dest/three.md': sourceText3,
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from directory to explicit new directory', async () => {
          const sourceText1 = 'any source text';
          const sourceText2 = 'text two';
          const sourceText3 = 'a third text';
          initializeFS({
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
          });

          const argv = ['node', 'build/apps/prepress.js', '/src', '/dest'];

          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/dest/one.md': sourceText1,
            '/dest/two.md': sourceText2,
            '/dest/three.md': sourceText3,
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from directory to explicit new directory recursive', async () => {
          const sourceText1 = 'any source text';
          const sourceText2 = 'text two';
          const sourceText3 = 'a third text';
          initializeFS({
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/nested/three.src.md': sourceText3,
          });

          const argv = [
            'node',
            'build/apps/prepress.js',
            '/src',
            '/dest',
            '-r',
          ];
          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/dest/one.md': sourceText1,
            '/dest/two.md': sourceText2,
            '/dest/nested/three.md': sourceText3,
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/nested/three.src.md': sourceText3,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from directory to same directory', async () => {
          const sourceText1 = 'any source text';
          const sourceText2 = 'text two';
          const sourceText3 = 'a third text';
          initializeFS({
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
          });

          const argv = ['node', 'build/apps/prepress.js', '/src'];
          await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/three.src.md': sourceText3,
            '/src/one.md': sourceText1,
            '/src/two.md': sourceText2,
            '/src/three.md': sourceText3,
          };

          const observedVolume = vol.toJSON();

          assert.deepEqual(observedVolume, expectedVolume);
        });

        it('from directory to same directory recursive', async () => {
          const sourceText1 = 'any source text';
          const sourceText2 = 'text two';
          const sourceText3 = 'a third text';
          initializeFS({
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/nested/three.src.md': sourceText3,
          });

          const argv = ['node', 'build/apps/prepress.js', '/src', '-r'];
          const succeeded = await tutorialBuilderMain(argv);

          const expectedVolume = {
            '/src/one.md': sourceText1,
            '/src/two.md': sourceText2,
            '/src/nested/three.md': sourceText3,
            '/src/one.src.md': sourceText1,
            '/src/two.src.md': sourceText2,
            '/src/nested/three.src.md': sourceText3,
          };

          const observedVolume = vol.toJSON();

          assert.isTrue(succeeded);
          assert.deepEqual(observedVolume, expectedVolume);
        });
      });
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
