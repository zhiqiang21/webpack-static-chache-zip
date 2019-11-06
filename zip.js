/**
 * @file 对文件做zip操作
 * @date 2019/10/26
 * @author hpuhouzhiqiang@gmail.com
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const klawSync = require('klaw-sync');
const getPathDir = require('./getDir');


exports.zipFiles = function (akPlugin, afterZipFn) {

    const beforeZip = akPlugin.config.beforeZip;
    const afterZip = akPlugin.config.afterZip;
    const onlineZipPath = `${akPlugin.config.desZipPath}`;
    const zipFileNameList = [];

    fs.ensureDirSync(onlineZipPath);

    const needZipDirList = getPathDir.getDir(akPlugin.config.offlineDir);

    needZipDirList.forEach(zipDir => {
        const zipFileName = zipDir.substring(zipDir.lastIndexOf('/') + 1);


        let srcPath = path.resolve(zipDir);

        let zipPath = '';

        if (zipFileName === 'offline') {
            zipPath = path.resolve(`${akPlugin.config.desZipPath}/${zipFileName}.${akPlugin.config.compileVersion}.zip`);
            zipFileNameList.push(`${zipFileName}.${akPlugin.config.compileVersion}.zip`);
        } else {
            zipPath = path.resolve(`${akPlugin.config.desZipPath}/${zipFileName}.zip`);
            zipFileNameList.push(`${zipFileName}.zip`);
        }

        if (!fs.existsSync(srcPath)) {
            akPlugin.alert(srcPath + ' does not exists');
            return;
        }

        // beforeZip();
        akPlugin.iterateFiles(akPlugin.config.zipFileName, beforeZip);

        var output = fs.createWriteStream(zipPath);
        var archive = archiver('zip', akPlugin.config.zipConfig);

        output.on('close', () => {

            akPlugin.info(`Zip file Name: [${zipFileName}] file size: ${Math.floor(archive.pointer() / 1024)} KB\n`);

            afterZipFn(zipFileNameList, akPlugin);

            // del offline folder
            let offlinePath = path.resolve(akPlugin.config.offlineDir);

            if (!akPlugin.config.keepOffline && fs.existsSync(offlinePath)) {
                fs.remove(offlinePath);
            }
        });

        // good practice to catch akPlugin error explicitly
        archive.on('error', err => {
            akPlugin.alert('err');
            throw err;
        });


        let zipFile = path.resolve(zipDir);

        if (!fs.existsSync(zipFile)) {
            akPlugin.alert(zipFile + ' does not exists');
            return;
        }

        let zipFiles = klawSync(zipFile, {nodir: true});

        zipFiles.forEach(item => {
            archive.file(item.path, {name: path.relative(akPlugin.config.zipFileName, item.path)});
        });

        // pipe archive data to the file
        archive.pipe(output);

        archive.finalize();

        afterZip.bind(akPlugin)(`${zipFile}.zip`);

    });

    return zipFileNameList;
};
