import {assert} from 'chai';
// import * as chai from 'chai';
// import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
const {patchFs} = require('fs-monkey');
import {Volume} from 'memfs';
import 'mocha';
import * as ncp from 'ncp';
import * as sinon from 'sinon';

import {tutorialBuilderMain} from '../../src/tutorial_builder';

// chai.use(chaiAsPromised);

describe('Apps', () => {
  describe('prepress', () => {
    describe('errors', () => {
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

      it('no input file', async () => {
        const argv = ['node', 'build/apps/prepress.js'];

        const succeeded = await tutorialBuilderMain(argv);
        const observed = consoleLog();
        const expected =
          ' \nExpected an <input file>.\n \nUse the -h flag for help.\n \nAborting\n ';

        assert.isFalse(succeeded);
        assert.equal(observed, expected);
      });

      it('input file not found', async () => {
        const vol = Volume.fromJSON({});
        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.md': 'some test',
        });
        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.src.md': 'some test',
        });
        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/src/input.src.md': 'some text',
          '/output.md': 'some more text',
        });
        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.src.md': sourceText,
          '/output.md': 'other text',
        });

        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.src.md': sourceText,
        });

        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.src.md': sourceText,
          '/input.md': 'other text',
        });

        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/input.src.md': sourceText,
        });

        patchFs(vol);

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

      it('from directory to explicit existing directory', async () => {
        const sourceText1 = 'any source text';
        const sourceText2 = 'text two';
        const sourceText3 = 'a third text';
        const vol = Volume.fromJSON({
          '/src/one.src.md': sourceText1,
          '/src/two.src.md': sourceText2,
          '/src/three.src.md': sourceText3,
          '/dest/one.md': 'some text',
        });

        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/src/one.src.md': sourceText1,
          '/src/two.src.md': sourceText2,
          '/src/three.src.md': sourceText3,
        });

        patchFs(vol);

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

      it.skip('test npc', async () => {
        const sourceText1 = 'any source text';
        const sourceText2 = 'text two';
        const sourceText3 = 'a third text';
        const vol = Volume.fromJSON({
          '/src123/one.md': sourceText1,
          '/src123/one.src.md': sourceText1,
          '/src123/two.src.md': sourceText2,
          '/src123/nested/three.src.md': sourceText3,
        });

        patchFs(vol);

        function copy(src: string, dest: string): Promise<boolean> {
          return new Promise<boolean>((resolve, reject) => {
            ncp(
              src,
              dest,
              {
                // https://github.com/AvianFlu/ncp/issues/130
                filter: path => {
                  if (fs.lstatSync(path).isDirectory()) {
                    return true;
                  } else {
                    return path.endsWith('.src.md');
                  }
                },
                transform: (
                  read: NodeJS.ReadableStream,
                  write: NodeJS.WritableStream,
                  file: ncp.File
                ) => {
                  console.log('copying ' + file.name);
                  read.pipe(write).on('finish', () => {
                    console.log(file.name + ' finished');
                  });
                },
              },
              err => {
                if (err) {
                  console.log(`Errors: ${err}`);
                  reject(err);
                } else {
                  resolve(true);
                }
              }
            );
          });
        }
        await assert.isFulfilled(copy('/src123', '/dest123'));

        // const expectedVolume = {
        //   '/dest/one.md': sourceText1,
        //   '/dest/two.md': sourceText2,
        //   '/dest/nested/three.md': sourceText3,
        //   '/src/one.src.md': sourceText1,
        //   '/src/two.src.md': sourceText2,
        //   '/src/nested/three.src.md': sourceText3,
        // };

        const observedVolume = vol.toJSON();
        console.log('==================');
        console.log(observedVolume);

        assert.fail();
      });

      it('from directory to explicit new directory recursive', async () => {
        const sourceText1 = 'any source text';
        const sourceText2 = 'text two';
        const sourceText3 = 'a third text';
        const vol = Volume.fromJSON({
          '/src/one.src.md': sourceText1,
          '/src/two.src.md': sourceText2,
          '/src/nested/three.src.md': sourceText3,
        });
        patchFs(vol);

        const argv = ['node', 'build/apps/prepress.js', '/src', '/dest', '-r'];
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
        const vol = Volume.fromJSON({
          '/src/one.src.md': sourceText1,
          '/src/two.src.md': sourceText2,
          '/src/three.src.md': sourceText3,
        });
        patchFs(vol);

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
        const vol = Volume.fromJSON({
          '/src/one.src.md': sourceText1,
          '/src/two.src.md': sourceText2,
          '/src/nested/three.src.md': sourceText3,
        });
        patchFs(vol);

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
