/**
* Sub-Store 节点重命名脚本 - 极简版：只加前缀，不区分国家
* 格式：自定义前缀 + 原有节点名（原样保留，一个字都不改）
*
* 效果示例：
* 香港 03 家宽 -> 小宝 香港 03 家宽
* 香港 03 -> 小宝 香港 03
* KR韩国-原生住宅IP -> 小宝 KR韩国-原生住宅IP
* HK香港01-hkt -> 小宝 HK香港01-hkt
*
* 注意：这个版本不去重 KR/韩国、不归一化国家、不拆序号，
* 就是在原名前面加个前缀。想要去重、统一格式的版本，
* 用 rename-prefix.js（v4）那个。
*
* 用法（Sub-Store 脚本操作，远程脚本）：
* https://raw.githubusercontent.com/<你的用户名>/<仓库名>/main/rename-prefix-simple.js#providerLabel=小宝#noCache
* 兼容写法：
* https://raw.githubusercontent.com/<你的用户名>/<仓库名>/main/rename-prefix-simple.js#name=小宝#noCache
*
* 参数（全部可选）：
* providerLabel / name 自定义前缀，默认 小宝
* 例：providerLabel=多宝 / providerLabel=你好 / providerLabel=小宝
* providerLabelSep 前缀和原名之间的分隔符，默认 " "（一个空格）
* 想要 "多宝 | 香港..." 就传 providerLabelSep=%20%7C%20
* filterInvalid true | false，默认 false（极简版默认不过滤）
* true 时删掉 剩余流量 / 套餐到期 / 距离下次重置 等信息节点
*/

const inArg = typeof $arguments!== 'undefined'? $arguments: {};
function boolArg(v, d) {
if (v === undefined || v === null || v === '') return d;
if (typeof v === 'string') {
if (/^(true|1|on|yes)$/i.test(v.trim())) return true;
if (/^(false|0|off|no)$/i.test(v.trim())) return false;
}
return!!v;
}
function decode(v, d) {
if (v === undefined || v === null || v === '') return d;
try { return decodeURIComponent(v);} catch (e) { try { return decodeURI(v);} catch (e2) { return v;}}
}
const providerLabel = decode(inArg.providerLabel, '') || decode(inArg.name, '') || '模版';
const providerLabelSep = decode(inArg.providerLabelSep, ' | ');
const filterInvalid = boolArg(inArg.filterInvalid, true);

const INVALID_RE = /(?:套餐|到期|过期|已用|剩余|有效|版本|失联|官网|官方|网址|网站|官址|备用|群|客服|获取|订阅|流量|下次|联系|邮箱|工单|拉取|距离下次重置|plan|expire|used|total|left|valid|official|website|backup|group|support|subscription|traffic|next|contact|email|ticket)/i;

function operator(proxies) {
let list = proxies;
if (filterInvalid) list = list.filter(p =>!INVALID_RE.test(String(p.name || '')));

// 前缀拼法：分隔符只用在前缀和原名之间
const sepRaw = (providerLabelSep && providerLabelSep.trim()!== '')? providerLabelSep: ' | ';
const sep = sepRaw.startsWith(' ')? sepRaw: ' ' + sepRaw;
const sepFinal = sep.endsWith(' ')? sep: sep + ' ';
const cleanLabel = String(providerLabel || '').replace(/\s*\|\s*$/, '').trim();
const prefix = cleanLabel ? cleanLabel + sepFinal : '';

// Clash / Mihomo 要求节点名唯一，重名会报 duplicate name
// 同一个名字第二次出现自动加 -2，第三个加 -3
const seen = {};
return list.map(p => {
const cleanName = String(p.name || '').replace(/(?:\uD83C[\uDDE6-\uDDFF]){2}\s?/g, '').trim();
const baseName = prefix + cleanName;
if (seen[baseName]) {
seen[baseName]++;
p.name = baseName + '-' + seen[baseName];
} else {
seen[baseName] = 1;
p.name = baseName;
}
return p;
});
}
