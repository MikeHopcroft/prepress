import {assert} from 'chai';
import 'mocha';

import {parseArgs} from '../../src/tutorial_builder/utilities';

describe('Utilities', () => {
  describe('parseArgs', () => {
    describe('errors', () => {
      it('too many parameters', async () => {
        assert.throws(
          () => parseArgs('command', 1, false, 'one two three'),
          'command: found extra parameters (expected 1).'
        );
      });

      it('too few parameters', async () => {
        assert.throws(
          () => parseArgs('command', 3, false, 'one'),
          'command: parameters missing (expected 3).'
        );
      });
    });
    describe('valid', () => {
      it('exact parameter count', async () => {
        const [required, rest] = parseArgs('command', 2, false, 'one two');
        assert.deepEqual(required, ['one', 'two']);
        assert.deepEqual(rest, []);
      });

      it('rest parameters', async () => {
        const [required, rest] = parseArgs(
          'command',
          2,
          true,
          'one two three four'
        );
        assert.deepEqual(required, ['one', 'two']);
        assert.deepEqual(rest, ['three', 'four']);
      });
    });
  });
});
