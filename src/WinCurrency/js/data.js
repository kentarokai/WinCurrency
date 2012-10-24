(function () {
    "use strict";

    var DEBUG = 1;

    var CURRENCY_CSV_URL = "https://docs.google.com/spreadsheet/pub?key=0Ar4YcqZteDX9dHpKZTJHQmNpZUtxTl83aHc4V2E4Z0E&single=true&gid=0&output=csv";

    var nav = WinJS.Navigation;
    var userData = {};
    var currencyInfo = [];

    var globals = {
        CACHE_TIME: (5 * 60 * 1000)
    };

    function debug(str) {
        if (DEBUG) {
            Debug.writeln(str);
        }
    }

    function isOnline() {
        return navigator.onLine && 1;
    }

    WinJS.Namespace.define("appUtil", {
        globals: globals,
        debug: debug,
        loadCcurrencyInfoAsync: loadCcurrencyInfoAsync,
        currencyInfo: currencyInfo,
        userData: userData,
        isOnline: isOnline,
        calcWithCurrentSource: calcWithCurrentSource
    });


    function calcWithCurrentSource(dstId, num) {
        var src = _findItemById(userData.srcId);
        var dst = _findItemById(dstId);

        var value = userData.srcValue;

        if (!src || !dst) {
            return 0;
        }

        if (!dst.value) {
            return 0;
        }

        var v1 = src.value / dst.value * value;
        //v1 = 0.12345;
        var keta = Math.floor(Math.log(v1) * Math.LOG10E);

        keta = Math.min(-1, keta);

        var pow = Math.pow(10, num - 1 - keta);
        var v2 = v1 * pow;
        var v3 = Math.round(v2) / pow;

        return v3;
    }

    function _findItemById(id) {
        for (var i in currencyInfo) {
            var item = currencyInfo[i];
            if (item.id == id) {
                return item;
            }
        }
        return null;
    }

    function loadCcurrencyInfoAsync(callback, user) {

        appUtil.debug("try to load currency");

        appUtil.debug(CURRENCY_CSV_URL);

        function currencyDataLoaded(success) {

            appUtil.debug("currency: " + (success ? "loaded" : "failed"));

            if (callback) {
                callback(user);
            }
        }

        if (!isOnline()) {
            currencyDataLoaded(false);
            return;
        }

        WinJS.xhr({
            url: _addCacheBusterParam(CURRENCY_CSV_URL),
            responseType: "text",
            headers: {
                "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT"
            }
        }).then(
            function (result) {

                var csvTxt = result.responseText;
                if (!csvTxt || 0 > csvTxt.lastIndexOf(",")) {
                    currencyDataLoaded(false);
                }
                var arr = _googleCSV2Array(csvTxt);
                var datas = [];

                for (var i = 1; i < arr.length; i++) {
                    var _data = arr[i];
                    if (!_data.length || 4 > _data.length) {
                        continue;
                    }
                    var _id = _data[0];
                    var _name = _data[1];
                    var _value = _data[3];
                    datas.push({
                        id: _id,
                        name: _name,
                        value: _value
                    });
                }

                if (datas.length) {
                    var len = currencyInfo.length;
                    for (var i = 0; i < len; i++) {
                        currencyInfo.pop();
                    }

                    for (var i = 0; i < datas.length; i++) {
                        var data = datas[i];
                        var _item = { id: data.id };
                        currencyInfo.push(_item);
                        _item.name = data.name;
                        _item.value = data.value;
                    }

                    _saveCurrencyInfoAsCache();
                    currencyDataLoaded(true);
                   
                } else {
                    currencyDataLoaded(false);
                }
            },
            function (result) {
                currencyDataLoaded(false);
            }
        );
    }

    function _saveCurrencyInfoAsCache() {
        var cacheData = {};
        cacheData.data = currencyInfo;
        cacheData.loadDate = (new Date()).getTime();
        localStorage.currencyInfoCache = JSON.stringify(cacheData);
    }

    function _saveUserDataAsCache() {
        localStorage.userData = JSON.stringify(userData);
    }
   
   

    function _googleCSV2Array(txt) {
        txt = txt.replace(/""/g, "<><>@@");

        var arr = [];
        var subarr = [];
        var s = 0;
        var e = 0;
        var q = false;
        var sub = "";

        var _arpush = function (_arr, _txt) {
            if (_txt) {
                _txt = _txt.replace(/<><>@@/g, '"');
            }
            _arr.push(_txt);
        }

        var txtLen = txt.length;
        for (var i = 0; i < txtLen; i++) {
            var c = txt.charAt(i);
            if ('"' == c) {
                if (!q) {
                    q = true;
                    i++;
                    s = i;
                } else {
                    q = false;
                    _arpush(subarr, txt.substring(s, i));
                    i++;
                    if (txtLen > i && "\n" == txt.charAt(i)) {
                        arr.push(subarr);
                        subarr = [];
                    }
                    s = i + 1;
                }
            } else if ("," == c) {
                if (!q) {
                    _arpush(subarr, txt.substring(s, i));
                    s = i + 1;
                }
            } else if ("\n" == c) {
                if (!q) {
                    _arpush(subarr, txt.substring(s, i));
                    s = i + 1;
                    arr.push(subarr);
                    subarr = [];
                }
            }
        }
        var lastChar = txt.charAt(txtLen - 1);
        if ("\n" != lastChar && '"' != lastChar) {
            if ("," == lastChar) {
                _arpush(subarr, "");
            } else {
                _arpush(subarr, txt.substring(s));
            }
        }
        if (subarr.length) {
            arr.push(subarr);
        }

        return arr;
    }

  

  
    function _addCacheBusterParam(url) {
        var cb = (new Date()).getTime();
        var res = _setURLParam(url, "_appcb", cb);
        return res;
    }

    function _setURLParam(url, param, value) {
        value = encodeURI(value);
        var arr = url.split("?");
        if (2 != arr.length) {
            url += "?" + param + "=" + value;
        } else {
            var paramsStr = arr[1];
            var params = paramsStr.split("&");
            var replaced = false;
            for (var i = 0; i < params.length; i++) {
                var _param = params[i];
                var _pair = _param.split("=");
                if (2 == _pair.length && _pair[0] == param) {
                    params[i] = param + "=" + value;
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                params.push(param + "=" + value);
            }
            paramsStr = params.join("&");
            url = arr[0] + "?" + paramsStr;
        }
        return url;
    }
    
    function _loadDataFromCache() {
        if (!localStorage.userData) {
            //set default
            userData = {
                srcId: "USD",
                srcValue: 1,
                dstIds: ["JPY", "EUR", "GBP", "CNY", "KRW"]
            };

            userData.dstIds = [
                "AED",
"ANG",
"ARS",
"AUD",
"BDT",
"BGN",
"BHD",
"BND",
"BOB",
"BRL",
"BWP",
"CAD",
"CHF",
"CLP",
"CNY",
"COP",
"CRC",
"CSD",
"CZK",
"DKK",
"DOP",
"DZD",
"EGP",
"EUR",
"FJD",
"GBP",
"HKD",
"HNL",
"HRK",
"HUF",
"IDR",
"ILS",
"INR",
"JMD",
"JOD",
"JPY",
"KES",
"KRW",
"KWD",
"KYD",
"KZT",
"LBP",
"LKR",
"LTL",
"LVL",
"MAD",
"MDL",
"MKD",
"MUR",
"MVR",
"MXN",
"MYR",
"NAD",
"NGN",
"NIO",
"NOK",
"NPR",
"NZD",
"OMR",
"PEN",
"PGK",
"PHP",
"PKR",
"PLN",
"PYG",
"QAR",
"RON",
"RUB",
"SAR",
"SCR",
"SEK",
"SGD",
"SLL",
"SVC",
"THB",
"TND",
"TRY",
"TTD",
"TWD",
"TZS",
"UAH",
"UGX",
"USD",
"UYU",
"UZS",
"VEB",
"VND",
"YER",
"ZAR",
"ZMK"/*,
"ZWD"*/
            ];

            appUtil.userData = userData;
            _saveUserDataAsCache();
        } else {
            userData = JSON.parse(localStorage.userData);
            appUtil.userData = userData;
        }
       
        if (localStorage.currencyInfoCache) {
            debug(localStorage.currencyInfoCache);
            var cacheData = JSON.parse(localStorage.currencyInfoCache);
            var date = new Date();
            date.setTime(cacheData.loadDate);
            globals.currencyInfoLoadDate = date;
            currencyInfo = cacheData.data;
            appUtil.currencyInfo = currencyInfo;
        } else {
            //set default
            currencyInfo = [
 { "id": "AED", "name": "UAEディルハム", "value": "21.7261" },
 { "id": "ANG", "name": "アンティル・ギルダー", "value": "45.5943" },
 { "id": "ARS", "name": "アルゼンチン・ペソ", "value": "16.8223" },
 { "id": "AUD", "name": "オーストラリア・ドル", "value": "81.8908" },
 { "id": "BDT", "name": "タカ", "value": "0.979619" },
 { "id": "BGN", "name": "レフ", "value": "52.8866" },
 { "id": "BHD", "name": "バーレーン・ディナール", "value": "211.645" },
 { "id": "BND", "name": "ブルネイ・ドル", "value": "65.1028" },
 { "id": "BOB", "name": "ボリビアーノ", "value": "11.3823" },
 { "id": "BRL", "name": "レアル", "value": "39.3549" },
 { "id": "BWP", "name": "プラ", "value": "10.0615" },
 { "id": "CAD", "name": "カナダ・ドル", "value": "80.3929" },
 { "id": "CHF", "name": "スイス・フラン", "value": "85.5107" },
 { "id": "CLP", "name": "チリ・ペソ", "value": "0.166112" },
 { "id": "CNY", "name": "人民元", "value": "12.7707" },
 { "id": "COP", "name": "コロンビア・ペソ", "value": "0.0439251" },
 { "id": "CRC", "name": "コスタリカ・コロン", "value": "0.15974" },
 { "id": "CSD", "name": "セルビア・ディナール", "value": "2.08258" },
 { "id": "CZK", "name": "チェコ・コルナ", "value": "4.15227" },
 { "id": "DKK", "name": "デンマーク・クローネ", "value": "13.8678" },
 { "id": "DOP", "name": "ドミニカ・ペソ", "value": "2.02256" },
 { "id": "DZD", "name": "アルジェリア・ディナール", "value": "1.00104" },
 { "id": "EGP", "name": "エジプト・ポンド", "value": "13.0771" },
 { "id": "EUR", "name": "ユーロ", "value": "103.493" },
 { "id": "FJD", "name": "フィジー・ドル", "value": "44.7223" },
 { "id": "GBP", "name": "UKポンド", "value": "127.169" },
 { "id": "HKD", "name": "香港ドル", "value": "10.2955" },
 { "id": "HNL", "name": "レンピラ", "value": "4.05025" },
 { "id": "HRK", "name": "クーナ", "value": "13.6706" },
 { "id": "HUF", "name": "フォリント", "value": "0.367865" },
 { "id": "IDR", "name": "ルピア", "value": "0.00830497" },
 { "id": "ILS", "name": "新シェケル", "value": "20.7182" },
 { "id": "INR", "name": "インド・ルピー", "value": "1.48529" },
 { "id": "JMD", "name": "ジャマイカ・ドル", "value": "0.883415" },
 { "id": "JOD", "name": "ヨルダン・ディナール", "value": "112.744" },
 { "id": "JPY", "name": "円", "value": "1" },
 { "id": "KES", "name": "ケニア・シリング", "value": "0.937052" },
 { "id": "KRW", "name": "ウォン", "value": "0.0723096" },
 { "id": "KWD", "name": "クウェート・ディナール", "value": "283.607" },
 { "id": "KYD", "name": "ケイマン諸島ドル", "value": "97.3049" },
 { "id": "KZT", "name": "テンゲ", "value": "0.529529" },
 { "id": "LBP", "name": "レバノン・ポンド", "value": "0.0530872" },
 { "id": "LKR", "name": "スリランカ・ルピー", "value": "0.614242" },
 { "id": "LTL", "name": "リタス", "value": "29.9568" },
 { "id": "LVL", "name": "ラッツ", "value": "148.612" },
 { "id": "MAD", "name": "モロッコ・ディルハム", "value": "9.30949" },
 { "id": "MDL", "name": "モルドバ・レウ", "value": "6.50816" },
 { "id": "MKD", "name": "マケドニア・ディナール", "value": "1.69047" },
 { "id": "MUR", "name": "モーリシャス・ルピー", "value": "2.5618" },
 { "id": "MVR", "name": "ルフィヤ", "value": "5.17174" },
 { "id": "MXN", "name": "メキシコ・ペソ", "value": "6.15023" },
 { "id": "MYR", "name": "リンギット", "value": "26.1008" },
 { "id": "NAD", "name": "ナミビア・ドル", "value": "9.09029" },
 { "id": "NGN", "name": "ナイラ", "value": "0.507409" },
 { "id": "NIO", "name": "コルドバ・オロ", "value": "3.33849" },
 { "id": "NOK", "name": "ノルウェー・クローネ", "value": "13.9367" },
 { "id": "NPR", "name": "ネパール・ルピー", "value": "0.928339" },
 { "id": "NZD", "name": "ニュージーランド・ドル", "value": "64.7655" },
 { "id": "OMR", "name": "オマーン・リヤル", "value": "207.247" },
 { "id": "PEN", "name": "ヌエボ・ソル", "value": "30.9302" },
 { "id": "PGK", "name": "キナ", "value": "37.506" },
 { "id": "PHP", "name": "フィリピン・ペソ", "value": "1.92799" },
 { "id": "PKR", "name": "パキスタン・ルピー", "value": "0.834623" },
 { "id": "PLN", "name": "ズウォティ", "value": "25.0644" },
 { "id": "PYG", "name": "グアラニー", "value": "0.0177728" },
 { "id": "QAR", "name": "カタール・リヤル", "value": "21.9189" },
 { "id": "RON", "name": "新ルーマニア・レウ", "value": "22.6133" },
 { "id": "RUB", "name": "ロシア・ルーブル", "value": "2.53731" },
 { "id": "SAR", "name": "サウディ・リヤル", "value": "21.2768" },
 { "id": "SCR", "name": "セーシェル・ルピー", "value": "6.08875" },
 { "id": "SEK", "name": "スウェーデン・クローナ", "value": "11.985" },
 { "id": "SGD", "name": "シンガポール・ドル", "value": "65.0975" },
 { "id": "SLL", "name": "レオン", "value": "0.0183998" },
 { "id": "SVC", "name": "サルバドール・コロン", "value": "9.11886" },
 { "id": "THB", "name": "バーツ", "value": "2.59453" },
 { "id": "TND", "name": "チュニジア・ディナール", "value": "50.867" },
 { "id": "TRY", "name": "新トルコリラ", "value": "44.2491" },
 { "id": "TTD", "name": "トリニダード・トバゴ・ドル", "value": "12.4283" },
 { "id": "TWD", "name": "ニュー台湾ドル", "value": "2.72005" },
 { "id": "TZS", "name": "タンザニア・シリング", "value": "0.0503788" },
 { "id": "UAH", "name": "フリヴニャ", "value": "9.77821" },
 { "id": "UGX", "name": "ウガンダ・シリング", "value": "0.0307476" },
 { "id": "USD", "name": "アメリカ合衆国ドル", "value": "79.795" },
 { "id": "UYU", "name": "ウルグアイ・ペソ", "value": "4.04" },
 { "id": "UZS", "name": "ウズベキスタン・スム", "value": "0.0408635" },
 { "id": "VEB", "name": "ボリバル", "value": "0.0560611" },
 { "id": "VND", "name": "ドン", "value": "0.00382642" },
 { "id": "YER", "name": "イエメン・リアル", "value": "0.370221" },
 { "id": "ZAR", "name": "ランド", "value": "9.0906" },
 { "id": "ZMK", "name": "ザンビア・クワチャ", "value": "0.0151928" },
 { "id": "ZWD", "name": "ジンバブエ・ドル", "value": "0.48152" }
            ];
            _saveCurrencyInfoAsCache();
            appUtil.currencyInfo = currencyInfo;
        }
    }

    _loadDataFromCache();
    
})()