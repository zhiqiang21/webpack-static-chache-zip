const path  = require('path');


console.log(path.join('aaaa', 'bbbb'));


console.log(`aaa`, path.join('ccccc'));

console.log('resolve', path.resolve('../..', 'js/css/index.html'));
console.log('resolve', path.resolve('js/css/index.html'));
console.log('resolve', path.resolve('js/css/index.html', '../..'));


const str = '/Users/houzhiqiang/DidiCode/optimus-fe-i18n/offline/offline/resource/html/pages/passenger-index-new.html';

let aaaa = 'html/pages/passenger-index-new.html';

console.log(`str`, aaaa.replace('html/pages', ''));
console.log(`aaa`, aaaa);
