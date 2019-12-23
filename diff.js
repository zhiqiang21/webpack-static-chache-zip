/**
 * @file 对zip包做difff
 * @date 2019/10/23
 * @author hpuhouzhiqiang@gmail.com
 */
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const shortid = require('shortid');
const _objectSort = require('./sortObjKeys');


const cwd = process.cwd();


exports.createDiffInfo = function (akPlugin, newVersionNum, newVersionInfo) {
    const cwd = process.cwd();
    const diffPath = path.join(cwd, akPlugin.config.diffJsonDest, `diff.json`);

    fs.ensureFileSync(diffPath);

    const diffInfo = fs.readFileSync(diffPath, {encoding: 'utf8'});

    diffInfo || fs.writeJsonSync(diffPath, {});

    const diffInfoJson = fs.readJsonSync(diffPath);
    const diffVersionList = _objectSort.sortObjKeys(diffInfoJson);

    diffInfoJson[newVersionNum] = newVersionInfo;

    akPlugin.config._diffInfoJson = diffInfoJson;
    akPlugin.config._diffPath = diffPath;

    if (diffVersionList.length === 0) {
        // 如果没有要发生diff的版本直接写入当前编译信息，编译结束
        writeDiffInfo(akPlugin.config._diffInfoJson, akPlugin.config._diffPath);

        return;
    }

    diffVersionList.forEach(item => {
        versionDiff(akPlugin, newVersionInfo, diffInfoJson[item], item);
    });

};


/**
 * 将diff信息写入diff.json 并且只保留最多5个版本的diff信息
 *
 * @param {*} info 写入的信息
 * @param {*} path 写入json文件的路径
 */
function writeDiffInfo(info, path) {
    const infoKeysArr = _objectSort.sortObjKeys(info);
    const resultInfo = {};

    if (infoKeysArr.length <= 5) {
        fs.outputJsonSync(path, info);
    } else {

        // 这里使用for 是为了清理之前diff文件信息
        // 正常情况使用 delete info[infoKeysArr[5]] 就可以达到目的
        for (let i = 0; i < 5; i++) {
            const element = infoKeysArr[i];

            resultInfo[element] = info[element];
        }

        fs.outputJsonSync(path, resultInfo);
    }
}


/**
 * 对两个版本做diff
 * @param {*} akPlugin
 * @param {*} current 当前最新的版本信息
 * @param {*} next  需要做diff的版本信息
 * @param {8} nextV 需要做diff的版本号
 */
function versionDiff(akPlugin, current, next, nextV) {
    const currResource = _.get(current, 'resource', []);
    const nextResource = _.get(next, 'resource', []);
    const currFileMd5Arr = [];
    const deleteArr = [];

    if (currResource.length === 0) {
        return;
    }
    if (nextResource.length === 0) {
        return;
    }

    for (let i = 0; i < currResource.length; i++) {
        const curr = currResource[i];

        currFileMd5Arr.push(curr.md5);

        for (let m = 0; m < nextResource.length; m++) {
            const next = nextResource[m];

            if (curr.md5 === next.md5) {
                curr.type = 2;
            }
        }
    }

    // 找出两个版本差 需要删除的文件做标记
    for (let n = 0; n < nextResource.length; n++) {
        const element = nextResource[n];

        if (!currFileMd5Arr.includes(element.md5)) {
            element.action = 2;

            // 需要删除的文件也不需要拷贝到zip目录
            element.type = 2;

            // 过滤掉html旧文件信息，防止客户端删除旧文件时将新文件也删除
            // /^http[s]?:\/\/[\s\S]*\.(js|css)$/ 只匹配js 和css文件
            // (element.url.indexOf('.html') >= 0) || (deleteArr.push(element));
            if (/^http[s]?:\/\/[\s\S]*\.(js|css)$/.test(element.url)) {
                deleteArr.push(element)
            }
        }
    }

    createBundleFile(akPlugin, currResource.concat(deleteArr), nextV);
}

/**
 *
 * @param {*} akPlugin
 * @param {*} currResource
 * @param {*} nextV
 */
function createBundleFile(akPlugin, currResource, nextV) {
    const shortId = shortid.generate();
    const diffBundlePath = path.join(cwd, akPlugin.config.offlineDir, `diff.${shortId}.${nextV}/bundle.json`);

    const copyFileCount =  copyBundleFile(akPlugin, shortId, currResource, nextV);

    // 如果文件没有发生变化则不生成diff包和zip文件，也不对diff.json文件信息进行修改
    if (copyFileCount) {
        writeDiffInfo(akPlugin.config._diffInfoJson, akPlugin.config._diffPath);

        fs.outputJsonSync(diffBundlePath, {
            'name': akPlugin.config.module,
            'version': akPlugin.config.compileVersion,
            // 1. 全量包  2.增量包
            'type': 2,
            'resource': currResource
        });
    }
}


/**
 *
 *
 * @param {*} akPlugin
 * @param {*} diffId
 * @param {*} filesInfo
 * @param {*} nextV
 * @return {Array} 拷贝文件的个数
 */
function copyBundleFile(akPlugin, diffId, filesInfo, nextV) {

    let copyFileCount = 0;

    filesInfo.forEach(item => {
        const to = path.join(cwd, `${akPlugin.config.offlineDir}/diff.${diffId}.${nextV}/resource/${item.file}`);
        const from = path.join(cwd, `${akPlugin.config.src}/${item.file}`);

        if (fs.existsSync(from) && item.type === 1) {
            fs.copySync(from, to);
            copyFileCount += 1;
        }
    });

    return copyFileCount;
}
