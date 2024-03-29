const axios = require('axios');
const {program} = require('commander');
const md5 = require('md5');
const fs = require('fs');
const uuid = require('uuid');

const GENSHIN_SIGN_ACT_ID = 'e202009291139501';
const WEB_HOST = "api-takumi.mihoyo.com";
const GENSHIN_ROLE_URL = `https://${WEB_HOST}/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn`;
const GENSHIN_SIGN_URL = `https://${WEB_HOST}/event/bbs_sign_reward/sign`;
const GENSHIN_SIGN_CHECKIN_REWARDS_URL = `https://${WEB_HOST}/event/bbs_sign_reward/home?act_id=${GENSHIN_SIGN_ACT_ID}`;
const GENSHIN_IS_SIGN_URL = `https://${WEB_HOST}/event/bbs_sign_reward/info`;

const CLIENT_TYPE_WEB = "5"; // 4为pc web 5为mobile web
const SYS_VERSION = "12";
const APP_VERSION = "2.38.1";
const USER_AGENT = `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`;
const REFERER = `https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=${GENSHIN_SIGN_ACT_ID}&utm_source=bbs&utm_medium=mys&utm_campaign=icon`;

let CONFIG = {};
let ROLE = {
    game_biz: '',
    region: '',
    game_uid: '',
    nickname: '',
    level: -1,
    is_chosen: false,
    region_name: '',
    is_official: false
};
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
    "Referer": REFERER,
    "Host": WEB_HOST,
    "x-rpc-sys_version": SYS_VERSION,
    "x-rpc-app_version": APP_VERSION,
    "x-rpc-client_type": CLIENT_TYPE_WEB,
    "x-rpc-device_id": uuid.v4()
};

function parse_arguments() {
    program.option('--configpath <>', '配置路径', './ysconfig.json').parse();
    return program.opts();
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const $axios = axios.create({
    // timeout: 15000
});

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

async function setHeaders(cookie, ds, challenge = '', validate = '') {
    HEADERS.Cookie = cookie;
    HEADERS.DS = ds;
    HEADERS['x-rpc-challenge'] = challenge;
    HEADERS['x-rpc-validate'] = validate;
    HEADERS['x-rpc-seccode'] = `${validate}|jordan`;
}


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
    ROLE = res.data.data.list[0]
    return res.data;
}

async function getSignInfo(config) {
    await setHeaders(config.cookie, await getDS());
    const res = await $axios.request({
        method: "GET",
        url: GENSHIN_IS_SIGN_URL,
        headers: HEADERS,
        params: {
            act_id: GENSHIN_SIGN_ACT_ID,
            region: ROLE.region,
            uid: ROLE.game_uid
        }
    }).catch(err => {
        console.error(err)
    });
    if (res.data['retcode'] !== 0) {
    }
    return res.data;
}

async function getValidate(config, gt, challenge) {
    const OCR_URL = `https://api.ocr.kuxi.tech/api/recognize?token=${config['OCR_TOKEN']}&gt=${gt}&challenge=${challenge}&referer=${REFERER}`;
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


async function Sign_In(config) {
    if (ROLE !== 0) {
        const cookie = config.cookie;
        const post_data = `{"act_id":"${GENSHIN_SIGN_ACT_ID}","region":"${ROLE.region}","uid":"${ROLE.game_uid}"}`;
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
            let message = `【${ROLE.nickname}】[ UID : ${ROLE.game_uid} ]\n【${ROLE.region_name}】[ Lv : ${ROLE.level} ]\n`;

            const signInfo = await getSignInfo(config);
            const sign_days = signInfo.data["total_sign_day"];
            let awards = await getAwards();
            awards = awards[sign_days - 1];

            if (signInfo.data['is_sign'] || res_data["retcode"] === -5003) {//已经签过直接跳过
                message = `${message}【提示】[今天已经签到过了!]\n【奖励】[${awards['name']}x${awards['cnt']}]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                console.info(message);
                break;
            } else if (res_data["retcode"] === 0 && Number(res_data_data.data["success"]) === 0) {//签到成功
                message = `${message}【提示】[签到成功!]\n【奖励】[${awards['name']}x${awards['cnt']}]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                console.info(message)
                break;
            } else if (i === count && Number(res_data_data.data["success"]) === 1) {
                message = `${message}【提示】[签到失败!]\n【总计】[共签到${signInfo.data['total_sign_day']}天，漏签${signInfo.data['sign_cnt_missed']}天]\n`;
                console.info(message)
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
                    const data = await getValidate(config, res_data_data.data['gt'], res_data_data.data['challenge']);
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
    }
}

async function getAwards() {
    const res = await $axios.request({
        method: "GET",
        url: GENSHIN_SIGN_CHECKIN_REWARDS_URL,
    }).catch(err => {
        console.error(err)
    });
    if (res.data['retcode'] !== 0) {
        return 0;
    }
    return res.data.data['awards'];
}

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
        await Sign_In(YuanShenConfig[i])
        await sleep(3000);
    }
}

main().then();