# Test

This is some text before a spawn block.

Here is prepress

[//]: # (spawn node build\src\apps\prepress.js -h)
~~~
$ node build\src\apps\prepress.js -h

Tutorial Builder

  This utility uses a markdown file as a template for generating documentation  
  by rerunning commands inside of markdown code blocks.                         

Usage

  node prepress.js <input file or dir> [output file or dir] [...options] 

Options

  -d, --dryrun       Dry run: process files and print to console 
  -r, --recursive    Process recursive directory tree            
  -h, --help         Print help message                          


~~~


This is some text before a verbatim block.
~~~
line 1
line 2
line 3
~~~

This is some text before a warning block.

[//]: # (warning)
~~~
Warning text
~~~

This is xsome text before an included file

[//]: # (file data/file.txt)
~~~
// Sample file to include in code block

function a() {
  // test from included file
}

function b() {
  // test from included file
}

function c() {
  // test from included file
}
~~~
