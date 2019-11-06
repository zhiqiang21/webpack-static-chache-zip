const path  = require('path');


console.log(path.join('aaaa', 'bbbb'));


console.log(`aaa`, path.join('ccccc'));

console.log('resolve', path.resolve('../..', 'js/css/index.html'));
console.log('resolve', path.resolve('js/css/index.html'));
console.log('resolve', path.resolve('js/css/index.html', '../..'));
