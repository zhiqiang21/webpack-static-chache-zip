const {URL} = require('url');

const myURL = new URL('https://static.didiglobal.com/global/passenger-wallet/static/js/zh-CN_df9bed7.js');

console.log(myURL);

const test = new URL('https://static.didiglobal.com');

// test.host = 'static.didiglobal.com';
test.pathname = '/global/passenger-wallet/static/js/zh-CN_df9bed7.js';
console.log(`test` + 1, test.href);
