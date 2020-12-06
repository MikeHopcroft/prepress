///////////////////////////////////////////////////////////////////////////////
//
// Utility functions
//
///////////////////////////////////////////////////////////////////////////////
export function rightJustify(text: string, width: number) {
  if (text.length >= width) {
    return text;
  } else {
    const paddingWidth = width - text.length;
    const padding = new Array(paddingWidth + 1).join(' ');
    return padding + text;
  }
}

export function parseArgs(
  command: string,
  required: number,
  restAllowed: boolean,
  text: string
): [string[], string[]] {
  const args = text.split(/\s+/);
  if (args.length < required) {
    const message = `${command}: parameters missing (expected ${required}).`;
    throw new TypeError(message);
  }
  if (args.length > required && !restAllowed) {
    const message = `${command}: found extra parameters (expected ${required}).`;
    throw new TypeError(message);
  }

  return [args.slice(0, required), args.slice(required)];
}
