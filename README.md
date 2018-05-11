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
```
# merge test/a.jpg & test/b.jpg into merged_files_0.png and put under current working dir
$ image-merge-dir -m FILES -f test/a.jpg,test/b.jpg -o ./ -N merged_files_ -t PNG
```

### Dir files into one
```
# merge test/*.jpg|png|... into merged_0.jpg and put under current working dir
$ image-merge-dir -m DIR_ALL -d test -o ./ -N merged_ -t jpg
```

### Dir files into several ones
```
# merge test/*.jpg|png|... into 3 files: merged_0..2.jpg and put under current working dir
$ image-merge-dir -m DIR_SEP -d test -o ./ -N merged_ -t jpg -n 3
```