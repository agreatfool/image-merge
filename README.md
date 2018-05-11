image-merge-dir
===============

ImageMagick is required. Please install it first.

Mac user:
```
brew install imagemagick --with-webp
```

## Install
```
npm install image-merge-dir -g
```

## Usage
```
$ image-merge-dir -h

  Usage: index [options]

  image-merge-dir: merge images provided into one or several ones

  Options:

    -V, --version                       output the version number
    -m, --mode <FILES|DIR_ALL|DIR_SEP>  merge modes:
        FILES: merge all files(-f) into one file
        DIR_ALL: merge all files under dir(-d) into one file
        DIR_SEP: merge all files under dir(-d) into several(-n) files
    -f, --files <items>                 list of source image files path, e.g: /path/to/file1,/path/to/file2,/path/to/file3,...
    -d, --dir <string>                  source image files dir
    -n, --num <number>                  target files number shall be merged into
    -o, --output_dir <dir>              Output directory
    -N, --output_name <string>          output basename, optional, default is merged_image_
    -t, --output_type <JPG|PNG>         output file type, only JPG|PNG supported, default is JPG since much smaller
    -h, --help                          output usage information
```

## Examples
### Files into one
