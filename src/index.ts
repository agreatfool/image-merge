#!/usr/bin/env node

import * as LibFs from 'mz/fs';
import * as LibPath from 'path';

import * as program from 'commander';
import * as isImage from 'is-image';
import * as shell from 'shelljs';
import * as readdirSorted from 'readdir-sorted';

const pkg = require('../package.json');

const MERGE_MODES = ['FILES', 'DIR_ALL', 'DIR_SEP'];
const BASE_NAME = 'merged_image_';
const BASE_TYPES = ['JPG', 'PNG'];

program.version(pkg.version)
    .description('image-merge-dir: merge images provided into one or several ones')
    .option(
        `-m, --mode <${MERGE_MODES.join('|')}>`,
        'merge modes:\n' +
        '\tFILES: merge all files(-f) into one file\n' +
        '\tDIR_ALL: merge all files under dir(-d) into one file\n' +
        '\tDIR_SEP: merge all files under dir(-d) into several(-n) files'
    )
    .option('-f, --files <items>', 'list of source image files path, e.g: /path/to/file1,/path/to/file2,/path/to/file3,...', (files) => {
        return files.split(',');
    })
    .option('-d, --dir <string>', 'source image files dir')
    .option('-n, --num <number>', 'target files number shall be merged into', parseInt)
    .option('-o, --output_dir <dir>', 'Output directory')
    .option('-N, --output_name <string>', `output basename, optional, default is ${BASE_NAME}`)
    .option(`-t, --output_type <${BASE_TYPES.join('|')}>`, `output file type, only ${BASE_TYPES.join('|')} supported, default is ${BASE_TYPES[0]} since much smaller`)
    .parse(process.argv);

const ARGS_MODE = (program as any).mode === undefined ? undefined : (program as any).mode;
let ARGS_FILES = (program as any).files === undefined ? [] : (program as any).files;
const ARGS_DIR = (program as any).dir === undefined ? undefined : (program as any).dir;
const ARGS_NUM = (program as any).num === undefined ? undefined : (program as any).num;
const ARGS_OUTPUT_DIR = (program as any).output_dir === undefined ? undefined : (program as any).output_dir;
const ARGS_OUTPUT_NAME = (program as any).output_name === undefined ? BASE_NAME : (program as any).output_name;
const ARGS_OUTPUT_TYPE = (program as any).output_type === undefined ? BASE_TYPES[0] : (program as any).output_type;

class ImageMergeDir {

    public async run() {
        console.log('Merge starting ...');

        await this._validate();
        await this._process();
    }

    private async _validate() {
        console.log('Merge validating ...');

        if (!shell.which('convert')) {
            console.log('Command "convert" not found, you need to install "ImageMagick" first.\nOSX e.g: brew install imagemagick --with-webp');
            process.exit(1);
        }

        if (!ARGS_MODE) {
            console.log('-m is required!');
            process.exit(1);
        }
        if (MERGE_MODES.indexOf(ARGS_MODE) === -1) {
            console.log(`Invalid merge mode, please use one of: ${MERGE_MODES.join('|')}!`);
            process.exit(1);
        }

        if (!ARGS_OUTPUT_DIR || !(await LibFs.stat(ARGS_OUTPUT_DIR)).isDirectory()) {
            console.log('-o is required, and must be directory!');
            process.exit(1);
        }

        if (ARGS_MODE === 'FILES') {
            if (!ARGS_FILES) {
                console.log('-f is required when using "FILES" mode!');
                process.exit(1);
            }
            ARGS_FILES = ARGS_FILES.map((path: string) => {
                if (this._isPathRelative(path)) {
                    return LibPath.resolve(path);
                } else {
                    return path;
                }
            });
            for (let file of ARGS_FILES) {
                if (!(await this._validateImageFile(file))) {
                    console.log(`File ${file} is not image!`);
                    process.exit(1);
                }
            }
        }

        if (ARGS_MODE === 'DIR_ALL' || ARGS_MODE === 'DIR_SEP') {
            if (!ARGS_DIR) {
                console.log('-d is required when using "DIR_*" mode!');
                process.exit(1);
            }
            if (!(await LibFs.stat(ARGS_DIR)).isDirectory()) {
                console.log(`${ARGS_DIR} is not directory!`);
                process.exit(1);
            }
            if (ARGS_MODE === 'ARGS_MODE' && !ARGS_NUM) {
                console.log('-n is required when using "DIR_SEP" mode!');
                process.exit(1);
            }
        }

        if (BASE_TYPES.indexOf(ARGS_OUTPUT_TYPE.toUpperCase()) === -1) {
            console.log(`-t ${ARGS_OUTPUT_TYPE} is not supported, supported ones: ${BASE_TYPES.join('|')}`);
            process.exit(1);
        }
    }

    private async _process() {
        switch (ARGS_MODE) {
            case 'FILES':
                await this._processFiles();
                break;
            case 'DIR_ALL':
                await this._processDirAll();
                break;
            case 'DIR_SEP':
                await this._processDirSep();
                break;
            default:
                break;
        }
    }

    private async _processFiles() {
        this._mergeFiles(ARGS_FILES, this._genOutputFilePath(0));
    }

    private async _processDirAll() {
        const dirFiles = await readdirSorted(ARGS_DIR);
        let mergeTargets = [];

        for (const file of dirFiles) {
            const fullPath = LibPath.join(ARGS_DIR, file);
            if (await this._validateImageFile(fullPath)) {
                mergeTargets.push(fullPath);
            }
        }

        this._mergeFiles(mergeTargets, this._genOutputFilePath(0));
    }

    private async _processDirSep() {
        const dirFiles = await readdirSorted(ARGS_DIR);
        let mergeTargets = [];

        for (const file of dirFiles) {
            const fullPath = LibPath.join(ARGS_DIR, file);
            if (await this._validateImageFile(fullPath)) {
                mergeTargets.push(fullPath);
            }
        }

        const dividedTargets = this._divideArrayIntoPiece(mergeTargets, ARGS_NUM);

        let index = 0;
        for (const targets of dividedTargets) {
            this._mergeFiles(targets, this._genOutputFilePath(index));
            index++;
        }
    }

    private _mergeFiles(files: Array<string>, outputFile: string) {
        const command = `convert -append ${files.join(' ')} ${outputFile}`;

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
        const divided = [];
        const size = Math.ceil(arr.length / pieceCount);

        while (arr.length > 0) {
            divided.push(arr.splice(0, size));
        }

        return divided;
    }

}

new ImageMergeDir().run().then(_ => _).catch(_ => console.log(_));

process.on('uncaughtException', (error) => {
    console.error(`Process on uncaughtException error = ${error.stack}`);
});

process.on('unhandledRejection', (error) => {
    console.error(`Process on unhandledRejection error = ${error.stack}`);
});