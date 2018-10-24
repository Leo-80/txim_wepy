
var webim = require('../utils/imsdk/webim_wx');

var selToID
    ,loginInfo
    ,accountMode = 0 
    ,accountType = 36883
    ,sdkAppID = 1400134257 //用户所属应用id,必填
    ,avChatRoomId
    ,selType = webim.SESSION_TYPE.C2C
    ,selSess
    ,selSessHeadUrl
    ,friendHeadUrl
    ,reqMsgCount= 15
    ,loginOptions

//监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
//newMsgList 为新消息数组，结构为[Msg]
function onMsgNotify(newMsgList,callback) {
    console.log("=====newMsgList:",newMsgList);
    var sess, newMsg;
    //获取所有聊天会话
    var sessMap = webim.MsgStore.sessMap();
    for (var j in newMsgList) {//遍历新消息
        newMsg = newMsgList[j];
        if (newMsg.getSession().id() == selToID) {//为当前聊天对象的消息
            selSess = newMsg.getSession();
            //在聊天窗体中新增一条消息
            //console.warn(newMsg);
            var msg = convertMsgtoHtml(newMsg)
            console.log("==========msg:",msg);
            callback(msg);
        }
    }
    //消息已读上报，以及设置会话自动已读标记
    webim.setAutoRead(selSess, true, true);
    for (var i in sessMap) {
        sess = sessMap[i];
        if (selToID != sess.id()) {//更新其他聊天对象的未读消息数
            updateSessDiv(sess.type(), sess.id(), sess.unread());
        }
    }
}
//sdk登录
function sdkLogin(userInfo, listeners) {
    userInfo = {
        'sdkAppID': sdkAppID,
        'appIDAt3rd':sdkAppID, 
        'accountType': accountType,
        'identifier': userInfo.identifier,
        'identifierNick': userInfo.identifierNick, 
        'userSig':userInfo.userSig
    },
    loginOptions ={
        'isAccessFormalEnv': true, // 是否访问正式环境，默认访问正式，选填
        'isLogOn': true// 是否开启控制台打印日志,默认开启，选填
    }   
    //web sdk 登录
    webim.login(userInfo, listeners, loginOptions,
        function (identifierNick) {           
            //identifierNick为登录用户昵称(没有设置时，为帐号)，无登录态时为空
            console.debug(identifierNick);
            webim.Log.info('webim登录成功');
            loginInfo = userInfo;
            setProfilePortrait({
                'ProfileItem': [{
                    "Tag": "Tag_Profile_IM_Nick",
                    "Value": userInfo.identifierNick
                }]
            },function(){             
            })
        },
        function (err) {            
            console.error("00000000",err.ErrorCode,err.ErrorInfo);
        }
    );//
}

//修改昵称
function setProfilePortrait(options,callback){
    webim.setProfilePortrait(options,
        function(res){
            webim.Log.info('修改昵称成功');
            callback && callback();
            this.searchProfileByUserId(selToID)
        },
        function(){

        }
    );
}
//搜索用户
function searchProfileByUserId(userid){
    if (userid.length == 0) {
        alert('请输入用户ID');
        return;
    }
    if (webim.Tool.trimStr(userid).length == 0) {
        alert('您输入的用户ID全是空格,请重新输入');
        return;
    }
    var tag_list = [
        "Tag_Profile_IM_Nick",//昵称
        "Tag_Profile_IM_Gender",//性别
        "Tag_Profile_IM_AllowType",//加好友方式
        "Tag_Profile_IM_Image"//头像
    ];
    var options = {
        'To_Account':userid,
        'TagList': tag_list
    };
    webim.getProfilePortrait(
            options,
            function (resp) {
                debugger
                var data = [];
                if (resp.UserProfileItem && resp.UserProfileItem.length > 0) {
                    for (var i in resp.UserProfileItem) {
                        var to_account = resp.UserProfileItem[i].To_Account;
                        var nick = null, gender = null, allowType = null,imageUrl=null;
                        for (var j in resp.UserProfileItem[i].ProfileItem) {
                            switch (resp.UserProfileItem[i].ProfileItem[j].Tag) {
                                case 'Tag_Profile_IM_Nick':
                                    nick = resp.UserProfileItem[i].ProfileItem[j].Value;
                                    break;
                                case 'Tag_Profile_IM_Gender':
                                    switch (resp.UserProfileItem[i].ProfileItem[j].Value) {
                                        case 'Gender_Type_Male':
                                            gender = '男';
                                            break;
                                        case 'Gender_Type_Female':
                                            gender = '女';
                                            break;
                                        case 'Gender_Type_Unknown':
                                            gender = '未知';
                                            break;
                                    }
                                    break;
                                case 'Tag_Profile_IM_AllowType':
                                    switch (resp.UserProfileItem[i].ProfileItem[j].Value) {
                                        case 'AllowType_Type_AllowAny':
                                            allowType = '允许任何人';
                                            break;
                                        case 'AllowType_Type_NeedConfirm':
                                            allowType = '需要确认';
                                            break;
                                        case 'AllowType_Type_DenyAny':
                                            allowType = '拒绝任何人';
                                            break;
                                        default:
                                            allowType = '需要确认';
                                            break;
                                    }
                                    break;
                                case 'Tag_Profile_IM_Image':
                                    imageUrl = resp.UserProfileItem[i].ProfileItem[j].Value;
                                    break;
                            }
                        }
                        data.push({
                            'To_Account': to_account,
                            'Nick': webim.Tool.formatText2Html(nick),
                            'Gender': gender,
                            'AllowType': allowType,
                            'Image': imageUrl
                        });
                    }
                }
                $('#search_profile_table').bootstrapTable('load', data);
            },
            function (err) {
                alert(err.ErrorInfo);
            }
    );
};

//显示消息（群普通+点赞+提示+红包）
function showMsg(msg) {
    var isSelfSend, fromAccount, fromAccountNick, sessType, subType;
    var ul, li, paneDiv, textDiv, nickNameSpan, contentSpan;

    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = '未知用户';
    }
    //解析消息
    //获取会话类型，目前只支持群聊
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();

    isSelfSend = msg.getIsSend();//消息是否为自己发的
    var content = "";
    switch (subType) {

        case webim.GROUP_MSG_SUB_TYPE.COMMON://群普通消息
            content = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.REDPACKET://群红包消息
            content = "[群红包消息]" + convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.LOVEMSG://群点赞消息
            //业务自己可以增加逻辑，比如展示点赞动画效果
            content = "[群点赞消息]" + convertMsgtoHtml(msg);
            //展示点赞动画
            // showLoveMsgAnimation();
            break;
        case webim.GROUP_MSG_SUB_TYPE.TIP://群提示消息
            content = "[群提示消息]" + convertMsgtoHtml(msg);
            break;
    }

    return {
        fromAccountNick : fromAccountNick,
        content : content
    }
}

//把消息转换成Html
function convertMsgtoHtml(msg) {
    var html = "", elems, elem, type, content;
    elems = msg.getElems();//获取消息包含的元素数组
    for (var i in elems) {
        elem = elems[i];
        type = elem.getType();//获取元素类型
        content = elem.getContent();//获取元素对象
        switch (type) {
            case webim.MSG_ELEMENT_TYPE.TEXT:
                html += convertTextMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FACE:
                html += convertFaceMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.IMAGE:
                html += convertImageMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.SOUND:
                html += convertSoundMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.FILE:
                html += convertFileMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.LOCATION://暂不支持地理位置
                //html += convertLocationMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.CUSTOM:
                html += convertCustomMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.GROUP_TIP:
                // html += convertGroupTipMsgToHtml(content);
                break;
            default:
                webim.Log.error('未知消息元素类型: elemType=' + type);
                break;
        }
    }
    return webim.Tool.formatHtml2Text(html);
}

//解析文本消息元素
function convertTextMsgToHtml(content) {
    return content.getText();
}
//解析表情消息元素
function convertFaceMsgToHtml(content) {
    return content.getData();
    return content;
    var faceUrl = null;
    var data = content.getData();
    var index = webim.EmotionDataIndexs[data];

    var emotion = webim.Emotions[index];
    if (emotion && emotion[1]) {
        faceUrl = emotion[1];
    }
    if (faceUrl) {
        return "<img src='" + faceUrl + "'/>";
    } else {
        return data;
    }
}
//解析图片消息元素
function convertImageMsgToHtml(content) {
    var smallImage = content.getImage(webim.IMAGE_TYPE.SMALL);//小图
    var bigImage = content.getImage(webim.IMAGE_TYPE.LARGE);//大图
    var oriImage = content.getImage(webim.IMAGE_TYPE.ORIGIN);//原图
    if (!bigImage) {
        bigImage = smallImage;
    }
    if (!oriImage) {
        oriImage = smallImage;
    }
    return "<img src='" + smallImage.getUrl() + "#" + bigImage.getUrl() + "#" + oriImage.getUrl() + "' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' onclick='imageClick(this)' />";
}
//解析语音消息元素
function convertSoundMsgToHtml(content) {
    var second = content.getSecond();//获取语音时长
    var downUrl = content.getDownUrl();
    if (webim.BROWSER_INFO.type == 'ie' && parseInt(webim.BROWSER_INFO.ver) <= 8) {
        return '[这是一条语音消息]demo暂不支持ie8(含)以下浏览器播放语音,语音URL:' + downUrl;
    }
    return '<audio src="' + downUrl + '" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
}
//解析文件消息元素
function convertFileMsgToHtml(content) {
    var fileSize = Math.round(content.getSize() / 1024);
    return '<a href="' + content.getDownUrl() + '" title="点击下载文件" ><i class="glyphicon glyphicon-file">&nbsp;' + content.getName() + '(' + fileSize + 'KB)</i></a>';

}
//解析位置消息元素
function convertLocationMsgToHtml(content) {
    return '经度=' + content.getLongitude() + ',纬度=' + content.getLatitude() + ',描述=' + content.getDesc();
}
//解析自定义消息元素
function convertCustomMsgToHtml(content) {
    var data = content.getData();
    // var desc = content.getDesc();
    // var ext = content.getExt();

    return "data=" + data;
}

//单击图片事件
function imageClick(imgObj) {
    var imgUrls = imgObj.src;
    var imgUrlArr = imgUrls.split("#"); //字符分割
    var smallImgUrl = imgUrlArr[0];//小图
    var bigImgUrl = imgUrlArr[1];//大图
    var oriImgUrl = imgUrlArr[2];//原图
    webim.Log.info("小图url:" + smallImgUrl);
    webim.Log.info("大图url:" + bigImgUrl);
    webim.Log.info("原图url:" + oriImgUrl);
}


//切换播放audio对象
function onChangePlayAudio(obj) {
    if (curPlayAudio) {//如果正在播放语音
        if (curPlayAudio != obj) {//要播放的语音跟当前播放的语音不一样
            curPlayAudio.currentTime = 0;
            curPlayAudio.pause();
            curPlayAudio = obj;
        }
    } else {
        curPlayAudio = obj;//记录当前播放的语音
    }
}

//单击评论图片
function smsPicClick() {
    if (!loginInfo.identifier) {//未登录
        console.error('请填写帐号和票据');
        return;
    } else {
        // hideDiscussTool();//隐藏评论工具栏
        showDiscussForm();//显示评论表单
    }
}

//发送消息(普通消息)
function onSendMsg(msg,callback) {
    console.log('accountMode',accountMode);
    if (!loginInfo.identifier) {//未登录
        console.error('请填写帐号和票据');
        return;
    }

    if (!selToID) {
        console.error("您还没有进入房间，暂不能聊天");
        return;
    }
    //获取消息内容
    var msgtosend = msg;
    var msgLen = webim.Tool.getStrBytes(msg);

    if (msgtosend.length < 1) {
        console.error("发送的消息不能为空!");
        return;
    }

    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.GROUP) {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        console.error(errInfo);
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    var subType;//消息子类型
    if (selType == webim.SESSION_TYPE.GROUP) {
        //群消息子类型如下：
        //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
        //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
        //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
        //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;

    } else {
        //C2C消息子类型如下：
        //webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    //解析文本和表情
    var expr = /\[[^[\]]{1,3}\]/mg;
    var emotions = msgtosend.match(expr);
    var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
    if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        msg.addText(text_obj);
    } else {//有表情

        for (var i = 0; i < emotions.length; i++) {
            tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
            if (tmsg) {
                text_obj = new webim.Msg.Elem.Text(tmsg);
                msg.addText(text_obj);
            }
            emotionIndex = webim.EmotionDataIndexs[emotions[i]];
            emotion = webim.Emotions[emotionIndex];
            if (emotion) {
                face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
                msg.addFace(face_obj);
            } else {
                text_obj = new webim.Msg.Elem.Text(emotions[i]);
                msg.addText(text_obj);
            }
            restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
            msgtosend = msgtosend.substring(restMsgIndex);
        }
        if (msgtosend) {
            text_obj = new webim.Msg.Elem.Text(msgtosend);
            msg.addText(text_obj);
        }
    }
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            showMsg(msg);
        }
        webim.Log.info("发消息成功");
        callback && callback();

        //hideDiscussForm();//隐藏评论表单
        //showDiscussTool();//显示评论工具栏
        //hideDiscussEmotion();//隐藏表情
    }, function (err) {
        webim.Log.error("发消息失败:" + err.ErrorInfo);
        console.error("发消息失败:" + err.ErrorInfo);
    });
}

function sendCustomMsg(custMsg) {
    if (!selToID) {
        alert("您还没有好友或群组，暂不能聊天");
        return;
    }
    var data = custMsg.data;
    // var desc = custMsg.desc;
    // var ext = custMsg.ext;
    var MsgJson =JSON.stringify(custMsg)
    var msgLen = webim.Tool.getStrBytes(data);
    if (data.length < 1) {
        alert("发送的消息不能为空!");
        return;
    }
    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.C2C) {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        alert(errInfo);
        return;
    }
    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var msg = new webim.Msg(selSess, true,-1,-1,-1,loginInfo.identifier,0,loginInfo.identifierNick);
    var custom_obj = new webim.Msg.Elem.Custom(MsgJson);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if(selType==webim.SESSION_TYPE.C2C){//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            // addMsg(msg);
        }
        // $('#edit_custom_msg_dialog').modal('hide');
    }, function (err) {
        alert(err.ErrorInfo);
    });
}
//获取最新的 C2C 历史消息,用于切换好友聊天，重新拉取好友的聊天消息
var getLastC2CHistoryMsgs = function (cbOk, cbError) {
    if (selType == webim.SESSION_TYPE.GROUP) {
        alert('当前的聊天类型为群聊天，不能进行拉取好友历史消息操作');
        return;
    }
    var lastMsgTime = 0;//第一次拉取好友历史消息时，必须传 0
    var msgKey = '';
    var options = {
        'Peer_Account': selToID, //好友帐号
        'MaxCnt': reqMsgCount, //拉取消息条数
        'LastMsgTime': lastMsgTime, //最近的消息时间，即从这个时间点向前拉取历史消息
        'MsgKey': msgKey
    };
    webim.getC2CHistoryMsgs(
            options,
            function (resp) {
                console.log("000000=======resp:",resp);
                var complete = resp.Complete;//是否还有历史消息可以拉取，1-表示没有，0-表示有
                var retMsgCount = resp.MsgCount;//返回的消息条数，小于或等于请求的消息条数，小于的时候，说明没有历史消息可拉取了
                if (resp.MsgList.length == 0) {
                    webim.Log.error("没有历史消息了:data=" + JSON.stringify(options));
                    return;
                }
                // getPrePageC2CHistroyMsgInfoMap[selToID] = {//保留服务器返回的最近消息时间和消息Key,用于下次向前拉取历史消息
                //     'LastMsgTime': resp.LastMsgTime,
                //     'MsgKey': resp.MsgKey
                // };
                if (cbOk)
                    cbOk(resp.MsgList);
            },
            cbError
            );
}
// 获取未读消息 (非特殊情况无需自己调用)
function getUnreadMsg(){
    webim.syncMsgs(onMsgNotify)
}
// 获取最近联系人
function getRecentContactList(){
    webim.getRecentContactList({
        'Count': 100 //最近的会话数 ,最大为 100
    },function(resp){
       console.log("======resp",resp);
       
    },function(resp){
        //错误回调
        console.log("======error resp",resp);
    });
}
// 获取所有会话
function getSessionList(){
    var sessMap = webim.MsgStore.sessMap();
    var sess;
    console.log("========sessMap:",sessMap);
    for (var i in sessMap) {
        sess = sessMap[i];
        if (selToID != sess.id()) {//更新其他聊天对象的未读消息数
            var unreadCount = sess.unread()
            console.log("=======unreadCount:",unreadCount);
        }
    }
}

//登出
function logout() {
    //登出
    webim.logout(
        function (resp) {
            webim.Log.info('登出成功');
            loginInfo.identifier = null;
            loginInfo.userSig = null;
        }
    );
}

/**
 *  初始化聊天
 * @param {selToID} opts //消息接收方id  
 */
function init(opts){
    selToID = opts.selToID;
}

module.exports = {
    init : init,
    onMsgNotify : onMsgNotify,
    sdkLogin : sdkLogin,
    showMsg : showMsg,
    convertMsgtoHtml : convertMsgtoHtml,
    convertTextMsgToHtml : convertTextMsgToHtml,
    convertFaceMsgToHtml : convertFaceMsgToHtml,
    convertImageMsgToHtml : convertImageMsgToHtml,
    convertSoundMsgToHtml : convertSoundMsgToHtml,
    convertFileMsgToHtml : convertFileMsgToHtml,
    convertLocationMsgToHtml : convertLocationMsgToHtml,
    convertCustomMsgToHtml : convertCustomMsgToHtml,
    imageClick : imageClick,
    onChangePlayAudio : onChangePlayAudio,
    smsPicClick : smsPicClick,
    onSendMsg : onSendMsg,
    logout : logout,
    sendCustomMsg:sendCustomMsg,
    getLastC2CHistoryMsgs:getLastC2CHistoryMsgs,
    getUnreadMsg:getUnreadMsg,
    getRecentContactList:getRecentContactList,
    getSessionList:getSessionList,
};