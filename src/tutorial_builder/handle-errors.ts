// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeError(e: any) {
  // console.log('************* Error ****************');
  // console.log(JSON.stringify(e, null, 4).slice(0,5000));

  let message: string;

  if (e.name === 'YAMLException') {
    message = `invalid YAML - ${e.reason}`;
  } else if (e.name === 'YAML Validation Error') {
    message = 'YAML does not conform to schema';
  } else {
    switch (e.code) {
      case 'ENOENT':
        message = `cannot find "${e.path}".`;
        break;
      case 'EISDIR':
        message = 'directory found when file was expected.';
        break;
      default:
        message = e.message || 'unknown error';
    }
  }

  console.log(`Error: ${message}`);
}

export function printErrorMessage(message: string) {
  console.log(' ');
  console.log(message);
  console.log(' ');
  console.log('Use the -h flag for help.');
  console.log(' ');
  console.log('Aborting');
  console.log(' ');

  return false;
}
