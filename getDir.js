/**
 * @file 获取某个路径下的所有目录
 * @date 2019/10/28
 * @author hpuhouzhiqiang@gmail.com
 */
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

exports.getDir = function (pathDir) {
    const cwd = process.cwd();
    const dirItem = fs.readdirSync(pathDir);
    const dirList = [];

    dirItem.forEach(item => {
        const itemPath = path.join(cwd, pathDir, item);

        try {
            const fsStats = fs.statSync(itemPath);

            if (fsStats.isDirectory()) {
                dirList.push(itemPath);
            }
        } catch (error) {
            console.log(chalk.red(`get zip dir infor error ,${error}`));
            return;
        }

    });

    return dirList;
};
