# TODO List

* Set up unit testing
* Escaping ~~~ in code blocks
  * ~~~yaml
  * Detect codeblock as /^~~~~*/
  * Find sequence of three or more ~ not in the code block
* README.md
* Better error translation
  * Error: cannot lstat "documentation/src/getting_labyrinth.src.md".
* Better error handling in parser
  * Check number of arguments
* Escaping arguments to file, spawn, repl, etc.
  * Spaces, backlashes
  * Consider using json
* x processFile
  * x Displays contents of a file
  * x Can add line numbers
* processSpawn
  * User should be able to specify whether to use shell.
  * User should be able to specify prompt.
  * Escape ~~~ in ostream.
  * Allow multiple commands in same block.
  * Does not seem to emit header comment.
  * Catch and report errors
  * Deal with forward and backwards slashes in spawn arguments
    * Needs to work on Windows and Linux
* processRepl
  * Rename repl mode to spawnInteractive or interactive?
  * Should be able to use shell or interactive program
  * Should be able to specify prompt regex.
  * Need some way of ending interactive session - perhaps put command in header.
  * Need some way to combine multiple, named blocks into a single session
* Pluggable block types
* tutorial_builder - rename?
* Figure out how to make a simpler executable command than
  * node build/src/apps/prepress.js

