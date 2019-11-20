const fs = require('fs-extra');
const md5File = require('md5-file');

const glob = require('glob');

const offZipFileList = glob.sync(`/Users/houzhiqiang/DidiCode/passenger-wallet/output/**/*.zip`);

console.log('**************offZipFileList***************');
console.log(`offZipFileList`, offZipFileList);
console.log('*******************************');

offZipFileList.forEach(item => {

    console.log(`foreach`, md5File.sync(item));
});

console.log(md5File.sync('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip'));

// console.log(`md5`, md5Hex(fs.readFileSync('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip')));

// console.log(md5File.sync('/Users/houzhiqiang/DidiCode/passenger-wallet/output/offzip/offline.20191029145055.zip'));

// console.log(`md5`, md5.getHashOfFile('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip'));

// const arr = [
// '/Users/houzhiqiang/DidiCode/passenger-wallet/output/offzip/diff.G6PCX9W2.zip',
// '/Users/houzhiqiang/DidiCode/passenger-wallet/output/offzip/offline.20191029152026.zip',
// ''
// ];

// arr.forEach(item => {

//     console.log(` md5File.sync(item)`, md5File.sync(item));
// });

// md5File('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip', (err, hash) => {
//     if (err) {
//         throw err;

//     }

//     console.log(`The MD5 sum of LICENSE.md is: ${hash}`);
// });
