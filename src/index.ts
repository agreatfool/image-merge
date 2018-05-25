#!/usr/bin/env node

import * as LibFs from 'mz/fs';
import * as LibPath from 'path';

import * as program from 'commander';
import * as isImage from 'is-image';
import * as shell from 'shelljs';
import * as readdirSorted from 'readdir-sorted';

const pkg = require('../package.json');

const MERGE_MODES = ['ALL', 'SEP'];
const BASE_NAME = 'merged_image_';
const BASE_TYPES = ['JPG', 'PNG'];

program.version(pkg.version)
    .description('image-merge-dir: merge images provided into one or several ones')
    .option('-f, --source_files <items>', 'list of source image files path, e.g: /path/to/file1,/path/to/file2,/path/to/file3,...', (files) => {
        return files.split(',');
    })
    .option('-d, --source_dir <string>', 'source image files dir')
    .option(
        `-m, --output_mode <${MERGE_MODES.join('|')}>`,
        'merge modes:\n' +
        '\tALL: merge all source files into one file\n' +
        '\tSEP: merge all source files into several(-n) files'
    )
    .option('-n, --output_num <number>', 'how many files shall be merged into', parseInt)
    .option('-o, --output_dir <dir>', 'output directory')
    .option('-N, --output_name <string>', `output basename, optional, default is ${BASE_NAME}`)
    .option(`-t, --output_type <${BASE_TYPES.join('|')}>`, `output file type, only ${BASE_TYPES.join('|')} supported, default is ${BASE_TYPES[0]} since much smaller`)
    .option('-x, --output_grid_x_num <number>', 'output images into grid, this value controls the columns number', parseInt)
    .option('-y, --output_grid_y_num <number>', 'output images into grid, this value controls the lines number', parseInt)
    .option('-l, --locale <string>', 'locale by which file list read from dir sorted, default is en, see https://www.npmjs.com/package/readdir-sorted')
    .parse(process.argv);

let ARGS_SOURCE_FILES = (program as any).source_files === undefined ? [] : (program as any).source_files;
const ARGS_SOURCE_DIR = (program as any).source_dir === undefined ? undefined : (program as any).source_dir;
const ARGS_OUTPUT_MODE = (program as any).output_mode === undefined ? undefined : (program as any).output_mode;
const ARGS_OUTPUT_NUM = (program as any).output_num === undefined ? undefined : (program as any).output_num;
const ARGS_OUTPUT_DIR = (program as any).output_dir === undefined ? undefined : (program as any).output_dir;
const ARGS_OUTPUT_NAME = !(program as any).output_name ? BASE_NAME : (program as any).output_name;
const ARGS_OUTPUT_TYPE = (program as any).output_type === undefined ? BASE_TYPES[0] : (program as any).output_type;
const ARGS_OUTPUT_GRID_X_NUM = (program as any).output_grid_x_num === undefined ? undefined : (program as any).output_grid_x_num;
const ARGS_OUTPUT_GRID_Y_NUM = (program as any).output_grid_y_num === undefined ? undefined : (program as any).output_grid_y_num;
const ARGS_LOCALE = (program as any).locale === undefined ? 'en' : (program as any).locale;

let GRID_TYPE = ''; // comes from ARGS_OUTPUT_GRID_X_NUM && ARGS_OUTPUT_GRID_Y_NUM => x1 | 4x | 2x3 ...

/**
 * 参数列表应该按输入和输出分开：
 * 输入参数需要添加文件夹内，起始文件位置，文件数量，来自由组织源图片组
 *
 * 重新制作参数验证部分，修改后的输入参数的互斥就完全改变了
 *
 * 添加grid图片功能
 */

class ImageMergeDir {

    public async run() {
        console.log('Merge starting ...');

        await this._validate();
        await this._process();
    }

    private async _validate() {
        console.log('Merge validating ...');

        if (!shell.which('convert') || !shell.which('montage')) {
            console.log('Command "convert | montage" not found, you need to install "ImageMagick" first.\nOSX e.g: brew install imagemagick --with-webp');
            process.exit(1);
        }

        // validate ARGS_SOURCE_FILES && ARGS_SOURCE_DIR
        if (ARGS_SOURCE_FILES.length === 0 && !ARGS_SOURCE_DIR) {
            console.log('Source files required, please provide -f or -d option');
            process.exit(1);
        } else if (ARGS_SOURCE_FILES.length !== 0 && ARGS_SOURCE_DIR) {
            console.log('Only one source could be provided, -f or -d');
            process.exit(1);
        } else if (ARGS_SOURCE_FILES.length !== 0) {
            ARGS_SOURCE_FILES = ARGS_SOURCE_FILES.map((path: string) => {
                if (this._isPathRelative(path)) {
                    return LibPath.resolve(path);
                } else {
                    return path;
                }
            });
            for (let file of ARGS_SOURCE_FILES) {
                if (!(await this._validateImageFile(file))) {
                    console.log(`File ${file} is not image!`);
                    process.exit(1);
                }
            }
        } else if (ARGS_SOURCE_DIR) {
            if (!(await LibFs.stat(ARGS_SOURCE_DIR)).isDirectory()) {
                console.log(`${ARGS_SOURCE_DIR} is not directory!`);
                process.exit(1);
            }
        }

        // validate ARGS_OUTPUT_MODE && ARGS_OUTPUT_NUM
        if (!ARGS_OUTPUT_MODE) {
            console.log('Output mode is required, please provide -m');
            process.exit(1);
        } else if (ARGS_OUTPUT_MODE && MERGE_MODES.indexOf(ARGS_OUTPUT_MODE) === -1) {
            console.log(`Invalid output mode, please use one of: ${MERGE_MODES.join('|')}!`);
            process.exit(1);
        } else if (ARGS_OUTPUT_MODE === 'SEP' && !ARGS_OUTPUT_NUM) {
            console.log('Output num is required when using "SEP" mode, please provide -n');
            process.exit(1);
        }

        // validate ARGS_OUTPUT_DIR
        if (!ARGS_OUTPUT_DIR || !(await LibFs.stat(ARGS_OUTPUT_DIR)).isDirectory()) {
            console.log('Output dir is required, and must be directory, please provide -o');
            process.exit(1);
        }

        // validate ARGS_OUTPUT_TYPE
        if (ARGS_OUTPUT_TYPE && BASE_TYPES.indexOf(ARGS_OUTPUT_TYPE.toUpperCase()) === -1) {
            console.log(`Output type ${ARGS_OUTPUT_TYPE} is not supported, supported ones: ${BASE_TYPES.join('|')}`);
            process.exit(1);
        }

        // validate ARGS_OUTPUT_GRID_?_NUM && build GRID_TYPE
        if (ARGS_OUTPUT_GRID_X_NUM && !ARGS_OUTPUT_GRID_Y_NUM) {
            GRID_TYPE = `${ARGS_OUTPUT_GRID_X_NUM}x`;
        } else if (!ARGS_OUTPUT_GRID_X_NUM && ARGS_OUTPUT_GRID_Y_NUM) {
            GRID_TYPE = `x${ARGS_OUTPUT_GRID_Y_NUM}`;
        } else if (ARGS_OUTPUT_GRID_X_NUM && ARGS_OUTPUT_GRID_Y_NUM) {
            GRID_TYPE = `${ARGS_OUTPUT_GRID_X_NUM}x${ARGS_OUTPUT_GRID_Y_NUM}`;
        }
    }

    private async _process() {
        if (ARGS_SOURCE_FILES.length !== 0) {
            await this._processFiles();
        } else {
            await this._processDir();
        }
    }

    private async _processFiles() {
        this._mergeFiles(ARGS_SOURCE_FILES.map(f => `"${f}"`), this._genOutputFilePath(0));
    }

    private async _processDir() {
        switch (ARGS_OUTPUT_MODE) {
            case MERGE_MODES[0]: // ALL
                await this._processDirAll();
                break;
            case MERGE_MODES[1]: // SEP
                await this._processDirSep();
                break;
            default:
                break;
        }
    }

    private async _processDirAll() {
        const dirFiles = await readdirSorted(ARGS_SOURCE_DIR, {
            locale: ARGS_LOCALE,
            numeric: true
        });
        let mergeTargets = [];

        for (const file of dirFiles) {
            const fullPath = LibPath.join(ARGS_SOURCE_DIR, file);
            if (await this._validateImageFile(fullPath)) {
                mergeTargets.push(fullPath);
            }
        }

        this._mergeFiles(mergeTargets.map(f => `"${f}"`), this._genOutputFilePath(0));
    }

    private async _processDirSep() {
        const dirFiles = await readdirSorted(ARGS_SOURCE_DIR, {
            locale: ARGS_LOCALE,
            numeric: true
        });
        let mergeTargets = [];

        for (const file of dirFiles) {
            const fullPath = LibPath.join(ARGS_SOURCE_DIR, file);
            if (await this._validateImageFile(fullPath)) {
                mergeTargets.push(fullPath);
            }
        }

        const dividedTargets = this._divideArrayIntoPiece(mergeTargets, ARGS_OUTPUT_NUM);

        let index = 0;
        for (const targets of dividedTargets) {
            this._mergeFiles(targets.map(f => `"${f}"`), this._genOutputFilePath(index));
            index++;
        }
    }

    private _mergeFiles(files: Array<string>, outputFile: string) {
        let command = '';

        if (GRID_TYPE !== '') {
            command = `montage -tile ${GRID_TYPE} -geometry +2+2 ${files.join(' ')} ${outputFile}`;
        } else {
            command = `convert -append ${files.join(' ')} ${outputFile}`;
        }

        console.log(`Merge images with command: ${command}`);

        const code = shell.exec(command).code;

        if (code !== 0) {
            console.log(`Error in merging images, code: ${code}`);
            process.exit(code);
        }
    }

    private async _validateImageFile(filePath: string) {
        return (await LibFs.stat(filePath)).isFile() && isImage(filePath);
    }

    private _genOutputFilePath(num: number) {
        return LibPath.join(ARGS_OUTPUT_DIR, `${ARGS_OUTPUT_NAME}${num}.${ARGS_OUTPUT_TYPE.toLowerCase()}`);
    }

    private _isPathRelative(path: string) {
        if (!path) {
            return false;
        }
        return path.charAt(0) !== '/';
    }

    private _divideArrayIntoPiece(arr: Array<string>, pieceCount: number) {
        const listlen = arr.length;
        const partlen = Math.floor(listlen / pieceCount);
        const partrem = listlen % pieceCount;

        let partition = [];
        let mark = 0;
        for(let px = 0; px < pieceCount; px ++) {
            let incr = (px < partrem) ? partlen + 1 : partlen;
            partition[px] = arr.slice(mark, mark + incr);
            mark += incr;
        }
        return partition;
    }

}

new ImageMergeDir().run().then(_ => _).catch(_ => console.log(_));

process.on('uncaughtException', (error) => {
    console.error(`Process on uncaughtException error = ${error.stack}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`Process on unhandledRejection error = ${error.stack}`);
});