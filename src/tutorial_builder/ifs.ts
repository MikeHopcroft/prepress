import fs from 'fs';
// import { Writable, Readable } from "stream";

// export type FSMethods =
//   | 'renameSync'
//   // | "ftruncateSync"
//   // | 'truncateSync'
//   | 'chownSync'
//   | 'fchownSync'
//   | 'lchownSync'
//   | 'chmodSync'
//   | 'fchmodSync'
//   | 'lchmodSync'
//   // | 'statSync'
//   | 'lstatSync'
//   | 'fstatSync'
//   | 'linkSync'
//   // | 'symlinkSync'
//   // | 'readlinkSync'
//   // | 'realpathSync'
//   | 'unlinkSync'
//   | 'rmdirSync'
//   // | 'mkdirSync'
//   // | 'readdirSync'
//   | 'closeSync'
//   // | 'openSync'
//   | 'utimesSync'
//   | 'futimesSync'
//   | 'fsyncSync'
//   // | 'writeSync'
//   // | 'readSync'
//   | 'readFileSync'
//   // | 'writeFileSync'
//   // | 'appendFileSync'
//   | 'existsSync'
//   | 'accessSync'
//   // | 'createReadStream'
//   // | 'createWriteStream'
//   // | 'watchFile'
//   // | 'unwatchFile'
//   // | 'watch'
//   // | 'rename'
//   // | 'ftruncate'
//   | 'truncate'
//   | 'chown'
//   | 'fchown'
//   | 'lchown'
//   | 'chmod'
//   | 'fchmod'
//   | 'lchmod'
//   | 'stat'
//   | 'lstat'
//   | 'fstat'
//   | 'link'
//   | 'symlink'
//   | 'readlink'
//   | 'realpath'
//   | 'unlink'
//   | 'rmdir'
//   | 'mkdir'
//   | 'readdir'
//   | 'close'
//   | 'open'
//   | 'utimes'
//   | 'futimes'
//   | 'fsync'
//   | 'write'
//   | 'read'
//   | 'readFile'
//   | 'writeFile'
//   | 'appendFile'
//   | 'exists'
//   | 'access';

// export type FS = Pick<typeof fs, FSMethods | 'promises'>;
// export interface IFS extends FS {
//   WriteStream: (typeof Writable) | (new (...args: any[]) => Writable);
//   ReadStream: (typeof Readable) | (new (...args: any[]) => Readable);
// }

export type IFS = typeof fs;

// export function testFS(x: IFS) {
//   console.log('here');
// }
