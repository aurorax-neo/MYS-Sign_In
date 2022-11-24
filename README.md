## 配置文件

在MYS-Sign_In.js同级目录下创建ysconfig.json为文件，内容如下：

###### 	注：

[			OCR_TOKEN获取](https://ocr.kuxi.tech/user/login)

​			配置字段不可以删除！！！

##### 说明：

```
{
  "YuanShen": [
    {
      "cookie": "",	# 米游社cookie
      "OCR_TOKEN": "",# OCR验证码识别ttoken
      "DD_BOT": {# 钉钉自定义机器人推送配置
        "SWITCH": false,# 开关（true开，false关）
        "DD_BOT_SECRET": "",# SECRET
        "DD_BOT_TOKEN": ""# TOKEN
      }
    },
    {
      "cookie": "",
      "OCR_TOKEN": "",
      "DD_BOT": {
        "SWITCH": false,
        "DD_BOT_SECRET": "",
        "DD_BOT_TOKEN": ""
      }
    },
    ...
  ]
}
```

##### 例如：

```
{
  "YuanShen": [
    {
      "cookie": "",
      "OCR_TOKEN": "",
      "DD_BOT": {
        "SWITCH": false,
        "DD_BOT_SECRET": "xxx",
        "DD_BOT_TOKEN": "xxx"
      }
    },
    {
      "cookie": "",
      "OCR_TOKEN": "",
      "DD_BOT": {
        "SWITCH": false,
        "DD_BOT_SECRET": "xxx",
        "DD_BOT_TOKEN": "xxx"
      }
    }
  ]
}
```

也可以通过传入--configpath xxx/xxx.json（配置文件全路径）指定配置文件。



## 获取米游社Cookie

###### 注：

由于米忽悠修改了bbs接口导致一次获取的Cookie缺失，所以需要增加步骤

1. 打开你的浏览器,进入无痕/隐身模式；
2. 打开 http://bbs.mihoyo.com/ys 并进行登入操作；
3. 在上一步登入完成后新建标签页，打开 http://user.mihoyo.com 并进行登入操作；
4. 按下键盘上的F12或右键检查,打开开发者工具,点击Console/控制台，复制粘贴以下代码；

```js
const cookie = document.cookie
const ask = confirm('Cookie:' + cookie + '\n\nDo you want to copy the cookie to the clipboard?')
if (ask == true) {
  copy(cookie)
  msg = cookie
} else {
  msg = 'Cancel'
}
```

然后安回车，此时Cookie已经复制到你的粘贴板上了。

