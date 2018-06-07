/* 
 * MonacoinServiceConnection
 * Copyright (c) PLiCy / シャイん
 * LICENSE: MIT License
 * 
 * twitter_screen_nameを元に、該当のサービスのモナコイン口座情報を取得します
 * CROSを使用しているため、
 * 対象のサーバーのAPIは、Headerで、"Access-Control-Allow-Origin:*"を返す必要があります
 * 
 */
var MonacoinServiceConnection = null;
(function(){
    "use strict";
    var MonacoinServiceConnectionList = [
        {
            "name":{
                "ja":"Monappy",
                "en":"Monappy"
            },
            "img":"https://monappy.jp/img/monappy_logos.png",
            "url":"https://api.monappy.jp/v1/users/get_nickname?twitter_id=$twitter_screen_name",
            "response":{
                "success_flags":{
                    "status": "ok"
                },
                "get_address":{
                    "address":true
                }
            }
        },
        {
            "name":{
                "ja":"PLiCy /MONAMA!",
                "en":"PLiCy /MONAMA!"
            },
            "img":"https://plicy.net/Image/logo/Monama.png",
            "url":"https://plicy.net/api/v1/monacoin/twitter_screen_name/$twitter_screen_name",
            "response":{
                "success_flags":{
                    "status": "ok"
                },
                "get_address":{
                    "address":true
                }
            }
        }
    ];
    var ErrorCode = {
        "1":{
            "ja":"#サービスが選択されていません",
            "en":"#Service not selected"
        },
        "2":{
            "ja":"#存在しないサービスのIDです",
            "en":"#ID of nonexistent service"
        },
        "3":{
            "ja":"#通信エラーが発生しました",
            "en":"#Communication error occurred"
        },
        "4":{
            "ja":"#サービスが不正なデータを返却しました",
            "en":"#The service returned invalid data"
        },
        "5":{
            "ja":"#該当のサービスでユーザー登録されていません",
            "en":"#User not registered"
        },
        "6":{
            "ja":"#該当のサービスにMONACOINアドレスが存在しません",
            "en":"#MONACOIN address does not exist in the service"
        }
    };
    var MonacoinServiceConnectionClass = function(){
    };
    MonacoinServiceConnectionClass.prototype = {
        init:function(){
            this.language = "ja";
            this.select_service_id =-1;
        },
        write:function(data){
            switch(data.type){
                case "button":
                    this.writeButtons(data);
                break;
                case "select":
                    this.writeSelecter(data);
                break;
            }
        },
        writeSelecter:function(data){
            if(!data){
                data = {};
            }
            var language = data.language || "ja";
            var button_text = data.button_text || "モナコインアドレスの取得";
            var div = document.createElement("div");
            var select = document.createElement("select");
            var i,len,serviceData;
            len = MonacoinServiceConnectionList.length;
            for(i=0;i<len;i++){
                serviceData = MonacoinServiceConnectionList[i];
                var name = serviceData.name[language];
                var option = document.createElement("option");
                option.value = i;
                option.append(name);
                select.append(option);
            }
            this.select_service_id = select.value;
            this.language = language;
            select.addEventListener("change",function(e){
                this.select_service_id = e.currentTarget.value;
            }.bind(this));
            div.append(select);
            
            
            var button = document.createElement("button");
            button.append(button_text);
            button.addEventListener("click",function(e){
                var twitter_screen_name = "";
                if(typeof data.twitter_screen_name === "function"){
                    twitter_screen_name = data.twitter_screen_name();
                }
                this.getMonacoinByTwitterScreenName(twitter_screen_name,data.get_address);
            }.bind(this));
            div.append(button);
            document.body.append(div);
        },
        writeButtons:function(data){
            if(!data){
                data = {};
            }
            var language = data.language || "ja";
            var i,len,serviceData;
            len = MonacoinServiceConnectionList.length;
            var div = document.createElement("div");
            for(i=0;i<len;i++){
                serviceData = MonacoinServiceConnectionList[i];
                var name = serviceData.name[language];
                var button = document.createElement("button");
                button.value = i;
                if(serviceData.img){
                    var img = document.createElement("img");
                    img.src = serviceData.img;
                    button.append(img);
                }else{
                    button.append(name);
                }
                
                button.addEventListener("click",function(e){
                    this.select_service_id = e.currentTarget.value;
                    var twitter_screen_name = "";
                    if(typeof data.twitter_screen_name === "function"){
                        twitter_screen_name = data.twitter_screen_name();
                    }
                    this.getMonacoinByTwitterScreenName(twitter_screen_name,data.get_address);
                }.bind(this));
                div.append(button);
            }
            document.body.append(div);
        },
        getMonacoinByTwitterScreenName:function(twitter_screen_name,callback){
            var select_service_id = this.select_service_id;
            var language = this.language;
            if(select_service_id === -1){
                callback("error","",ErrorCode[1][language]);
            }
            var serviceData = MonacoinServiceConnectionList[select_service_id];
            if(!serviceData){
                callback("error","",ErrorCode[2][language]);
            }
            var retryCount = 0;
            var retry = function(){
                var xhr = new XMLHttpRequest();
                var url = serviceData.url.replace("$twitter_screen_name",twitter_screen_name);
                xhr.onload = function(e){
                    var text = xhr.responseText;
                    try{
                        var json = JSON.parse(text);
                        if(!this.successCheck(json,serviceData.response.success_flags)){
                            //エラーが発生している
                            callback("error","",ErrorCode[5][language]);
                        }else{
                            var address = this.getAddress(json,serviceData.response.get_address);
                            if(address === ""){
                                callback("error","",ErrorCode[6][language]);
                            }else{
                                callback("success",address,"");
                            }
                        }
                    }catch(error){
                        callback("error","",ErrorCode[4][language]);
                    }
                    xhr.onload = null;
                    xhr.onerror = null;
                }.bind(this);
                xhr.onerror = function(e){
                    retryCount++;
                    if(retryCount < 5){
                        xhr.onload = null;
                        xhr.onerror = null;
                        retry();
                    }else{
                        callback("error","",ErrorCode[3][language]);
                    }
                };
                xhr.open("GET" , url,true);
                xhr.send(null);
            }.bind(this);
            retry();
        },
        successCheck:function(responseTable,successTable){
            var flag = true;
            for(var key in successTable){
                var value = successTable[key];
                if((typeof value === "object")&&(value !== null)){
                    if((value instanceof Array) === (responseTable[key] instanceof Array)){
                        flag = flag && this.successCheck(responseTable[key],value);
                    }else{
                        flag = false;
                    }
                }else{
                    flag = flag && (value === responseTable[key]);
                }
            }
            return flag;
        },
        getAddress:function(responseTable,get_address){
            for(var key in get_address){
                var value = get_address[key];
                if((typeof value === "object")&&(value !== null)){
                    if((value instanceof Array) === (responseTable[key] instanceof Array)){
                        return this.successCheck(responseTable[key],value);
                    }else{
                    }
                }else if(value === true){
                    return responseTable[key];
                }
            }
            return "";
        }
    };
    MonacoinServiceConnection = new MonacoinServiceConnectionClass();
    MonacoinServiceConnection.init();
}());