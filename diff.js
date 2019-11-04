/**
 * @file 对zip包做difff
 * @date 2019/10/23
 * @author hpuhouzhiqiang@gmail.com
 */
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const shortid = require('shortid');


const cwd = process.cwd();


exports.createDiffInfo = function (akPlugin, newVersionNum, newVersionInfo) {
    const cwd = process.cwd();
    const diffPath = path.join(cwd, akPlugin.config.src, 'offzip/diff.json');

    fs.ensureFileSync(diffPath);

    const diffInfo = fs.readFileSync(diffPath, {encoding: 'utf8'});

    diffInfo || fs.writeJsonSync(diffPath, {});

    const diffInfoJson = fs.readJsonSync(diffPath);
    const diffVersionList = Object.keys(diffInfoJson);

    diffInfoJson[newVersionNum] = newVersionInfo;
    fs.outputJsonSync(diffPath, diffInfoJson);

    if (diffVersionList.length === 0) {
        return;
    }

    const floatVersion = diffVersionList.map(item => parseFloat(item));

    floatVersion.sort((a, b) => {
        return b - a;
    });

    // 只对5个版本做diff
    floatVersion.length > 5 && (floatVersion.length = 5);

    floatVersion.forEach(item => {
        versionDiff(akPlugin, newVersionInfo, diffInfoJson[item], item);
    });

};


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
            (element.url.indexOf('.html') >= 0) || (deleteArr.push(element));
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
    const diffBundlePath = path.join(cwd, 'offline', `diff.${shortId}.${nextV}/bundle.json`);

    copyBundleFile(akPlugin, shortId, currResource, nextV);
    fs.outputJsonSync(diffBundlePath, {
        'name': akPlugin.config.module,
        'version': akPlugin.config.compileVersion,
        // 1. 全量包  2.增量包
        'type': 2,
        'resource': currResource
    });

}


/**
 *
 *
 * @param {*} akPlugin
 * @param {*} diffId
 * @param {*} filesInfo
 * @param {*} nextV
 */
function copyBundleFile(akPlugin, diffId, filesInfo, nextV) {

    filesInfo.forEach(item => {
        const to = path.join(cwd, `offline/diff.${diffId}.${nextV}/resource/${item.file}`);
        const from = path.join(cwd, `${akPlugin.config.src}/${item.file}`);

        if (fs.existsSync(from) && item.type === 1) {
            fs.copySync(from, to);
        }
    });
}
