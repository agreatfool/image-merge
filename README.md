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
  
      -V, --version                     output the version number
      -f, --source_files <items>        list of source image files path, e.g: /path/to/file1,/path/to/file2,/path/to/file3,...
      -d, --source_dir <string>         source image files dir
      -m, --output_mode <ALL|SEP>       merge modes:
          ALL: merge all source files into one file
          SEP: merge all source files into several(-n) files
      -n, --output_num <number>         how many files shall be merged into
      -o, --output_dir <dir>            output directory
      -N, --output_name <string>        output basename, optional, default is merged_image_
      -t, --output_type <JPG|PNG>       output file type, only JPG|PNG supported, default is JPG since much smaller
      -x, --output_grid_x_num <number>  output images into grid, this value controls the columns number
      -y, --output_grid_y_num <number>  output images into grid, this value controls the lines number
      -l, --locale <string>             locale by which file list read from dir sorted, default is en, see https://www.npmjs.com/package/readdir-sorted
      -h, --help                        output usage information

```

## Examples
### Files into one
```
# merge test/a.jpg & test/b.jpg into merged_files_0.png and put under current working dir
$ image-merge-dir -f test/a.jpg,test/b.jpg -m ALL -o ./ -N merged_files_ -t PNG
```

### Dir files into one
```
# merge test/*.jpg|png|... into merged_0.jpg and put under current working dir
$ image-merge-dir -d test -m ALL -o ./ -N merged_ -t jpg
```

### Dir files into several ones
```
# merge test/*.jpg|png|... into 3 files: merged_0..2.jpg and put under current working dir
$ image-merge-dir -d test -m SEP -o ./ -N merged_ -t jpg -n 3
```

### Dir files into several grid files
```
# merge test/*.jpg|png|... into 4 files which have 3 columns: grid_0..3.jpg and put under current working dir
$ image-merge-dir -d test -m SEP -o ./ -N grid_ -t JPG -n 4 -x 3
``` 