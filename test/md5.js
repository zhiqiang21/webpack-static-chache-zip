const md5File = require('md5-file');

/* Async usage */

console.log(md5File.sync('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip'));

// md5File('/Users/houzhiqiang/Downloads/offzip.20191022154438.zip', (err, hash) => {
//     if (err) {
//         throw err;

//     }

//     console.log(`The MD5 sum of LICENSE.md is: ${hash}`);
// });
