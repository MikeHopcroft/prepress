# TODO List

* Top
  * Cleanup after code coverage
    * Remove unionfs dependency
    * Remove data/i.src.md
    * Remove src/apps/spawn_test.ts
    * README.md code coverage badge
  * Publish npm package
  * Rename tutorialBuilder
  * x Instructions to build from source
  * x Multiple sessions
  * xRegister commands
    * x Script error running globally installed version
  * x Import *
  * x Write documentation
  * Convert all paths and path operations to posix.
    * https://stackoverflow.com/questions/53799385/how-can-i-convert-a-windows-path-to-posix-path-using-node-path
    * somePathString.split(path.sep).join(path.posix.sep);
    * Is this necessary?
    * Is it a good idea?
  * DESIGN: what should the prepress return code be when a script fails?
  * Markdown parser tests?
  * x Remove ncp, @types/ncp dependencies
  * x Better testing of rename() function. Does it really do the nested folders correctly?
  * x Is existsSync() workaround still necessary?
  * x README.md build status badge
  * Mock filesystem for unit tests
    * x mockfs
    * x memfs
    * x monkey patching
    * Clean up memfs usage pattern
  * Unit tests
    * Reduce console spew
    * x Missing first arg
    * x Missing second arg
    * x Input not found
    * x Input not *.src.md
    * x Input: file, output: file
  * x BUG when second cmd line parameter is a filename, rather than a directory
  * x Better unit test coverage
  * Remove spawn_test.ts
  * Argument parser allows quoting - for spaces in prompt
  * Hang detection timeout
  * x Specify shell for spawn and interactive
  * README.md
  * tutorial.md
* Look at verbatim block in getLabyrinth.src.md
  * Why is this verbatim?
  * Is directive stripping the correct behavior
* Strip out non-printable characters
* Travis + badges
* NYC + badges
* Figure out how to specify spaces in prompt
  * Allow quoted strings and escaped quotes?
  * Escape sequence for \" and \n
* Prompt detection should fail
  * After too much time. Perhaps have a -timeout parameter.
  * After too many characters
* Bug
  * WHY_DOES_THIS_WORK[//]: # (spawn dir /w)
* Optional parameters for file, spawn, interactive, etc
  * Consider using minimist
    * What if spawn process arguments conflict?
    * x Is it possible to have one minimist per processor? Yes.
  * x Common parsing function
* Escaping arguments to file, spawn, repl, etc.
  * Spaces, backlashes
  * Consider using json
* Escaping ~~~ in code blocks
  * x ~~~yaml
  * x Detect codeblock as /^~~~~*/
  * Find sequence of three or more ~ not in the code block
  * Choose appropriate open/close sequence based on body contents (e.g body contains ~~~ so use ~~~~)
* README.md
* Figure out how to make a simpler executable command than
  * node build/src/apps/prepress.js
* Better error translation
  * Error: cannot lstat "documentation/src/getting_labyrinth.src.md".
* Better error handling in parser
  * Check number of arguments
* x processFile
  * Syntax
    * file <filename> [-n]
  * x Displays contents of a file
  * x Can add line numbers
* processSpawn
  * Syntax
    * spawn <prompt> <executable> <param>*
    * exec <prompt> <executable> <param>*
  * Specify whether to use shell.
    * Could have a different command name, instead of a parameter.
    * This would avoid conflict between command params and executable params.
  * Specify prompt.
  * Catch and report errors
  * Display stderr?
  * Allow multiple commands in same block. ???
  * Deal with forward and backwards slashes in spawn arguments
    * Needs to work on Windows and Linux
  * x Does not seem to emit header comment.
* processRepl
  * Syntax
    * interactive <prompt:%> <session:one> <exit:exit> <executable> <param>*
  * Rename repl mode to spawnInteractive or interactive?
  * Specify shell or interactive program
  * Specify prompt regex
  * Specify session
  * Specify exit command
  * Specify whether to display exit command - could exit automatically, and only show if it appears in the input block
  * Specity suppress welcome/prologue - could use prompt on first line, vs later line to specify
  * Need some way of ending interactive session - perhaps put command in header.
  * Need some way to combine multiple, named blocks into a single session
* . Pluggable block types
* tutorial_builder - rename?
* x Set up unit testing

