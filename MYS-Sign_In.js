const axios = require('axios');
const {program} = require('commander');
const md5 = require('md5');
const fs = require('fs');
const uuid = require('uuid');

const ACT_ID = 'e202009291139501';
const GET_ROLE_URL = "https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie?game_biz=hk4e_cn";
const SIGN_URL = "https://api-takumi.mihoyo.com/event/bbs_sign_reward/sign";
const REFERER = "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?bbs_auth_required=true&act_id=e202009291139501&utm_source=bbs&utm_medium=mys&utm_campaign=icon";
const HOST = "api-takumi.mihoyo.com";

const SYS_VERSION = "12";
const APP_VERSION = "2.38.1";
const CLIENT_TYPE = "5";
const USER_AGENT = `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`;

let headers = {
    "DS": '',
    "cookie": '',
    "x-rpc-challenge": '',
    "x-rpc-validate": '',
    "x-rpc-seccode": '',
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,en-US;q=0.8",
    "Origin": "https://webstatic.mihoyo.com",
    "User-Agent": USER_AGENT,
    "Referer": REFERER,
    "Host": HOST,
    "x-rpc-sys_version": SYS_VERSION,
    "x-rpc-app_version": APP_VERSION,
    "x-rpc-client_type": CLIENT_TYPE,
    "x-rpc-device_id": uuid.v4()
}

function parse_arguments() {
    program.option('--configpath <>', '配置路径', './ysconfig.json').parse();
    return program.opts();
}

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))

const $axios = axios.create({
    // timeout: 15000
});

async function getConfig(configPath) {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
}

async function getDS() {
    const s = "yUZ3s0Sna1IrSNfk29Vo6vRapdOyqyhB";
    const t = Math.floor(Date.now() / 1e3);
    const r = Math.random().toString(36).slice(-6);
    const c = `salt=${s}&t=${t}&r=${r}`;
    return `${t},${r},${md5(c)}`;
}

async function setHeaders(cookie, ds, challenge, validate) {
    headers.cookie = cookie;
    headers.DS = ds;
    headers['x-rpc-challenge'] = challenge;
    headers['x-rpc-validate'] = validate;
    headers['x-rpc-seccode'] = `${validate}|jordan`;
}


async function getRole(config) {
    const cookie = config.cookie;
    if (cookie === 0) {
        console.info('cookie错误，重新获取!!!')
        return 0;
    }
    //利用cookie登录
    return await $axios.request({
        method: 'GET', url: GET_ROLE_URL, headers: {"cookie": cookie}
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

async function getValidate(config, gt, challenge) {
    const OCR_URL = `https://api.ocr.kuxi.tech/api/recognize?token=${config['OCR_TOKEN']}&gt=${gt}&challenge=${challenge}&referer=${REFERER}`;
    const res = await $axios.request({method: 'POST', url: OCR_URL});
    if (res.data.code !== 0) {
        return null;
    }
    return res.data.data['validate'];
}


async function Sign_In(res, config) {
    if (res !== 0) {
        const cookie = config.cookie;
        const [role] = res.data.data.list;
        const {game_uid, region, region_name, nickname, level} = role;
        const post_data = `{"act_id":"${ACT_ID}","region":"${region}","uid":"${game_uid}"}`;
        await setHeaders(cookie, await getDS(), '', '')
        const count = 3;//重试次数
        for (let i = 0; i <= count; i++) {
            if (i !== 0) {
                console.info(`触发验证码，即将进行第${i}次重试，最多3次`)
            }

            const res = await $axios.request({
                method: 'POST', url: SIGN_URL, headers: headers, data: post_data
            });
            console.log(res.data)
            const res_data = res.data;
            const res_data_data = res.data;
            let message = `【${region_name}】[ Lv : ${level} ]\n【${nickname}】[ UID : ${game_uid} ]\n`

            //签到成功
            if (res_data["retcode"] === 0 && Number(res_data_data.data["success"]) === 0) {
                message = `${message}【提示】[签到成功!]\n`;
                console.info(message)
                break;
            } else if (res_data["retcode"] === -5003) {            //签过到直接跳过
                message = `${message}【提示】[今天已经签到过了!]\n`;
                console.info(message);
                break;
            } else if (i === count && Number(res_data_data.data["success"]) === -1) {
                message = `${message}【提示】[签到失败!]\n`;
                console.info(message)
            }

            //同ip请求次数过多
            if (res_data["retcode"] === 429) {
                console.info('429 请求过多，即将进入下一次请求')
                await sleep(10000); //429同ip请求次数过多，尝试sleep10s进行解决
                continue;
            }

            //触发验证码
            if (res_data["retcode"] === 0 && Number(res_data_data.data["success"]) === 1) {
                if (config['OCR_TOKEN'].length > 0) {
                    const validate = await getValidate(config, res_data_data.data['gt'], res_data_data.data['challenge'])
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

async function main() {
    //打印标题
    console.info('[米游社 原神签到]\n');
    //获取配置路径
    const {configpath} = parse_arguments();
    //获取config中YuanShenList
    const config = await getConfig(configpath);
    //获取config中YuanShen
    const YuanShenConfig = config['YuanShen'];
    //签到
    console.info('共获取' + YuanShenConfig.length + '个用户\n');
    for (const i in YuanShenConfig) {
        console.info(`第${Number(i) + 1}位用户开始签到...`)
        const res = await getRole(YuanShenConfig[i]);
        await Sign_In(res, YuanShenConfig[i])
        await sleep(3000);
    }
}

main().then();