/**
* Sub-Store 节点重命名脚本 v3 — 统一命名格式版
* 综合参考：Keywos rename.js + cwbitz/substore-rename-script (201 国，MIT)
*
* 统一格式（默认）：
* 自定义前缀 国家 序号 原有后缀
*
* 效果示例：
* 香港 03 家宽 -> 小宝 香港 03 家宽
* 香港 03 -> 小宝 香港 03 [0.3X] （会统一成 []，见 normalizeBrackets）
* KR韩国-原生住宅IP -> 小宝 韩国 原生住宅IP
* HK香港01-hkt -> 小宝 香港 01 hkt
* 🇰🇷韩国-原生住宅IP -> 小宝 韩国 原生住宅IP
* 狮城 01 -> 小宝 新加坡 01
* 东京 01 -> 小宝 日本 01
* Los Angeles 01 -> 小宝 美国 01
*
* 没有序号的节点，序号那一项直接省略，不留空位：
* KR韩国-原生住宅IP -> 小宝 韩国 原生住宅IP
* 没有后缀的节点也一样：
* 香港 03 -> 小宝 香港 03
*
* 没有匹配到国家的节点，不丢弃，原名原样加前缀，放到最后：
* 某某节点 -> 小宝 某某节点
*
* 用法（Sub-Store 脚本操作，远程脚本）：
* https://raw.githubusercontent.com/<你的用户名>/<仓库名>/main/rename-prefix.js#providerLabel=小宝#noCache
* 兼容 Keywos 的写法：
* https://raw.githubusercontent.com/<你的用户名>/<仓库名>/main/rename-prefix.js#name=小宝#noCache
*
* 参数（全部可选，$arguments 传入）：
* providerLabel / name 自定义前缀，默认 小宝
* 例：providerLabel=多宝 / providerLabel=你好 / providerLabel=小宝
* providerLabelSep 前缀和国家之间的分隔符，默认 " "（一个空格）
* 想要以前的 "多宝 | 香港..." 就传 providerLabelSep=%20%7C%20
* （URL 编码：空格=%20，|= %7C）
* countryLabelType zh | en | code，默认 zh
* zh：香港 / 美国；en：Hong Kong / United States；code：HK / US
* addFlagLabel true | false，默认 false；true 时在国家名前加国旗，如 🇭🇰 香港
* filterInvalid true | false，默认 true；删掉 剩余流量 / 套餐到期 / 距离下次重置 等信息节点
* normalizeBrackets true | false，默认 true；把全角 统一成半角 []
* padIndex true | false，默认 true；序号 1 位时补零成 01，03 本来就是 03 不变
*/

// ---------- 参数解析：同时兼容 cwbitz 和 Keywos 的参数名 ----------
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
const providerLabel = decode(inArg.providerLabel, '') || decode(inArg.name, '') || '小宝';
const providerLabelSep = decode(inArg.providerLabelSep, ' ');
const countryLabelType = ['zh', 'en', 'code'].includes(String(inArg.countryLabelType || 'zh').toLowerCase())
? String(inArg.countryLabelType).toLowerCase(): 'zh';
const addFlagLabel = boolArg(inArg.addFlagLabel, false);
const filterInvalid = boolArg(inArg.filterInvalid, true);
const normalizeBrackets = boolArg(inArg.normalizeBrackets, true);
const padIndex = boolArg(inArg.padIndex, true);

// ---------- 国家表：cwbitz 前 19 个最常用的，含城市/繁体/“深港”变体 ----------
const COUNTRIES = [
{ en: 'Hong Kong', zh: '香港', code: 'HK', flag: '🇭🇰', aliasEn: /(?:Hong\s*Kong|HK|🇭🇰)/iu, aliasZh: /(?:香港|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)港)/},
{ en: 'United States', zh: '美国', code: 'US', flag: '🇺🇸', aliasEn: /(?:United\s*States|USA|America|US|🇺🇸|Los\s*Angeles|LA|San\s*Jose|Silicon\s*Valley|Seattle|San\s*Francisco|Dallas|Chicago|New\s*York|Ashburn|Phoenix|Atlanta)/iu, aliasZh: /(?:美国|美國|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)美|洛杉矶|洛杉磯|圣何塞|聖荷西|硅谷|矽谷|西雅图|西雅圖|旧金山|舊金山|三藩(?:市)?|达拉斯|達拉斯|芝加哥|纽约|紐約|阿什本|凤凰城|鳳凰城|亚特兰大|亞特蘭大)/},
{ en: 'Taiwan', zh: '台湾', code: 'TW', flag: '🇹🇼', aliasEn: /(?:Tai\s*wan|TW|🇹🇼|Tai\s*pei|Tao\s*yuan|Hsin\s*chu|Tai\s*chung|Tai\s*nan|Kao\s*hsiung)/iu, aliasZh: /(?:台湾|臺灣|台北|臺北|新北|桃园|桃園|新竹|台中|臺中|台南|臺南|高雄)/},
{ en: 'Japan', zh: '日本', code: 'JP', flag: '🇯🇵', aliasEn: /(?:Japan|JP|🇯🇵|Tokyo|Osaka|Nagoya|Fukuoka|Sapporo)/iu, aliasZh: /(?:日本|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭|中|(?:辽|遼))日|东京|東京|大坂|名古屋|福冈|福岡|札幌)/},
{ en: 'South Korea', zh: '韩国', code: 'KR', flag: '🇰🇷', aliasEn: /(?:South\s*Korea|KR|🇰🇷|ROK|Seoul|Busan|Incheon|Chuncheon|Daejeon|Gwangju|Daegu)/iu, aliasZh: /(?:韩国|韓國|首尔|首爾|釜山|仁川|春川|大田|光州|大邱)/},
{ en: 'Singapore', zh: '新加坡', code: 'SG', flag: '🇸🇬', aliasEn: /(?:Singapore|SG|🇸🇬)/iu, aliasZh: /(?:新加坡|狮城|獅城|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)新)/},
{ en: 'India', zh: '印度', code: 'IN', flag: '🇮🇳', aliasEn: /(?:India|IN|🇮🇳|Mumbai|Delhi|Bangalore)/iu, aliasZh: /(?:印度|孟买|孟買|德里|班加罗尔|班加羅爾)/},
{ en: 'Thailand', zh: '泰国', code: 'TH', flag: '🇹🇭', aliasEn: /(?:Thailand|TH|🇹🇭|Bangkok|Chiang\s*Mai|Phuket)/iu, aliasZh: /(?:泰国|泰國|曼谷|清迈|清邁|普吉|布吉)/},
{ en: 'United Arab Emirates', zh: '阿联酋', code: 'AE', flag: '🇦🇪', aliasEn: /(?:United\s*Arab\s*Emirates|UAE|AE|🇦🇪|Dubai|Abu\s*Dhabi)/iu, aliasZh: /(?:阿联酋|阿聯酋|迪拜|杜拜|阿布扎比|阿布达比)/},
{ en: 'Malaysia', zh: '马来西亚', code: 'MY', flag: '🇲🇾', aliasEn: /(?:Malaysia|MY|🇲🇾|Kuala\s*Lumpur|Penang)/iu, aliasZh: /(?:马来(?:西亚)?|馬來(?:西亞)?|吉隆坡|槟城|檳城)/},
{ en: 'Indonesia', zh: '印度尼西亚', code: 'ID', flag: '🇮🇩', aliasEn: /(?:Indonesia|ID|🇮🇩|Jakarta|Bali)/iu, aliasZh: /(?:印度尼西亚|印度尼西亞|印尼|雅加达|雅加達|巴厘|峇里)/},
{ en: 'United Kingdom', zh: '英国', code: 'GB', flag: '🇬🇧', aliasEn: /(?:United\s*Kingdom|GB|🇬🇧|Great\s*Britain|UK|London|Manchester)/iu, aliasZh: /(?:英国|英國|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)英|伦敦|倫敦|曼彻斯特|曼徹斯特)/},
{ en: 'Germany', zh: '德国', code: 'DE', flag: '🇩🇪', aliasEn: /(?:Germany|DE|🇩🇪|Frankfurt|Berlin|Munich)/iu, aliasZh: /(?:德国|德國|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)德|法兰克福|法蘭克福|柏林|慕尼黑)/},
{ en: 'France', zh: '法国', code: 'FR', flag: '🇫🇷', aliasEn: /(?:France|FR|🇫🇷|Paris|Marseille)/iu, aliasZh: /(?:法国|法國|巴黎|马赛|馬賽)/},
{ en: 'Turkey', zh: '土耳其', code: 'TR', flag: '🇹🇷', aliasEn: /(?:Turkey|TR|🇹🇷|Istanbul|Ankara)/iu, aliasZh: /(?:土耳其|伊斯坦布尔|伊斯坦堡|安卡拉)/},
{ en: 'Australia', zh: '澳大利亚', code: 'AU', flag: '🇦🇺', aliasEn: /(?:Australia|AU|🇦🇺|Melbourne|Sydney|Brisbane|Perth)/iu, aliasZh: /(?:澳大利亚|澳洲|土澳|(?:深|(?:沪|滬)|呼|京|(?:广|廣)|杭)澳|墨尔本|墨爾本|悉尼|雪梨|布里斯班|布里斯本|珀斯)/},
{ en: 'Canada', zh: '加拿大', code: 'CA', flag: '🇨🇦', aliasEn: /(?:Canada|CA|🇨🇦|Toronto|Vancouver|Montreal)/iu, aliasZh: /(?:加拿大|多伦多|多倫多|温哥华|溫哥華|蒙特利尔|蒙特利爾)/},
{ en: 'Russia', zh: '俄罗斯', code: 'RU', flag: '🇷🇺', aliasEn: /(?:Russia|RU|🇷🇺|Moscow)/iu, aliasZh: /(?:俄罗斯|俄羅斯|莫斯科)/},
{ en: 'Netherlands', zh: '荷兰', code: 'NL', flag: '🇳🇱', aliasEn: /(?:Netherlands|NL|🇳🇱|Holland|Amsterdam)/iu, aliasZh: /(?:荷兰|荷蘭|阿姆斯特丹)/},
];

const INVALID_RE = /(?:套餐|到期|过期|已用|剩余|有效|版本|失联|官网|官方|网址|网站|官址|备用|群|客服|获取|订阅|流量|下次|联系|邮箱|工单|拉取|距离下次重置|plan|expire|used|total|left|valid|official|website|backup|group|support|subscription|traffic|next|contact|email|ticket)/i;
const CODE_AFTER_ZH = /(香港|韩国|日本|美国|新加坡|台湾|澳门|英国|法国|德国|澳大利亚|加拿大|荷兰|土耳其|泰国|越南|印度|印尼|马来西亚|菲律宾)(HK|KR|JP|US|SG|TW|MO|GB|UK|DE|FR|AU|CA|NL|TR|TH|VN|IN|ID|MY|PH)(?=[-\s\d]|$)/g;

function countryLabel(c) {
return countryLabelType === 'en'? c.en: countryLabelType === 'code'? c.code: c.zh;
}

// 找国家，并把匹配到的那一段从名字里拿掉，剩下的是“序号 + 后缀”
function extractCountry(n) {
for (const c of COUNTRIES) {
let m = c.aliasZh? n.match(c.aliasZh): null;
if (m) return { country: c, rest: n.replace(m[0], '')};
m = c.aliasEn? n.match(c.aliasEn): null;
if (m) return { country: c, rest: n.replace(m[0], '')};
}
return { country: null, rest: n};
}

function operator(proxies) {
let list = proxies;
if (filterInvalid) list = list.filter(p =>!INVALID_RE.test(String(p.name || '')));

return list.map(p => {
let n = String(p.name || '');

// 1. 去国旗（后面 addFlagLabel=true 时会按需再加，不重复）
n = n.replace(/(?:\uD83C[\uDDE6-\uDDFF]){2}\s?/g, '');

// 2. 找国家，拿掉国家那一段
const r = extractCountry(n);
const country = r.country;
let rest = r.rest || '';

// 3. 去残留的重复代码：KR韩国 -> 拿掉韩国后剩 KR-...，这里再去掉 KR
// 通用规则：开头两位大写字母 + 后面是中文/数字/分隔符，就去掉
rest = rest.replace(/^[A-Z]{2}\s?/, '');
rest = rest.replace(CODE_AFTER_ZH, '$1');
rest = rest.trim();

// 4. 括号统一： -> [0.3X]（可关，normalizeBrackets=false 就保留原样）
if (normalizeBrackets) rest = rest.replace(/\u3010/g, '[').replace(/\u3011/g, ']');

// 5. 从剩余部分拆出序号和后缀
// "03 家宽" -> 03 / 家宽；"01-hkt" -> 01 / hkt；"-原生住宅IP" -> 无序号 / 原生住宅IP
let index = '', suffix = rest;
const m = rest.match(/^\s*-?\s*(\d+)\s*[-–]?\s*(.*)$/);
if (m && rest.match(/^\s*-?\s*\d/)) {
index = m[1];
suffix = (m[2] || '').trim();
// 后缀前面可能还剩一个 -，去掉
suffix = suffix.replace(/^[-–\s]+/, '');
} else {
suffix = rest.replace(/^[-–\s]+/, '');
}
if (index && padIndex && index.length === 1) index = '0' + index;

// 6. 按统一格式组装：前缀 国家 序号 后缀，缺哪项就跳过哪项，不留空位
// 分隔符只用在前缀和后面之间，国家 / 序号 / 后缀之间永远用一个空格
const sepRaw = (providerLabelSep && providerLabelSep.trim() !== '') ? providerLabelSep : ' ';
const sep = sepRaw.startsWith(' ') ? sepRaw : ' ' + sepRaw;
const sepFinal = sep.endsWith(' ') ? sep : sep + ' ';
const restParts = [];
if (country) {
const label = countryLabel(country);
restParts.push(addFlagLabel ? country.flag + ' ' + label : label);
} else {
if (rest) restParts.push(rest);
p.name = providerLabel ? providerLabel + sepFinal + restParts.join(' ') : restParts.join(' ');
return p;
}
if (index) restParts.push(index);
if (suffix) restParts.push(suffix);
p.name = providerLabel ? providerLabel + sepFinal + restParts.join(' ') : restParts.join(' ');
return p;
});
}
