# Test

This is some text before a spawn block.

[//]: # (spawn dir /w)
~~~
$ dir /w
 Volume in drive D is Data
 Volume Serial Number is A442-8067

 Directory of D:\git\prepress

[.]                 [..]                .eslintignore       .eslintrc.json
.gitignore          .prettierrc.js      [.vscode]           [build]
[data]              LICENSE             [node_modules]      package-lock.json
package.json        README.md           [src]               TODO.md
tsconfig.json       
              10 File(s)        111,053 bytes
               7 Dir(s)  20,212,322,304 bytes free

~~~

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
