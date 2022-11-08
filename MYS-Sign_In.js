const axios = require('axios');
const {program} = require('commander');
const md5 = require('md5');
const fs = require('fs');
const uuid = require('uuid');


// 获取cookie，https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn
const ACT_ID = 'e202009291139501';
const GET_ROLE_URL = "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn";
const SIGN_URL = "https://api-takumi.mihoyo.com/event/bbs_sign_reward/sign";
const REFERER = "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=e202009291139501&utm_source=bbs&utm_medium=mys&utm_campaign=icon";
const HOST = "api-takumi.mihoyo.com";

const SYS_VERSION = "12";
const APP_VERSION = "2.38.1";
const CLIENT_TYPE = "5";
const USER_AGENT = `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`;

function parse_arguments() {
    program.option('--configpath <>', '配置路径', './ysconfig.json').parse();
    return program.opts();
}

const $axios = axios.create({
    timeout: 5000
});

async function getCookies(configPath) {
    let data = fs.readFileSync(configPath, 'utf-8');
    let jsonObj = JSON.parse(data);
    let YuanShenList = jsonObj['YuanShen'];
    let cookies = [];
    for (let i in YuanShenList) {
        cookies.push(YuanShenList[i]['cookie']);
    }
    return cookies;
}

async function getDS() {
    const s = "yUZ3s0Sna1IrSNfk29Vo6vRapdOyqyhB";
    const t = Math.floor(Date.now() / 1e3);
    const r = Math.random().toString(36).slice(-6);
    const c = `salt=${s}&t=${t}&r=${r}`;
    return `${t},${r},${md5(c)}`;
}

async function getHeaders(cookie) {
    return {
        "DS": await getDS(),
        "User-Agent": USER_AGENT,
        "Referer": REFERER,
        "Host": HOST,
        "x-rpc-sys_version": SYS_VERSION,
        "x-rpc-app_version": APP_VERSION,
        "x-rpc-client_type": CLIENT_TYPE,
        "x-rpc-device_id": uuid.v4(),
        "cookie": cookie,

        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,en-US;q=0.8",
        "Origin": "https://webstatic.mihoyo.com"
    };
}


async function getRole(cookie) {
    if (cookie.length === 0) {
        console.info('cookie错误，重新获取!!!')
        return 0;
    }
    //利用cookie登录
    return await $axios.request({
        url: GET_ROLE_URL, headers: {"cookie": cookie}, method: 'GET'
    }).then(async res => {
        if (res.data['retcode'] !== 0) {//登录未成功
            console.info('帐号未登录！请检查cookie!!!');
            return 0;
        }
        return res;
    }).catch(err => {
        console.error('登录错误\n' + err);
        return 0;
    });
}

// async function captchaPass(gt, challenge) {
//     const GEETEST = 'https://apiv6.geetest.com/ajax.php?gt={}&challenge={}&lang=zh-cn&pt=3&client_type=web_mobile&callback=geetest_1665115368313';
//     return $axios.request({url: GEETEST.format(gt, challenge), method: 'GET'}).then(async res => {
//         const jsonp = await res.data
//         const raw = jsonp.match(/^[^(]*?\((.*)\)[^)]*$/)?.[1]
//         return JSON.parse(raw)
//     });
// }

// captchaPass(data.data['gt'], data.data['challenge']).then(geetest => {
//     if (geetest?.validate) {
//         YuanShen_Sign_In(res_, cookie, {
//             'x-rpc-challenge': data.data['challenge'],
//             'x-rpc-validate': geetest.validate,
//             'x-rpc-seccode': geetest.validate + '%7Cjordan'
//         });
//     }
// });

async function Sign_In(res, cookie) {
    if (res !== 0) {
        const [role] = res.data.data.list;
        const {game_uid, region, region_name, nickname, level} = role;
        const post_data = `{"act_id":"${ACT_ID}","region":"${region}","uid":"${game_uid}"}`;
        return await $axios.request({
            url: SIGN_URL, headers: await getHeaders(cookie), data: post_data, method: 'POST'
        }).then(async res => {
            const res_data = res.data;
            const res_data_data = res.data;
            let message = `【${region_name}】[ Lv : ${level} ]\n【${nickname}】[ UID : ${game_uid} ]\n`
            switch (res_data["retcode"]) {
                case 0:
                    switch (res_data_data.data['risk_code']) {
                        case 375:
                            message = `${message}【提示】[本次签到被判定为机器行为，请前往米游社完成机器验证后手动签到!]\n`;
                            break;
                        default:
                            message = `${message}【提示】[签到成功!]\n`;
                            break;
                    }
                    break;
                case -5003:
                    message = `${message}【提示】[今天已经签到过了!]\n`;
                    break;
            }
            return message;
        }).catch(err => {
            console.error('签到错误\n' + err);
        });
    }
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

async function main() {
    //打印标题
    console.info('[米游社 原神签到]\n');
    //获取配置路径
    const {configpath} = parse_arguments();
    //获取cookies
    const cookies = await getCookies(configpath);
    //签到
    console.info('共获取' + cookies.length + '个用户\n');
    for (const i in cookies) {
        console.info(`第${Number(i) + 1}位用户开始签到...`)
        const res = await getRole(cookies[i]);
        const message = await Sign_In(res, cookies[i])
        console.info(message ? message : '')
        await sleep(3000);
    }
}

main().then();