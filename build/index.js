#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LibFs = require("mz/fs");
const LibPath = require("path");
const program = require("commander");
const isImage = require("is-image");
const shell = require("shelljs");
const readdirSorted = require("readdir-sorted");
const pkg = require('../package.json');
const MERGE_MODES = ['FILES', 'DIR_ALL', 'DIR_SEP'];
const BASE_NAME = 'merged_image_';
const BASE_TYPES = ['JPG', 'PNG'];
program.version(pkg.version)
    .description('image-merge-dir: merge images provided into one or several ones')
    .option(`-m, --mode <${MERGE_MODES.join('|')}>`, 'merge modes:\n' +
    '\tFILES: merge all files(-f) into one file\n' +
    '\tDIR_ALL: merge all files under dir(-d) into one file\n' +
    '\tDIR_SEP: merge all files under dir(-d) into several(-n) files')
    .option('-f, --files <items>', 'list of source image files path, e.g: /path/to/file1,/path/to/file2,/path/to/file3,...', (files) => {
    return files.split(',');
})
    .option('-d, --dir <string>', 'source image files dir')
    .option('-n, --num <number>', 'target files number shall be merged into', parseInt)
    .option('-l, --locale <string>', 'locale by which file list read from dir sorted, default is en, see https://www.npmjs.com/package/readdir-sorted')
    .option('-o, --output_dir <dir>', 'Output directory')
    .option('-N, --output_name <string>', `output basename, optional, default is ${BASE_NAME}`)
    .option(`-t, --output_type <${BASE_TYPES.join('|')}>`, `output file type, only ${BASE_TYPES.join('|')} supported, default is ${BASE_TYPES[0]} since much smaller`)
    .parse(process.argv);
const ARGS_MODE = program.mode === undefined ? undefined : program.mode;
let ARGS_FILES = program.files === undefined ? [] : program.files;
const ARGS_DIR = program.dir === undefined ? undefined : program.dir;
const ARGS_NUM = program.num === undefined ? undefined : program.num;
const ARGS_LOCALE = program.locale === undefined ? 'en' : program.locale;
const ARGS_OUTPUT_DIR = program.output_dir === undefined ? undefined : program.output_dir;
const ARGS_OUTPUT_NAME = program.output_name === undefined ? BASE_NAME : program.output_name;
const ARGS_OUTPUT_TYPE = program.output_type === undefined ? BASE_TYPES[0] : program.output_type;
class ImageMergeDir {
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Merge starting ...');
            yield this._validate();
            yield this._process();
        });
    }
    _validate() {
        return __awaiter(this, void 0, void 0, function* () {
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
            if (!ARGS_OUTPUT_DIR || !(yield LibFs.stat(ARGS_OUTPUT_DIR)).isDirectory()) {
                console.log('-o is required, and must be directory!');
                process.exit(1);
            }
            if (ARGS_MODE === 'FILES') {
                if (!ARGS_FILES) {
                    console.log('-f is required when using "FILES" mode!');
                    process.exit(1);
                }
                ARGS_FILES = ARGS_FILES.map((path) => {
                    if (this._isPathRelative(path)) {
                        return LibPath.resolve(path);
                    }
                    else {
                        return path;
                    }
                });
                for (let file of ARGS_FILES) {
                    if (!(yield this._validateImageFile(file))) {
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
                if (!(yield LibFs.stat(ARGS_DIR)).isDirectory()) {
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
        });
    }
    _process() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (ARGS_MODE) {
                case 'FILES':
                    yield this._processFiles();
                    break;
                case 'DIR_ALL':
                    yield this._processDirAll();
                    break;
                case 'DIR_SEP':
                    yield this._processDirSep();
                    break;
                default:
                    break;
            }
        });
    }
    _processFiles() {
        return __awaiter(this, void 0, void 0, function* () {
            this._mergeFiles(ARGS_FILES.map(f => `"${f}"`), this._genOutputFilePath(0));
        });
    }
    _processDirAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const dirFiles = yield readdirSorted(ARGS_DIR, {
                locale: ARGS_LOCALE,
                numeric: true
            });
            let mergeTargets = [];
            for (const file of dirFiles) {
                const fullPath = LibPath.join(ARGS_DIR, file);
                if (yield this._validateImageFile(fullPath)) {
                    mergeTargets.push(fullPath);
                }
            }
            this._mergeFiles(mergeTargets.map(f => `"${f}"`), this._genOutputFilePath(0));
        });
    }
    _processDirSep() {
        return __awaiter(this, void 0, void 0, function* () {
            const dirFiles = yield readdirSorted(ARGS_DIR, {
                locale: ARGS_LOCALE,
                numeric: true
            });
            let mergeTargets = [];
            for (const file of dirFiles) {
                const fullPath = LibPath.join(ARGS_DIR, file);
                if (yield this._validateImageFile(fullPath)) {
                    mergeTargets.push(fullPath);
                }
            }
            const dividedTargets = this._divideArrayIntoPiece(mergeTargets, ARGS_NUM);
            let index = 0;
            for (const targets of dividedTargets) {
                this._mergeFiles(targets.map(f => `"${f}"`), this._genOutputFilePath(index));
                index++;
            }
        });
    }
    _mergeFiles(files, outputFile) {
        const command = `convert -append ${files.join(' ')} ${outputFile}`;
        console.log(`Merge images with command: ${command}`);
        const code = shell.exec(command).code;
        if (code !== 0) {
            console.log(`Error in merging images, code: ${code}`);
            process.exit(code);
        }
    }
    _validateImageFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield LibFs.stat(filePath)).isFile() && isImage(filePath);
        });
    }
    _genOutputFilePath(num) {
        return LibPath.join(ARGS_OUTPUT_DIR, `${ARGS_OUTPUT_NAME}${num}.${ARGS_OUTPUT_TYPE.toLowerCase()}`);
    }
    _isPathRelative(path) {
        if (!path) {
            return false;
        }
        return path.charAt(0) !== '/';
    }
    _divideArrayIntoPiece(arr, pieceCount) {
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
//# sourceMappingURL=index.js.map