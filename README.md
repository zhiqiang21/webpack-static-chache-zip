# webpack-static-chache-zip
webpack静态文件缓存插件

## 安装插件

使用npm或者是yarn安装，因为这个包是发布到Npm 的，公司的私有源可能不能够及时的同步npm发布的最新版本，建议安装的时候指定 `registry`

```
npm i webpack-static-chache-zip --save-dev --registry=https://registry.npmjs.org/

```

## 使用指南



```javascript

const AkWebpackPlugin = require('webpack-static-chache-zip');

    // 初始化插件
    new AkWebpackPlugin({
    // 最终生成的离线包名称，默认值是 `offline`
    'offlineDir': 'offline',

    // 生成环境的代码源，默认值 `output` webpack编译产出生产环境代码的目录
    'src': 'output',
    // 是否保留生成的离线包文件夹(zip包的源文件)
    'keepOffline': true,

    // 模糊匹配html扩展名， http://xxxx/xx http://xxxx/xx/ http://xxxx/xx/index.html http://xxxx/xx/index.htm
    'fuzzyHtmlExtend': true,

    // 开启编译时是否先清理offzip目录下的zip文件
    'deleteOffZip': true,

    // datatype: [必填] 1（Android乘客端），2（Android司机端），101（iOS乘客端），102（iOS司机端）

    'datatype': '',
    // terminal_id 业务名称，比如乘客端钱包，不能重复 具体查看wiki  http://wiki.intra.xiaojukeji.com/pages/viewpage.action?pageId=118882082

    'terminal_id': '',
    // 如果存在一个data_type 对应多个terminal_id 的情况。 可以按照下面的方法以数组对象的方式列出来
    'terminal_list': [
        {
            data_type: 1
            terminal_id: 2
        },
        {
            data_type: 1
            terminal_id: 2
        }
        ...
    ],

    // 想要包含的文件路径，模糊匹配，优先级高于  excludeFile
    'includeFile': [
      'balance_topup',
      'static',
      'pay_history'
    ],

    // 需要排除的文件路径 模糊匹配优先级低于  includeFile
    'excludeFile': [
        'repay_qa',
        'test',
        'pay_account',
        'fill_phonenum',
        'balance_qa',
        'select_operator',
        'payment_status'
    ],
    // 缓存的文件类型，默认是 html js css   如果需要缓存其它类型文件  ['png', 'jpg']
    'cacheFileTypes': [],

    // 产品线ID 为保持唯一性 接触模块请到  http://wiki.intra.xiaojukeji.com/pages/viewpage.action?pageId=272106764  查看自己使用的module已经被使用
    // 接入是也请登记自己的module
    'module': 'passenger-wallet',


    // path.join('项目根目录', diffJsonDest, `diff.json`) 默认是 path.join('src', 'offzip', 'diff.json')
    'diffJsonDest': '',

    // 页面域名 ,可以配置多个域名，主要适用于一个文件上线后可能被多个域名使用的场景
    // 比如： https://aaaa.com/a.html 和 https://bbbb.com/a.html  其实访问是同一个文件只是由于业务场景的不同使用不同的域名
    'pageHost': 'https://page.didiglobal.com',

    // urlpath
    'urlPath': '/global/passenger-wallet/',

    // 这个字段和下面的 patchCdnPath 较为特殊。比如我们打包产出的路径   /xxxx/xx/output/aaa/bb/index.html  在上线的时候实际上是将output目录copy到了
    // 服务器上 原理上我们的页面的url 应该是 https://page.didiglobal.com/aaa/bb/index.html  但是某些项目可能为了缩短路径查找 通过ngxin 配置 我们实际访问
    // 的 https://page.didiglobal.com/index.html  所在在这里可以配置 patchUrlPath: 'aaa/bb'
    'patchUrlPath': '',

    // cdn域名 静态文件域名（js/css/html） 如果不配置或者设置为空数组会默认使用pageHost
    'cdnHost': 'https://static.didiglobal.com',

    // cdnpath 如果不设置会默认使用 urlPath
    'cdnPath': '',

    // 参考上面的patchUrlPath使用方法
    'patchCdnPath': '',

    // zip文件的域名如果不设置会默认使用 cdnHost
    'zipHost': '',

    // zipPath  如果不设置会默认使用cdnPath
    'zipPath': '',


    // 一个H5页面会跑在不同端内（比如我们巴西和global司机是两个单独的客户端），这两个端内的h5页面又有不同的
    // page域名和static域名 这个时候可以通过otherHost配置来设置环境页面和静态文件的域名，
    // 可以不设置或者为空
    'otherHost': {
      // page和cdn均支持配置数组，如果只有一个额外的域名建议如下配置为字符串，如果要支持多个，则配置为数组的形式
      // 页面的域名  [xxx, xxxx]
      'page': 'page.99taxis.mobi',
      // 可以设置单独的 cdn域名如果不设置则与page域名相同
      //  [xxx, xxxx] 会检查与上面page域名数组长度是否相同，如果不同会以 cdnHost 补全
      'cdn': 'static.99taxis.mobi'
    },

    // 压缩参数，详参 https://archiverjs.com
    'zipConfig': {zlib: {level: 9} },
    // 下列回调方法，可以直接使用this.fs (fs-extra), this.success, this.info, this.warn, this.alert
    // 在 拷贝文件到 offline 离线文件夹之前
    beforeCopy: function () {},
    // 在 拷贝文件到 offline 离线文件夹之后
    afterCopy: function () {

    },
    // 在压缩 offline 离线文件夹之前
    beforeZip: function (offlineFiles) {
        // offlineFiles 在离线包文件夹内的文件路径信息
    },
    // 在压缩 offline 离线文件夹之后
    afterZip: function (zipFilePath) {
        // zipFilePath 最终生成的离线zip包路径
    }
})
```


## 更新日志：

### 2019.12.23
1. 多域名支持配置更多的域名。使用方法参考文档；
2. 对html域名进行衍生，比如`http://xxx/xx/index.html`，会衍生出 `http://xxx/xx` 和 `http://xxx/xx/` 和 `http://xxx/xx/index.htm`；
3. 针对编译完成后是否需要执行 `push `脚本进行提示；

### 2019.11.13
1. 插件支持多实例（可以`new` 多次），可以根据每次的配置生成不同的zip包；

### 2019.11.11
1. 添加`deleteOffZip` 配置，可以在启动编译是删除 `offzip` 目录下的zip文件，防止zip文件过多不好管理；
2. `diff.json`只保存**5**个版本的build信息，以及清除`diff.json`中多余的build文件信息；
3. 第N次编译如果文件信息不发生变化，不生成空的diff目录和zip文件，也不对`diff.json`文件进行修改；
4. `diff.json`的位置可以配置；
