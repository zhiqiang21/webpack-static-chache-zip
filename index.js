/**
 * @file 拷贝需要zip 的静态文件
 * @date 2019/10/28
 * @author hpuhouzhiqiang@gmail.com
 */


const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');

const moment = require('moment');
const md5File = require('md5-file');
const _ = require('lodash');
const zipOfflineFile = require('./zip');
const diffMapObj = require('./diff');


const version = moment().format('YYYYMMDDHHmmss');
const pluginName = 'ZipStaticWebpackPlugin';


function ZipStaticWebpackPlugin(opts) {
    const defaultCacheFileTypes = ['js', 'html', 'css'];

    this.config = {};

    // 压缩文件的缓存目录
    this.config.offlineDir = opts.offlineDir || 'offline';

    this.config.zipFileName = `${this.config.offlineDir}/${opts.zipFileName || 'offline'}`;

    this.config.terminalid = opts.terminalid || 1;

    this.config.datatype = opts.datatype || 1;

    this.config.compileVersion = version;


    // 不缓存的文件和目录
    this.config.excludeFile = opts.excludeFile || [];

    // 需要缓存的目录 优先级高于 exclude
    this.config.includeFile = opts.includeFile || [];

    // 默认缓存文件的类型
    this.config.cacheFileTypes = opts.cacheFileTypes ? opts.cacheFileTypes.concat(defaultCacheFileTypes) : defaultCacheFileTypes;

    // 将生成的离线包资源保存到output 的offzip 目录下
    this.config.desZipPath = `${opts.src}/offzip`;
    this.config.module = opts.module || '';
    // 页面域名
    this.config.pageHost = opts.pageHost || '';
    // cdn域名
    this.config.cdnHost = opts.cdnHost || opts.pageHost || '';
    // path url
    this.config.urlPath = opts.urlPath || '';
    this.config.src = opts.src || 'output';
    this.config.zipConfig = opts.zipConfig || {};
    this.config.keepOffline = opts.keepOffline || false;
    this.config.beforeCopy = opts.beforeCopy || emptyFunc;
    this.config.afterCopy = opts.afterCopy || emptyFunc;
    this.config.beforeZip = opts.beforeZip || emptyFunc;
    this.config.afterZip = opts.afterZip || emptyFunc;
    this.fs = fs;
}

function emptyFunc() {

}

ZipStaticWebpackPlugin.prototype.apply = function (compiler) {

    if (!this.config.module) {
        console.log(chalk.red('[zip-static-plugin]  ' + 'module can\'t empty'));
        return;
    }

    // function callback(_this) {
    //     _this.mergeIncludeAndExclude(_this.config.includeFile, _this.config.excludeFile);

    //     _this.copyFiles();

    //     _this.createZipBundleInfor();

    //     const zipFileNameList = zipOfflineFile.zipFiles(_this);

    //     _this.info(`Zip file total: ${zipFileNameList.length} `);

    //     _this.createApiBundleInfor(zipFileNameList);
    // }

    // webpack v4+

    compiler.hooks && compiler.hooks.done && compiler.hooks.done.tap(pluginName, () => {
        this.mergeIncludeAndExclude(this.config.includeFile, this.config.excludeFile);

        this.copyFiles();

        this.createZipBundleInfor();

        const zipFileNameList = zipOfflineFile.zipFiles(this);

        this.info(`Zip file total: ${zipFileNameList.length}`);

        this.createApiBundleInfor(zipFileNameList);

        return;
    });


    compiler.plugin('done', () => {

        this.mergeIncludeAndExclude(this.config.includeFile, this.config.excludeFile);

        this.copyFiles();

        this.createZipBundleInfor();

        const zipFileNameList = zipOfflineFile.zipFiles(this);

        this.info(`Zip file total: ${zipFileNameList.length}`);

        this.createApiBundleInfor(zipFileNameList);
    });
};

ZipStaticWebpackPlugin.prototype.success = function (msg) {
    console.log(chalk.green('[zip-static-plugin]  ' + msg));
};

ZipStaticWebpackPlugin.prototype.info = function (msg) {
    console.log(chalk.cyan('[zip-static-plugin]  ' + msg));
};

ZipStaticWebpackPlugin.prototype.warn = function (msg) {
    console.log(chalk.yellow('[zip-static-plugin]  ' + msg));
};

ZipStaticWebpackPlugin.prototype.alert = function (msg) {
    console.log(chalk.red('[zip-static-plugin]  ' + msg));
};


/**
 * [copy files to offline folder]
 */
ZipStaticWebpackPlugin.prototype.copyFiles = function () {

    var beforeCopy = this.config.beforeCopy,
        afterCopy = this.config.afterCopy;


    beforeCopy.bind(this)();

    let cwd = process.cwd();
    const offleLineDir = path.join(cwd, this.config.offlineDir);

    fs.removeSync(offleLineDir);
    // fs.removeSync(path.join(cwd, this.config.zipFileName + '.zip'));

    const globCopyFiles = glob.sync(`${cwd}/${this.config.src}/**/*.*(${this.config.cacheFileTypes.join('|')})`);
    const needCopyFiles = this.deleteExcludeFile(globCopyFiles);

    needCopyFiles.forEach(item => {
        const destPath = item.replace(this.config.src, `${this.config.zipFileName}/resource`);

        if (fs.existsSync(item)) {
            fs.copySync(item, destPath);
        }
    });

    afterCopy.bind(this)();
};


// 合并 include 和 exclude  include 优先级高于 exclude
ZipStaticWebpackPlugin.prototype.mergeIncludeAndExclude = function (includeArr, excludeArr) {
    const Arr = [];

    excludeArr.forEach(item => {
        if (!includeArr.includes(item)) {
            Arr.push(item);
        }
    });

    this.config.excludeFile = Arr;

};

// 获取目录下所有文件的路径信息
ZipStaticWebpackPlugin.prototype.iterateFiles = function (folderPath, cb) {
    let files = glob.sync(path.resolve(folderPath, '**/*'));

    files = files.filter(item => {
        let fileInfo = fs.lstatSync(path.resolve(item));

        return fileInfo.isFile();
    });

    cb && cb.bind(this)(files);
};


ZipStaticWebpackPlugin.prototype.getFileType = function (path) {
    return path.substr(path.lastIndexOf('.'));
};


// 删除 不包含的目录和文件
ZipStaticWebpackPlugin.prototype.deleteExcludeFile = function (files) {
    const excludeFileArr = this.config.excludeFile;
    const includeFileArr = this.config.includeFile;

    let excludeArr = [];

    let includeArr = [];

    if (excludeFileArr.length === 0) {
        excludeArr = files;
    } else {
        files.forEach(item => {
            const contain = [];

            excludeFileArr.forEach(fi => {
                contain.push(item.indexOf(fi));
            });

            if (contain.every(item => item === -1)) {
                excludeArr.push(item);
            }
        });
    }

    if (includeFileArr.length === 0) {
        return excludeArr;
    }

    excludeArr.forEach(item => {
        const include = [];

        includeFileArr.forEach(path => {
            include.push(item.indexOf(path));
        });

        if (!include.every(item => item === -1)) {
            includeArr.push(item);
        }
    });


    return includeArr;
};

// 计算文件的md5值
ZipStaticWebpackPlugin.prototype.createMd5Hash = function (path) {

    // const buffer = fs.readFileSync(path);
    // const fsHash = crypto.createHash('md5');

    // fsHash.update(buffer);

    // return fsHash.digest('hex');

    return md5File.sync(path);

};


//  将zip包的信息写入bundle.json文件

ZipStaticWebpackPlugin.prototype.createZipBundleInfor = function () {
    const jsonResult = {};
    const cwd = process.cwd();
    const offlineDir = path.resolve(cwd, this.config.zipFileName);

    _.set(jsonResult, 'module', this.config.module);
    _.set(jsonResult, 'version', version);

    // type 离线包类型 1. 全量包  2.增量包
    _.set(jsonResult, 'type', 1);
    _.set(jsonResult, 'diffversion', []);
    _.set(jsonResult, 'resource', []);


    this.iterateFiles(this.config.zipFileName, function (files) {

        files.forEach(item => {
            const obj = {};
            const relativePath = item.replace(`${offlineDir}/resource/`, this.config.urlPath);
            const filePath = item.replace(`${offlineDir}/resource/`, '');

            _.set(obj, 'md5', this.createMd5Hash(item));

            if (item.indexOf('.html') > 0) {
                _.set(obj, 'url', `${this.config.pageHost}${relativePath}`);
            }

            if (this.config.cdnHost && item.indexOf('.html') < 0) {
                _.set(obj, 'url', `${this.config.cdnHost}${relativePath}`);
            } else {
                _.set(obj, 'url', `${this.config.pageHost}${relativePath}`);
            }

            _.set(obj, 'file', filePath);
            _.set(obj, 'action', 1);

            // 1.默认是新增  2.是旧文件  做diff的时候使用的字段
            _.set(obj, 'type', 1);

            jsonResult.resource.push(obj);
        });

        fs.outputJsonSync(`${offlineDir}/bundle.json`, jsonResult);

        diffMapObj.createDiffInfo(this, version, jsonResult);
    });
};

// 将打包的信息写入  api.budnle.json
ZipStaticWebpackPlugin.prototype.createApiBundleInfor = function (list) {
    const cwd = process.cwd();
    const resultJson = {};
    const offZipFileList = glob.sync(path.resolve(cwd, `${this.config.desZipPath}/**/*.zip`));

    _.set(resultJson, 'module', this.config.module);
    _.set(resultJson, 'terminal_id', this.config.terminalid);
    _.set(resultJson, 'data_type', this.config.datatype);
    _.set(resultJson, 'diff_list', []);


    offZipFileList.forEach(zipFile => {
        const zipFileName = zipFile.substring(zipFile.lastIndexOf('/') + 1);
        const zipCdnPath = `${this.config.cdnHost}${this.config.urlPath}offzip`;


        if (list.includes(zipFileName)) {
            const zipVersion = zipFileName.indexOf('offline') >= 0 ? '-1' : version;
            const offlineMd5 = this.createMd5Hash(zipFile);

            resultJson.diff_list.push({
                version: zipVersion,
                url: `${zipCdnPath}/${zipFileName}`,
                md5: offlineMd5
            });
        }

    });


    fs.outputJsonSync(`${cwd}/${this.config.src}/offzip/bundle.json`, resultJson);

};

module.exports = ZipStaticWebpackPlugin;
