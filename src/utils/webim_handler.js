
var webim = require('../utils/imsdk/webim_wx');

var selToID
    ,loginInfo
    ,accountMode = 0 
    ,accountType = 36862
    ,sdkAppID = 1400164055 //用户所属应用id,必填
    ,avChatRoomId
    ,selType
    ,selSess
    ,selSessHeadUrl
    ,friendHeadUrl
    ,reqMsgCount= 15
    ,loginOptions
    ,selTypeIsGroup
    ,getPrePageC2CHistroyMsgInfoMap = {}
    ,recentSessMap = {}
    ,getPrePageGroupHistroyMsgInfoMap ={}
    ,totalCount = 200

//监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
//newMsgList 为新消息数组，结构为[Msg]
function onMsgNotify(newMsgList,callback) {
    // var sess, newMsg;
    // //获取所有聊天会话
    // var sessMap = webim.MsgStore.sessMap();
    // for (var j in newMsgList) {//遍历新消息
    //     newMsg = newMsgList[j];
    //     if (newMsg.getSession().id() == selToID) {//为当前聊天对象的消息
    //         selSess = newMsg.getSession();
    //         var msg = convertMsgtoHtml(newMsg)
    //         callback(msg);
    //     }
    // }
    // //消息已读上报，以及设置会话自动已读标记
    // webim.setAutoRead(selSess, true, true);
    // for (var i in sessMap) {
    //     sess = sessMap[i];
    //     if (selToID != sess.id()) {//更新其他聊天对象的未读消息数
    //         updateSessDiv(sess.type(), sess.id(), sess.unread());
    //     }
    // }
}
//监听大群新消息（普通，点赞，提示，红包）
function onBigGroupMsgNotify(msgList,callback) {
    // for (var i = msgList.length - 1; i >= 0; i--) {//遍历消息，按照时间从后往前
    //     var msg = msgList[i];
    //     //console.warn(msg);
    //     webim.Log.warn('receive a new avchatroom group msg: ' + msg.getFromAccountNick());
    //     //显示收到的消息
    //     console.log("Group ---------0000",msg);
    //     callback(msg);
    // }
}
//监听 创建群 系统消息 (创建者接收)
function onCreateGroupNotify(notify) {
}
// 监听 申请加入群通知（只有管理员接收）
function onApplyJoinGroupRequestNotify(notify){}
//监听 被踢出群 系统消息（只有被踢出者接收）
function onKickedGroupNotify(notify) {}
//监听 解散群 系统消息 （全员接收）
function onDestoryGroupNotify(notify) {}
//监听 主动退群 系统消息（主动退出者接收）
function onQuitGroupNotify(notify) {}
//监听 群被回收 系统消息（全员接收）
function onRevokeGroupNotify(notify) {}

//sdk登录
function sdkLogin(userInfo, listeners) {
    userInfo = {
        'sdkAppID': sdkAppID,
        'appIDAt3rd':sdkAppID, 
        'accountType': accountType,
        'identifier': userInfo.identifier,
        'identifierNick': userInfo.identifierNick,
        'selSessHeadUrl': userInfo.selSessHeadUrl,
        'userSig':userInfo.userSig
    },
    loginOptions ={
        'isAccessFormalEnv': true, // 是否访问正式环境，默认访问正式，选填
        'isLogOn': true// 是否开启控制台打印日志,默认开启，选填
    }   
    //web sdk 登录
    return new Promise((resolve,reject)=>{
        webim.login(userInfo, listeners, loginOptions,
            function (identifierNick) {           
                //identifierNick为登录用户昵称(没有设置时，为帐号)，无登录态时为空
                console.debug(identifierNick);
                webim.Log.info('webim登录成功');
                loginInfo = userInfo;
                setProfilePortrait({
                    identifierNick: userInfo.identifierNick,
                       selSessHeadUrl: userInfo.selSessHeadUrl
                  },function(){
                    resolve()
                    console.log('群登录！！！');      
                })
                resolve()
            },
            function (err) {  
                reject(err)    
                console.error("00000000",err.ErrorCode,err.ErrorInfo);
            }
        );
    })
}

//修改昵称
function setProfilePortrait(options){

    return new Promise((resolve,reject)=>{
        if (!options.identifierNick || !options.selSessHeadUrl) {
            console.error("昵称或头像不能为空");
            reject()
        }
        var opt = {
            'ProfileItem':
              [
                {
                  'Tag': 'Tag_Profile_IM_Nick',
                  'Value': options.identifierNick ? options.identifierNick:'null'
                },
                {
                  'Tag': 'Tag_Profile_IM_Image',
                  'Value': options.selSessHeadUrl ? options.selSessHeadUrl:'null'
                }
              ]
          }
          webim.setProfilePortrait(opt,
            function(res){
                webim.Log.info('修改昵称成功');
               resolve()
            },
            function(err){
                console.error(err.ErrorInfo);
                reject(err.ErrorInfo)
            }
        );
    })
}
//搜索用户
// 搜索用户
function searchProfileByUserId(userid) {

    return new Promise((resolve,reject)=>{
        if (userid.length == 0) {
            console.error('请输入用户ID')
            reject();
          }
        if (webim.Tool.trimStr(userid).length == 0) {
            console.error('您输入的用户ID全是空格,请重新输入');
            reject();
          }
          var tag_list = [
            'Tag_Profile_IM_Nick', // 昵称
            'Tag_Profile_IM_Image'// 头像
          ]
          var options = {
            'To_Account': [userid],
            'TagList': tag_list
          }
          webim.getProfilePortrait(
                  options,
                  function (resp) {
                    if (resp.UserProfileItem.length > 0) {
                        const profileItems = resp.UserProfileItem[0].ProfileItem
                        const profileItem = {}
                        for (const index in profileItems) {
                            const item = profileItems[index]
                            if (item.Tag == 'Tag_Profile_IM_Nick') {
                                profileItem.nick = item.Value
                              }
                            if (item.Tag == 'Tag_Profile_IM_Image') {
                                profileItem.avatarUrl = item.Value
                              }
                          }
                        resolve(profileItem)
                      }
                  },
                  function (err) {
                    reject(err.errInfo)
                  }
          )
    })
  }

//发送消息(普通消息)
function onSendMsg(msg_josn) {
    
    // console.log('==== onSendMsg msg_josn',msg_josn,selType);
    return new Promise((resolve,reject)=>{

    if (!loginInfo.identifier) {//未登录
        console.error('请填写帐号和票据');
        reject();
    }

    if (!selToID) {
        console.error("您还没有进入房间，暂不能聊天");
        reject();
    }
    //获取消息内容
    var msgtosend = JSON.stringify(msg_josn);
    var msgLen = webim.Tool.getStrBytes(msg_josn);

    if (msgtosend.length < 1) {
        console.error("发送的消息不能为空!");
        reject();
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
        reject();
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
            // if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
                
            // }
            webim.Log.info("发消息成功");
            resolve(resp)
            //hideDiscussForm();//隐藏评论表单
            //showDiscussTool();//显示评论工具栏
            //hideDiscussEmotion();//隐藏表情
        }, function (err) {
            webim.Log.error("发消息失败:" + err.ErrorInfo);
            reject(err.ErrorInfo);
        });
    })
}
/**
 * 发送自定义消息，其中MsgShow字段为[其它] 如果在对话列表需要显示最后一条消息（慎用）
 * MsgShow代表最后一条消息
 * @param {*} custMsg 
 */
function sendCustomMsg(custMsg) {
    return new Promise((resolve,reject)=>{
        if (!selToID) {
            console.error("您还没有好友或群组，暂不能聊天");
            reject();
        }
        var data = custMsg.data;
        var MsgJson =JSON.stringify(custMsg)
        var msgLen = webim.Tool.getStrBytes(data);
        if (data.length < 1) {
            console.error("发送的消息不能为空!");
            reject();
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
            console.error(errInfo);
            reject();
        }
        if (!selSess) {
            selSess = new webim.Session(selType, selToID, selToID, friendHeadUrl, Math.round(new Date().getTime() / 1000));
        }
        var msg = new webim.Msg(selSess, true,-1,-1,-1,loginInfo.identifier,0,loginInfo.identifierNick);
        var custom_obj = new webim.Msg.Elem.Custom(MsgJson);
        msg.addCustom(custom_obj);
    //调用发送消息接口
    
        webim.sendMsg(msg, function (resp) {
            // if(selType==webim.SESSION_TYPE.C2C){//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            //     cbOk(resp)
            // }
            resolve(resp)
        }, function (err) {
            reject(err.ErrorInfo);
        });
    })
}
/**
 * 向上翻页，获取更早的好友历史消息
 * @param {*} cbOk 
 * @param {*} cbError 
 */
function getPrePageC2CHistoryMsgs(){
    return new Promise ((resolve,reject)=>{

        if (selType == webim.SESSION_TYPE.GROUP) {
            console.error('当前的聊天类型为群聊天，不能进行拉取好友历史消息操作');
            return;
        }
        var tempInfo = getPrePageC2CHistroyMsgInfoMap[selToID] //获取上一次拉取的c2c消息时间和消息Key
        var lastMsgTime
        var msgKey
        if (tempInfo) {
            lastMsgTime = tempInfo.LastMsgTime
            msgKey = tempInfo.MsgKey
        } else {
            console.error('获取下一次拉取的c2c消息时间和消息Key为空');
            return;
        }
        var options = {
            'Peer_Account': selToID, // 好友帐号
            'MaxCnt': reqMsgCount, // 拉取消息条数
            'LastMsgTime': lastMsgTime, // 最近的消息时间，即从这个时间点向前拉取历史消息
            'MsgKey': msgKey
        }
      
        webim.getC2CHistoryMsgs(
            options,
            function(resp) {
              var complete = resp.Complete //是否还有历史消息可以拉取，1-表示没有，0-表示有
                if (resp.MsgList.length == 0) {
                  webim.Log.warn('没有历史消息了:data=' + JSON.stringify(options))
                    return;
                }
              getPrePageC2CHistroyMsgInfoMap[selToID] = { // 保留服务器返回的最近消息时间和消息Key,用于下次向前拉取历史消息
                  'LastMsgTime': resp.LastMsgTime,
                  'MsgKey': resp.MsgKey
                }
                resolve(resp.msgList)
            },function(err){
                reject(err.ErrorInfo)
            }
        )
      })
  };
//获取最新的 C2C 历史消息,用于切换好友聊天，重新拉取好友的聊天消息
function getLastC2CHistoryMsgs(){
    return new Promise((resolve,reject)=>{

        if (selType == webim.SESSION_TYPE.GROUP) {
            console.error('当前的聊天类型为群聊天，不能进行拉取好友历史消息操作');
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
                var complete = resp.Complete;//是否还有历史消息可以拉取，1-表示没有，0-表示有
                var retMsgCount = resp.MsgCount;//返回的消息条数，小于或等于请求的消息条数，小于的时候，说明没有历史消息可拉取了
                if (resp.MsgList.length == 0) {
                    webim.Log.error("没有历史消息了:data=" + JSON.stringify(options));
                    return;
                }
                getPrePageC2CHistroyMsgInfoMap[selToID] = {//保留服务器返回的最近消息时间和消息Key,用于下次向前拉取历史消息
                    'LastMsgTime': resp.LastMsgTime,
                    'MsgKey': resp.MsgKey
                };
                    resolve(resp.MsgList)
            },function(err){
                reject(err.ErrorInfo)
            }
        );
    })
}
//获取最新的群历史消息,用于切换群组聊天时，重新拉取群组的聊天消息
function getLastGroupHistoryMsgs() {
    return new Promise((resolve,reject)=>{
        if (selType == webim.SESSION_TYPE.C2C) {
            console.error('当前的聊天类型为好友聊天，不能进行拉取群历史消息操作');
            reject();
        }
        getGroupInfo(selToID, function(resp) {
            //拉取最新的群历史消息
            var options = {
                'GroupId': selToID,
                'ReqMsgSeq': resp.GroupInfo[0].NextMsgSeq - 1,
                'ReqMsgNumber': reqMsgCount
            };
            if (options.ReqMsgSeq == null || options.ReqMsgSeq == undefined || options.ReqMsgSeq <= 0) {
                webim.Log.warn("该群还没有历史消息:options=" + JSON.stringify(options));
                return;
            }
            selSess = null;
            webim.MsgStore.delSessByTypeId(selType, selToID);
            recentSessMap[webim.SESSION_TYPE.GROUP + "_" + selToID] = {};

            recentSessMap[webim.SESSION_TYPE.GROUP + "_" + selToID].MsgGroupReadedSeq = resp.GroupInfo && resp.GroupInfo[0] && resp.GroupInfo[0].MsgSeq;
                webim.syncGroupMsgs(
                    options,
                    function(msgList) {
                        if (msgList.length == 0) {
                            webim.Log.warn("该群没有历史消息了:options=" + JSON.stringify(options));
                            return;
                        }
                        var msgSeq = msgList[0].seq - 1;
                        getPrePageGroupHistroyMsgInfoMap[selToID] = {
                            "ReqMsgSeq": msgSeq
                        };
                        resolve(msgList)
                    },function(err) {
                        reject(err.ErrorInfo)
                        console.error(err.ErrorInfo);
                    }
                );
        })
    });
};

//向上翻页，获取更早的群历史消息
function getPrePageGroupHistoryMsgs() {
    return new Promise((resolve,reject)=>{
        if (selType == webim.SESSION_TYPE.C2C) {
            console.error('当前的聊天类型为好友聊天，不能进行拉取群历史消息操作');
            return;
        }
        var tempInfo = getPrePageGroupHistroyMsgInfoMap[selToID]; //获取下一次拉取的群消息seq
        var reqMsgSeq;
        if (tempInfo) {
            reqMsgSeq = tempInfo.ReqMsgSeq;
            if (reqMsgSeq <= 0) {
                webim.Log.warn('该群没有历史消息可拉取了');
                return;
            }
        } else {
            webim.Log.error('获取下一次拉取的群消息seq为空');
            return;
        }
        var options = {
            'GroupId': selToID,
            'ReqMsgSeq': reqMsgSeq,
            'ReqMsgNumber': reqMsgCount
        };
        webim.syncGroupMsgs(
            options,
            function(msgList) {
                if (msgList.length == 0) {
                    webim.Log.warn("该群没有历史消息了:options=" + JSON.stringify(options));
                    return;
                }
                var msgSeq = msgList[0].seq - 1;
                getPrePageGroupHistroyMsgInfoMap[selToID] = {
                    "ReqMsgSeq": msgSeq
                };
                resolve(msgList)
            },
            function(err) {
                reject(err.ErrorInfo)
                console.error(err.ErrorInfo);
            }
        );
    })
};

//读取群组基本资料-高级接口
var getGroupInfo = function(group_id, cbOK, cbErr) {
    var options = {
        'GroupIdList': [
            group_id
        ],
        'GroupBaseInfoFilter': [
            'Type',
            'Name',
            'Introduction',
            'Notification',
            'FaceUrl',
            'CreateTime',
            'Owner_Account',
            'LastInfoTime',
            'LastMsgTime',
            'NextMsgSeq',
            'MemberNum',
            'MaxMemberNum',
            'ApplyJoinOption',
            'ShutUpAllMember'
        ],
        'MemberInfoFilter': [
            'Account',
            'Role',
            'JoinTime',
            'LastSendMsgTime',
            'ShutUpUntil'
        ]
    };
    webim.getGroupInfo(
        options,
        function(resp) {
            if (resp.GroupInfo[0].ShutUpAllMember == 'On') {
                console.error('该群组已开启全局禁言');
            }
            if (cbOK) {
                cbOK(resp);
            }
        },
        function(err) {
            cbErr(err.ErrorInfo);
        }
    );
};

// 获取未读消息 (非特殊情况无需自己调用)
function getUnreadMsg(){
    return new Promise((resolve,reject)=>{
        webim.syncMsgs(function () {
            let sessMap = webim.MsgStore.sessMap()
            if(sessMap){
                resolve(sessMap)
            }else{
                reject('sessMap is null')
            }
        })
    })
}
/**
 * 标记已读
 * @param {*} selSess
 */
function msgAutoRead(selSess, autoread) {
    webim.setAutoRead(selSess, autoread, true)
}

// 获取最近联系人
function getRecentContactList(){

    return new Promise((resolve,reject)=>{
        webim.getRecentContactList({
            'Count': 100 //最近的会话数 ,最大为 100
        },function(resp){
           console.log("======resp",resp);
           resolve(resp)
        },function(err){
            //错误回调
            console.log("======error",err.ErrorInfo);
            reject(err.ErrorInfo)
        });
    })
}
// 获取所有会话
function getSessionList(cbOk){
    
    return new Promise((resolve,reject)=>{
        let sessMap = webim.MsgStore.sessMap();
        let sess,list=[];
        for (var i in sessMap) {
            sess = sessMap[i];
            if (selToID != sess.id()) {//更新其他聊天对象的未读消息数
                const data = updateSessDiv(sess.type(),sess.id(),sess.unread())
                list.push(data)
            }
        }
        if (list.length > 0) {
            resolve(list)
        }else{
            reject('list is null')
        }
    })
}
// 忘记是做什么用的了，带补充注释
function updateSessDiv(sess_type, to_id, unread_msg_count) {
    var selSess = webim.MsgStore.sessByTypeId(sess_type, to_id)
    var data = {}
      for (var i in selSess._impl.msgs) {
        var newMsg = selSess._impl.msgs[i]
          data = convertMsgtoHtml(newMsg)
          data = JSON.parse(data)
          data.unread = unread_msg_count
      }
    return data
  }
/**
 * 获取当前会话
 * @param {*} to_id 好友id
 * @param {*} callback
 */
function currentSessById(to_id) {

    return new Promise((resolve,reject)=>{
        let sess_type = selType //根据初始化设置来获取单聊或群聊当前会话
        var selSess = webim.MsgStore.sessByTypeId(sess_type, to_id)
        if(selSess){
            resolve(selSess)
        }else{
            reject('selSess is null')
        }
    })
  }
/**
 * 删除当前会话
 * @param {*} chatType =1  // C2C
 * @param {*} to_id  好友 id
 */
function delChat(to_id) {
    return new Promise((resolve,reject)=>{
        var data = {
            'To_Account': to_id,
            'chatType': selTypeIsGroup?'2':'1'
          }
        webim.deleteChat(
              data,
              function(resp) {
                resolve(resp)
              },function(err){
                  reject(err.ErrorInfo)
              }
          )
    })
  }

/**
 * 创建群 
 * 群类型 type详解地址
 * https://cloud.tencent.com/document/product/269/1502#.E7.BE.A4.E7.BB.84.E5.BD.A2.E6.80.81.E4.BB.8B.E7.BB.8D
 * @param {groupId,gType,gName} groupInfo 
 * @param {*} cbOk 
 * @param {*} cbError 
 */
function createBigGroup(groupInfo) {
    return new Promise((resolve,reject)=>{
        if (!groupInfo.groupId) {
            console.error('群ID不能为空');
            reject()
        }
        var options = {
        'GroupId': groupInfo.groupId,
        'Owner_Account': loginInfo.identifier,
        'Type': groupInfo.gType ?  groupInfo.gType:'Public', //ChatRoom
        'Name': groupInfo.gName? groupInfo.gName:'DemoGroup',
        'MemberList': [],
        "ApplyJoinOption": "FreeAccess"  // 申请加群处理方式（选填）
        };
    
        webim.createGroup(
            options,
            function (resp) {
                console.info( 'succ' )
                resolve(resp);
            },
            function (err) {
              console.error(err.ErrorInfo);
              reject(err);
            }
          );
    })
  }
  
  //加入大群
  function applyJoinBigGroup(groupId) {
      var options = {
          'GroupId': groupId//群id
      };
      return new Promise((resolve,reject)=>{
        webim.applyJoinBigGroup(
            options,
            function (resp) {
                if (resp.JoinedStatus && resp.JoinedStatus == 'JoinedSuccess') {
                    webim.Log.info('进群成功');
                    selToID = groupId;
                    resolve('JoinedSuccess')
                } else {
                    reject('JoinedFail')
                    console.error('进群失败');
                }
            },function (err) {
                console.error(err.ErrorInfo);
                reject(err.ErrorInfo)
            }
        );
      })
  }
//获取我的群组
function getMyGroupList() {
    // initGetMyGroupTable([]);
    var options = {
        'Member_Account': loginInfo.identifier,
        'Limit': totalCount,
        'Offset': 0,
        //'GroupType':'',
        'GroupBaseInfoFilter': [
            'Type',
            'Name',
            'Introduction',
            'Notification',
            'FaceUrl',
            'CreateTime',
            'Owner_Account',
            'LastInfoTime',
            'LastMsgTime',
            'NextMsgSeq',
            'MemberNum',
            'MaxMemberNum',
            'ApplyJoinOption',
            'ShutUpAllMember'
        ],
        'SelfInfoFilter': [
            'Role',
            'JoinTime',
            'MsgFlag',
            'UnreadMsgNum'
        ]
    };
    return new Promise((resolve,reject)=>{
            webim.getJoinedGroupListHigh(
                options,
                function (resp) {
                    if (!resp.GroupIdList || resp.GroupIdList.length == 0) {
                        console.error('您目前还没有加入任何群组');
                        return;
                    }
                    var data = [];
                    for (var i = 0; i < resp.GroupIdList.length; i++) {
                        var group_id = resp.GroupIdList[i].GroupId;
                        var name = webim.Tool.formatText2Html(resp.GroupIdList[i].Name);
                        var type_en = resp.GroupIdList[i].Type;
                        var type = webim.Tool.groupTypeEn2Ch(resp.GroupIdList[i].Type);
                        var role_en = resp.GroupIdList[i].SelfInfo.Role;
                        var role = webim.Tool.groupRoleEn2Ch(resp.GroupIdList[i].SelfInfo.Role);
                        var msg_flag = webim.Tool.groupMsgFlagEn2Ch(
                        resp.GroupIdList[i].SelfInfo.MsgFlag);
                        var msg_flag_en = resp.GroupIdList[i].SelfInfo.MsgFlag;
                        var join_time = webim.Tool.formatTimeStamp(
                        resp.GroupIdList[i].SelfInfo.JoinTime);
                        var member_num = resp.GroupIdList[i].MemberNum;
                        var notification = webim.Tool.formatText2Html(
                        resp.GroupIdList[i].Notification);
                        var introduction = webim.Tool.formatText2Html(
                        resp.GroupIdList[i].Introduction);
                        var ShutUpAllMember = resp.GroupIdList[i].ShutUpAllMember;
                        data.push({
                            'GroupId': group_id,
                            'Name': name,
                            'TypeEn': type_en,
                            'Type': type,
                            'RoleEn': role_en,
                            'Role': role,
                            'MsgFlagEn': msg_flag_en,
                            'MsgFlag': msg_flag,
                            'MemberNum': member_num,
                            'Notification': notification,
                            'Introduction': introduction,
                            'JoinTime': join_time,
                            'ShutUpAllMember': ShutUpAllMember
                        });
                    }
                    //打开我的群组列表对话框
                    // $('#get_my_group_table').bootstrapTable('load', data);
                    // $('#get_my_group_dialog').modal('show');
                    resolve(data)
                },
                function (err) {
                    reject(err.ErrorInfo)
                }
        );
    })
}
//读取群组成员
function getGroupMemberInfo(group_id) {
    
    return new Promise((resolve,reject)=>{
        if(!group_id){
            console.error('群组id为空');
            return
        }
        var options = {
            'GroupId': group_id,
            'Offset': 0, //必须从0开始
            'Limit': totalCount,
            'MemberInfoFilter': [
                'Account',
                'Role',
                'JoinTime',
                'LastSendMsgTime',
                'ShutUpUntil'
            ]
        };
            webim.getGroupMemberInfo(
                options,
                function (resp) {
                    if (resp.MemberNum <= 0) {
                        console.error('该群组目前没有成员');
                        return;
                    }
                    var data = [];
                    for (var i in resp.MemberList) {
                        var account = resp.MemberList[i].Member_Account;
                        var role = webim.Tool.groupRoleEn2Ch(resp.MemberList[i].Role);
                        var join_time = webim.Tool.formatTimeStamp(
                        resp.MemberList[i].JoinTime);
                        var shut_up_until = webim.Tool.formatTimeStamp(
                        resp.MemberList[i].ShutUpUntil);
                        if (shut_up_until == 0) {
                            shut_up_until = '-';
                        }
                        data.push({
                            GroupId: group_id,
                            Member_Account: account,
                            Role: role,
                            JoinTime: join_time,
                            ShutUpUntil: shut_up_until
                        });
                    }
                    // $('#get_group_member_table').bootstrapTable('load', data);
                    // $('#get_group_member_dialog').modal('show');
                    resolve(data)
                },
                function (err) {
                    // alert(err.ErrorInfo);
                    reject(err.ErrorInfo)
                }
        );
    })
    
}

//登出
function logout() {
    return new Promise((resolve,reject)=>{
        webim.logout(
            function (resp) {
                webim.Log.info('登出成功');
                loginInfo.identifier = null;
                loginInfo.userSig = null;
                resolve(resp)
            },function(err){
                reject(err)
            }
        );
    })
}

//退出大群
function quitBigGroup() {
    var options = {
        'GroupId': selToID//群id
    };
    return new Promise((resolve,reject)=>{
        webim.quitBigGroup(
            options,
            function (resp) {
                webim.Log.info('退群成功');
                selSess = null;
                //webim.Log.error('进入另一个大群:'+avChatRoomId2);
                //applyJoinBigGroup(avChatRoomId2);//加入大群
                resolve(resp)
            },
            function (err) {
                console.error(err.ErrorInfo);
                reject(err)
            }
        );
    })
}
// 解散群
var destroyGroup = function (group_id) {
    return new Promise((resolve,reject)=>{
        var options = null;
        if (group_id) {
            options = {
                'GroupId': group_id
            };
        }
        if (options == null) {
            console.error('解散群时，群组ID非法');
            return;
        }
        webim.destroyGroup(
                options,
                function (resp) {
                    //读取我的群组列表
                    // getJoinedGroupListHigh(getGroupsCallbackOK);
                    resolve(resp)
                },
                function (err) {
                    reject(err.ErrorInfo)
                    console.error(err.ErrorInfo);
                }
        );
    })
};

/**
 *  初始化聊天
 * @param {selToID} opts //selToID 好友id
 */
function init(opts){
    selSess = null;
    selToID = opts.selToID;
    selTypeIsGroup = opts.selTypeIsGroup;
    selType= selTypeIsGroup? webim.SESSION_TYPE.GROUP:webim.SESSION_TYPE.C2C;
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

module.exports = {
    init : init,
    onMsgNotify : onMsgNotify,
    onBigGroupMsgNotify:onBigGroupMsgNotify,
    onCreateGroupNotify:onCreateGroupNotify,
    onApplyJoinGroupRequestNotify:onApplyJoinGroupRequestNotify,
    onKickedGroupNotify:onKickedGroupNotify,
    onDestoryGroupNotify:onDestoryGroupNotify,
    onQuitGroupNotify:onQuitGroupNotify,
    onRevokeGroupNotify:onRevokeGroupNotify,
    sdkLogin : sdkLogin,
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
    searchProfileByUserId:searchProfileByUserId,
    msgAutoRead:msgAutoRead,
    currentSessById:currentSessById,
    delChat:delChat,
    getPrePageC2CHistoryMsgs:getPrePageC2CHistoryMsgs,
    createBigGroup:createBigGroup,
    applyJoinBigGroup:applyJoinBigGroup,
    quitBigGroup:quitBigGroup,
    getLastGroupHistoryMsgs:getLastGroupHistoryMsgs,
    getPrePageGroupHistoryMsgs:getPrePageGroupHistoryMsgs,
    getMyGroupList:getMyGroupList,
    getGroupMemberInfo:getGroupMemberInfo,
    destroyGroup:destroyGroup
};