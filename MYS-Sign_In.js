const axios = require('axios');
const {program} = require('commander');
const md5 = require('md5');
const fs = require('fs');
const uuid = require('uuid');
const crypto = require('crypto');

const GENSHIN_SIGN_ACT_ID = 'e202009291139501';
const WEB_HOST = "api-takumi.mihoyo.com";
const GENSHIN_ROLE_URL = `https://${WEB_HOST}/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn`;
const GENSHIN_SIGN_URL = `https://${WEB_HOST}/event/bbs_sign_reward/sign`;
const GENSHIN_SIGN_CHECKIN_REWARDS_URL = `https://${WEB_HOST}/event/bbs_sign_reward/home?act_id=${GENSHIN_SIGN_ACT_ID}`;
const GENSHIN_SIGN_INFO_URL = `https://${WEB_HOST}/event/bbs_sign_reward/info`;
const GENSHIN_SIGN_REFERER = `https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=${GENSHIN_SIGN_ACT_ID}&utm_source=bbs&utm_medium=mys&utm_campaign=icon`;

const CLIENT_TYPE_WEB = "5"; // 4为pc web 5为mobile web
const SYS_VERSION = "12";
const APP_VERSION = "2.38.1";
const USER_AGENT = `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`;

//全局配置文件
let CONFIG = {};

//GENSHIN角色信息
let GENSHIN_ROLE = {
    game_biz: '',
    region: '',
    game_uid: '',
    nickname: '',
    level: -1,
    is_chosen: false,
    region_name: '',
    is_official: false
};

//GENSHIN请求头
let HEADERS = {
    "DS": '',
    "Cookie": '',
    "x-rpc-challenge": '',
    "x-rpc-validate": '',
    "x-rpc-seccode": '',
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,en-US;q=0.8",
    "Origin": "https://webstatic.mihoyo.com",
    "User-Agent": USER_AGENT,
    "Referer": GENSHIN_SIGN_REFERER,
    "Host": WEB_HOST,
    "x-rpc-sys_version": SYS_VERSION,
    "x-rpc-app_version": APP_VERSION,
    "x-rpc-client_type": CLIENT_TYPE_WEB,
    "x-rpc-device_id": uuid.v4()
};

//控制台参数获取
function parse_arguments() {
    program.option('--configpath <>', '配置路径', './ysconfig.json').parse();
    return program.opts();
}

//睡眠函数
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

//axios
const $axios = axios.create({
    // timeout: 15000
});

//获取CONFIG配置
async function getConfig() {
    //获取配置路径
    const {configpath} = parse_arguments();
    const data = fs.readFileSync(configpath, 'utf-8');
    return CONFIG = JSON.parse(data);
}

async function getDS() {
    const s = "yUZ3s0Sna1IrSNfk29Vo6vRapdOyqyhB";
    const t = Math.floor(Date.now() / 1e3);
    const r = Math.random().toString(36).slice(-6);
    const c = `salt=${s}&t=${t}&r=${r}`;
    return `${t},${r},${md5(c)}`;
}

//设置请求头
async function setHeaders(cookie, ds, challenge = '', validate = '') {
    HEADERS.Cookie = cookie;
    HEADERS.DS = ds;
    HEADERS['x-rpc-challenge'] = challenge;
    HEADERS['x-rpc-validate'] = validate;
    HEADERS['x-rpc-seccode'] = `${validate}|jordan`;
}

//获取GENSHIN角色信息
async function getRole(config) {
    await setHeaders(config.cookie, await getDS());
    if (HEADERS.cookie === 0) {
        console.info('cookie错误，重新获取!!!')
        return 0;
    }
    //利用cookie登录
    const res = await $axios.request({
        method: 'GET', url: GENSHIN_ROLE_URL, headers: HEADERS
    }).catch(err => {
        console.error('登录错误\n' + err);
        return 0;
    });
    //登录未成功
    if (res.data['retcode'] !== 0) {
        console.info('帐号未登录！请检查cookie!!!');
        return 0;
    }
    GENSHIN_ROLE = res.data.data.list[0]
    return res.data;
}

//获取GENSHIN签到信息
async function getSignInfo(config) {
    const defaultData = {
        retcode: -1,
        message: 'no',
        data: {
            total_sign_day: -1,
            today: '****-**-**',
            is_sign: false,
            first_bind: false,
            is_sub: false,
            month_first: false,
            sign_cnt_missed: -1,
            month_last_day: false
        }
    };
    await setHeaders(config.cookie, await getDS());
    const res = await $axios.request({
        method: "GET",
        url: GENSHIN_SIGN_INFO_URL,
        headers: HEADERS,
        params: {
            act_id: GENSHIN_SIGN_ACT_ID,
            region: GENSHIN_ROLE.region,
            uid: GENSHIN_ROLE.game_uid
        }
    }).catch(err => {
        console.error(err)
        return defaultData;
    });
    if (res.data['retcode'] !== 0) {
        return defaultData;
    }
    return res.data;
}

// 获取GENSHIN奖励信息
async function getAwards() {
    const defaultData = {
        retcode: -1,
        message: 'no',
        data: {
            month: -1,
            awards: [
                {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }, {
                    "icon": "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fimages.669pic.com%2Felement_pic%2F24%2F29%2F27%2F87%2Fc4d4331ecb441db3e1895baa8b3715cb.jpg&refer=http%3A%2F%2Fimages.669pic.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=auto?sec=1671887248&t=4c5cff650051ceb87806cb3df203b435",
                    "name": "xxx",
                    "cnt": -1
                }
            ],
            resign: false
        }
    };
    const res = await $axios.request({
        method: "GET",
        url: GENSHIN_SIGN_CHECKIN_REWARDS_URL,
    }).catch(err => {
        console.error(err)
        return defaultData;
    });
    if (res.data['retcode'] !== 0) {
        return defaultData;
    }
    return res.data.data['awards'];
}

// GENSHIN签到
async function Sign_In(config) {
    if (GENSHIN_ROLE !== 0) {
        const cookie = config.cookie;
        let message = `【${GENSHIN_ROLE.nickname}】[ UID : ${GENSHIN_ROLE.game_uid} ]\n【${GENSHIN_ROLE.region_name}】[ Lv : ${GENSHIN_ROLE.level} ]\n`;
        const post_data = `{"act_id":"${GENSHIN_SIGN_ACT_ID}","region":"${GENSHIN_ROLE.region}","uid":"${GENSHIN_ROLE.game_uid}"}`;
        await setHeaders(cookie, await getDS())
        const count = 3;//重试次数
        for (let i = 0; i <= count; i++) {
            if (i !== 0) {
                console.info(`触发验证码，即将进行第${i}次重试，最多3次`)
            }

            const res = await $axios.request({
                method: 'POST', url: GENSHIN_SIGN_URL, headers: HEADERS, data: post_data
            }).catch(err => {
                console.error('原神米游社签到错误\n' + err);
            });
            const res_data = res.data;
            const res_data_data = res.data;

            const signInfo = await getSignInfo(config);
            const sign_days = signInfo.data["total_sign_day"];
            let awards = await getAwards();
            awards = awards[sign_days - 1];

            if (res_data["retcode"] === 0 && Number(res_data_data.data["success"]) === 0) {//签到成功
                message = `${message}【提示】[签到成功!]\n【奖励】[${awards['name']}x${awards['cnt']}]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                // console.info(message)
                break;
            } else if (signInfo.data['is_sign'] || res_data["retcode"] === -5003) {//已经签过直接跳过
                message = `${message}【提示】[今天已经签到过了!]\n【奖励】[${awards['name']}x${awards['cnt']}]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                // console.info(message);
                break;
            } else if (i === count && Number(res_data_data.data["success"]) === 1) {
                message = `${message}【提示】[签到失败!]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                // console.info(message)
                break;
            }

            //同ip请求次数过多
            if (res_data["retcode"] === 429) {
                console.info('429 请求过多，即将进入下一次请求')
                await sleep(10000); //429同ip请求次数过多，尝试sleep 10s进行解决
                continue;
            }

            //触发验证码
            if (res_data["retcode"] === 0 && Number(res_data_data.data["success"]) === 1) {
                if (config['OCR_TOKEN'].length > 0) {
                    const data = await getValidate(config, res_data_data.data['gt'], res_data_data.data['challenge'], GENSHIN_SIGN_REFERER);
                    const validate = data.data['validate'] ? data.data['validate'] : null;
                    if (validate) {
                        console.info('验证成功，即将签到...')
                        await sleep(3000);
                        await setHeaders(cookie, await getDS(), res_data_data.data['challenge'], validate);
                        continue;
                    }
                }
                await sleep(3000);
            }
        }
        //返回信息
        return message;
    }
    return '登录失败，请检查cookie！！！\n';
}

//OCR识别验证码
async function getValidate(config, gt, challenge, referer) {
    const OCR_URL = `https://api.ocr.kuxi.tech/api/recognize?token=${config['OCR_TOKEN']}&gt=${gt}&challenge=${challenge}&referer=${referer}`;
    const res = await $axios.request({
        method: 'POST', url: OCR_URL
    }).catch(err => {
        console.error('验证码识别错误\n' + err);
        return null;
    });
    if (res.data.code !== 0) {
        return null;
    }
    return res.data;
}

//钉钉自定义机器人推送
async function dingdingBot(config, title, content) {

    const SWITCH = config['DD_BOT']['SWITCH'];
    const access_token = config['DD_BOT']['DD_BOT_TOKEN'];
    const secret = config['DD_BOT']['DD_BOT_SECRET'];
    if (SWITCH && access_token && secret) {
        //utf-8编码secret
        const secret_enc = new Buffer.from(secret).toString('utf-8');
        //毫秒时间戳
        const timestamp = new Date().getTime();
        //utf-8编码str_to_sign
        const str_to_sign_enc = new Buffer.from(`${timestamp}\n${secret}`).toString('utf-8');
        //base64编码sign
        const sign_enc = crypto.createHmac('sha256', secret_enc).update(str_to_sign_enc).digest('base64');
        //推送url
        const pushUrl = `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${timestamp}&sign=${sign_enc}`;
        const post_data = {
            msgtype: "text",
            text: {
                content: `${title}\n\n${content}`
            }
        };
        const headers = {"Content-Type": "application/json;charset=utf-8"};
        const res = await $axios.request({
            method: 'POST', url: pushUrl, headers: headers, data: JSON.stringify(post_data)
        }).catch(err => {
            console.error(err);
        })
        if (res.data['errcode'] !== 0) {
            console.error('钉钉推送失败！\n');
        }
        console.info('钉钉推送成功！\n');
    }
}

//主函数
async function main() {
    //打印标题
    console.info('[米游社 原神签到]\n');
    //获取CONGIG
    CONFIG = await getConfig();
    //获取config中YuanShen
    const YuanShenConfig = CONFIG['YuanShen'];
    //签到
    console.info('共获取' + YuanShenConfig.length + '个用户\n');
    for (const i in YuanShenConfig) {
        console.info(`第${Number(i) + 1}位用户开始签到...`)
        await getRole(YuanShenConfig[i]);
        const message = await Sign_In(YuanShenConfig[i]);
        console.info(message)
        await dingdingBot(YuanShenConfig[i], '[米游社 原神签到]', message);
        await sleep(3000);
    }
}

main().then();

