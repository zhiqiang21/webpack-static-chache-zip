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

    this.config.terminal_list = opts.terminal_list || [];

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

    // path url
    this.config.urlPath = opts.urlPath || '';

    // cdn域名
    this.config.cdnHost = opts.cdnHost || opts.pageHost || '';

    // cdn path
    this.config.cdnPath = opts.cdnPath || opts.urlPath || '';

    // zipfile
    this.config.zipHost = opts.zipHost || opts.cdnHost || '';

    //zip path
    this.config.zipPath = opts.zipPath || opts.cdnPath || '';

    //编译产出目录
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

    const pluginCallBack = () => {
        this.mergeIncludeAndExclude(this.config.includeFile, this.config.excludeFile);

        this.copyFiles();

        this.createZipBundleInfor();

        zipOfflineFile.zipFiles(this, this.createApiBundleInfor);

    };

    if (compiler.hooks && compiler.hooks.done) {
    // webpack v4+
        compiler.hooks && compiler.hooks.done && compiler.hooks.done.tap(pluginName, pluginCallBack);
    } else {
    // webpack v2
        compiler.plugin('done', pluginCallBack);
    }
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
        const destPath = item.replace(this.config.src, path.join(this.config.zipFileName, 'resource'));

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


// 获取文件类型
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

//  将zip包的信息写入bundle.json文件
ZipStaticWebpackPlugin.prototype.createZipBundleInfor = function () {
    const jsonResult = {};
    const cwd = process.cwd();
    const offlineDir = path.resolve(cwd, this.config.zipFileName);

    _.set(jsonResult, 'name', this.config.module);
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

            _.set(obj, 'md5', md5File.sync(item));

            if (item.indexOf('.html') > 0) {
                _.set(obj, 'url', path.join(this.config.pageHost, relativePath));
            }

            if (this.config.cdnHost && item.indexOf('.html') < 0) {
                _.set(obj, 'url', path.join(this.config.cdnHost, relativePath));
            } else {
                _.set(obj, 'url', path.join(this.config.pageHost, relativePath));
            }

            _.set(obj, 'file', filePath);
            _.set(obj, 'action', 1);

            // 1.默认是新增  2.是旧文件  做diff的时候使用的字段
            _.set(obj, 'type', 1);

            jsonResult.resource.push(obj);
        });

        fs.outputJsonSync(path.join(offlineDir, 'bundle.json'), jsonResult);

        diffMapObj.createDiffInfo(this, version, jsonResult);
    });
};

// 将打包的信息写入  api.budnle.json
ZipStaticWebpackPlugin.prototype.createApiBundleInfor = function (list, that) {
    const cwd = process.cwd();
    const resultJson = {};
    const offZipFileList = glob.sync(path.resolve(cwd, `${that.config.desZipPath}/**/*.zip`));

    _.set(resultJson, 'module', that.config.module);
    _.set(resultJson, 'terminal_id', that.config.terminalid);
    _.set(resultJson, 'terminal_list', that.config.terminal_list);
    _.set(resultJson, 'version', version);
    _.set(resultJson, 'data_type', that.config.datatype);
    _.set(resultJson, 'diff_list', []);

    let allMd5 = '';

    let allUrl = '';

    offZipFileList.forEach(zipFile => {
        const zipFileName = zipFile.substring(zipFile.lastIndexOf('/') + 1);
        const zipCdnPath = path.join(that.config.zipHost, that.config.zipPath, 'offzip')

        let zipDiffVersion = zipFileName.split('.')[2];

        if (list.includes(zipFileName)) {
            const zipVersion = zipFileName.indexOf('offline') >= 0 ? '-1' : version;

            let md5Hash = md5File.sync(zipFile);

            resultJson.diff_list.push({
                version: zipVersion === '-1' ? '-1' : zipDiffVersion,
                url: `${zipCdnPath}/${zipFileName}`,
                md5: md5Hash
            });

            // 缓存全量包的信息
            if (zipVersion === '-1') {
                allMd5 = md5Hash;
                allUrl = `${zipCdnPath}/${zipFileName}`;
            }
        }

        // 如果当前只有一个offline版本将 -1版本和当前最新的版本都设置为全量
        if (list.length === 1) {
            resultJson.diff_list.push({
                version: version,
                url: allUrl,
                md5: allMd5
            });
        }
    });

    fs.outputJsonSync(path.join(cwd, that.config.src, 'offzip/bundle.json'), resultJson);

};

module.exports = ZipStaticWebpackPlugin;
