/**
 * @file 取出对象的Key并且将他们排序
 * @date 2019/11/11
 * @author hpuhouzhiqiang@gmail.com
 */


/**
 *
 *  输入对象参数
 * @param {Object} sortObj
 * @returns {Array}
 */
exports.sortObjKeys = function (sortObj) {
    const objKesList = Object.keys(sortObj);

    if (objKesList.length === 0) {
        return [];
    }

    const floatItem = objKesList.map(item => parseFloat(item));

    floatItem.sort((a, b) => {
        return b - a;
    });

    return floatItem;
};
