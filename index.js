/**
 * @file 拷贝需要zip 的静态文件
 * @date 2019/10/28
 * @author hpuhouzhiqiang@gmail.com
 */


const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const {URL} = require('url');

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

    this.config.zipFileName = `${this.config.offlineDir}/offline`;

    this.config.terminalid = opts.terminalid || 1;

    this.config.datatype = opts.datatype || 1;

    this.config.terminal_list = opts.terminal_list || [];

    this.config.compileVersion = version;

    // 是否将html url 模糊匹配
    this.config.fuzzyHtmlExtend = opts.fuzzyHtmlExtend || false;


    // 不缓存的文件和目录
    this.config.excludeFile = opts.excludeFile || [];

    // 需要缓存的目录 优先级高于 exclude
    this.config.includeFile = opts.includeFile || [];

    // 默认缓存文件的类型
    this.config.cacheFileTypes = opts.cacheFileTypes ? opts.cacheFileTypes.concat(defaultCacheFileTypes) : defaultCacheFileTypes;

    // zip文件缓存的目录名
    this.config.zipFileDir = opts.zipFileDir || 'offzip';

    // 将生成的离线包资源保存到output 的offzip 目录下
    this.config.desZipPath = `${opts.src}/${this.config.zipFileDir}`;

    // 设置diff.json的位置
    this.config.diffJsonDest = opts.diffJsonDest || `${this.config.desZipPath}`;

    this.config.module = opts.module || '';
    // 页面域名
    this.config.pageHost = opts.pageHost || '';

    // path url
    this.config.urlPath = opts.urlPath || '';

    // 替换多余的url 路径
    this.config.patchUrlPath = opts.patchUrlPath || '';

    // cdn域名
    this.config.cdnHost = opts.cdnHost || opts.pageHost || '';

    // cdn path
    this.config.cdnPath = opts.cdnPath || opts.urlPath || '';


    // 替换多余的 cdn 路径
    this.config.patchCdnPath = opts.patchCdnPath || '';

    // zipfile
    this.config.zipHost = opts.zipHost || opts.cdnHost || '';

    // zip path
    this.config.zipPath = opts.zipPath || this.config.cdnPath || '';

    // 编译产出目录
    this.config.src = opts.src || 'output';

    // 其它域名和host
    this.config.otherHost = opts.otherHost || {};

    this.config.zipConfig = opts.zipConfig || {};
    this.config.keepOffline = opts.keepOffline || false;

    // 防止 将多余的zip文件提交到git仓库
    this.config.deleteOffZip = opts.deleteOffZip || true;

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


// 删除offzip目录下多余的zip文件
ZipStaticWebpackPlugin.prototype.removeOffZipFile = function () {
    const cwd = process.cwd();
    const offZipPath = path.join(cwd, this.config.desZipPath);
    const zipFileList = glob.sync(`${offZipPath}/**/*.zip`);

    this.config.deleteOffZip && zipFileList.length && (
        zipFileList.forEach(path => {
            fs.removeSync(path);
        })
    );
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

    this.removeOffZipFile();

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

// 根据otherHost 设置多域名
ZipStaticWebpackPlugin.prototype.setMoreHost = function (_this, obj) {
    const otherPage = _.get(_this, 'config.otherHost.page', '');
    const otherCdn = _.get(_this, 'config.otherHost.cdn', '');
    const resultArr = [];

    if (Array.isArray(otherPage) || Array.isArray(otherCdn)) {
        for (let i = 0; i < otherPage.length; i++) {
            const deepCopyObj = _.cloneDeep(obj);
            const urlName = new URL(deepCopyObj.url);
            const itemPage = otherPage[i];
            const itemCdn = otherCdn[i];

            if (deepCopyObj.url.indexOf('.html') > -1 && otherPage) {
                urlName.host = itemPage;
            } else {
                itemCdn && (urlName.host = itemCdn);
            }

            _.set(deepCopyObj, 'url', urlName.href);
            resultArr.push(deepCopyObj);
        }

        return resultArr;
    } else {
        const deepCopyObj = _.cloneDeep(obj);
        const urlName = new URL(deepCopyObj.url);

        if (deepCopyObj.url.indexOf('.html') > -1 && otherPage) {
            urlName.host = otherPage;
        } else {
            urlName.host = otherCdn;
        }

        _.set(deepCopyObj, 'url', urlName.href);

        resultArr.push(deepCopyObj);
        return resultArr;
    }
};

// 将html文件名扩展 https://xxx/x/index.html 解析成 https://xxx/x/ 和 https://xxx/x 和 https://xxx/x/index.htm
ZipStaticWebpackPlugin.prototype.fuzzyHtmlExtendFn = function (jsonResult, obj) {
    if (obj.url.indexOf('index.html') < 0) {
        return;
    }

    const obj1 = _.cloneDeep(obj);
    const obj2 = _.cloneDeep(obj);
    const obj3 = _.cloneDeep(obj);

    obj1.url = obj1.url.substring(0, obj1.url.length - 1);
    obj2.url = obj2.url.substring(0, obj2.url.lastIndexOf('/') + 1);
    obj3.url = obj3.url.substring(0, obj3.url.lastIndexOf('/'));

    const tempArr = [obj1, obj2, obj3];
    const fuzzyHostArr = [];

    const otherPage = _.get(this, "config.otherHost.page", "");

    if(Array.isArray(otherPage)) {
        for (let i = 0; i < otherPage.length; i++) {
            const itemPage = otherPage[i];
            for (let m = 0; m < tempArr.length; m++) {
              const temp = _.cloneDeep(tempArr[m]);
              const urlString = new URL(temp.url);

              urlString.host = itemPage;
              temp.url = urlString.href;
              fuzzyHostArr.push(temp);
            }
        }
    } else {
        for (let m = 0; m < tempArr.length; m++) {
            const item = _.cloneDeep(tempArr[m]);
            const urlString = new URL(item.url);

            urlString.host = otherPage;
            item.url = urlString.href;
            fuzzyHostArr.push(item);
        }
    }
    jsonResult.resource = jsonResult.resource.concat(
      fuzzyHostArr.concat(tempArr)
    );
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

            const filePath = item.replace(`${offlineDir}/resource/`, '');

            _.set(obj, 'md5', md5File.sync(item));
            _.set(obj, 'file', filePath);
            _.set(obj, 'action', 1);

            // 1.默认是新增  2.是旧文件  做diff的时候使用的字段
            _.set(obj, 'type', 1);

            if (item.indexOf('.html') > 0) {
                const htmlPath = item.replace(path.join(`${offlineDir}/resource/`, this.config.patchUrlPath), this.config.urlPath);

                const pageURL = new URL(this.config.pageHost);

                pageURL.pathname = htmlPath;

                _.set(obj, 'url', pageURL.href);

                this.config.fuzzyHtmlExtend && this.fuzzyHtmlExtendFn(jsonResult, obj);
            } else {
                const staticPath = item.replace(path.join(`${offlineDir}/resource/`, this.config.patchCdnPath), this.config.cdnPath);
                const staticURL = (this.config.cdnHost) ? new URL(this.config.cdnHost) : new URL(this.config.pageHost);

                staticURL.pathname = staticPath;
                _.set(obj, 'url', staticURL.href);
            }
            jsonResult.resource.push(obj);

            // 设置多域名
            if (this.config.otherHost && JSON.stringify(this.config.otherHost) !== '{}') {
                jsonResult.resource = jsonResult.resource.concat(this.setMoreHost(this, obj, jsonResult));
            }
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
        const zipHostURL = new URL(that.config.zipHost);

        let zipPathURL = that.config.zipPath;

        if (zipPathURL.lastIndexOf('/') !== (zipPathURL.length - 1)) {
            zipPathURL += '/';
        }

        zipHostURL.pathname = `${zipPathURL}${that.config.zipFileDir}`;

        let zipDiffVersion = zipFileName.split('.')[2];

        if (list.includes(zipFileName)) {
            const zipVersion = zipFileName.indexOf('offline') >= 0 ? '-1' : version;

            let md5Hash = md5File.sync(zipFile);

            resultJson.diff_list.push({
                version: zipVersion === '-1' ? '-1' : zipDiffVersion,
                url: `${zipHostURL}/${zipFileName}`,
                md5: md5Hash
            });

            // 缓存全量包的信息
            if (zipVersion === '-1') {
                allMd5 = md5Hash;
                allUrl = `${zipHostURL}/${zipFileName}`;
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

    fs.outputJsonSync(path.join(cwd, that.config.src, `${that.config.zipFileDir}/bundle.json`), resultJson);

};

module.exports = ZipStaticWebpackPlugin;
