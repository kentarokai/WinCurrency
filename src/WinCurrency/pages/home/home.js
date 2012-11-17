(function () {
    "use strict";

    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var appView = Windows.UI.ViewManagement.ApplicationView;
    var nav = WinJS.Navigation;

    WinJS.UI.Pages.define("/pages/home/home.html", {
        // この関数は、ユーザーがこのページに移動するたびに呼び出されます。
        // ページ要素にアプリケーションのデータを設定します。
        ready: function (element, options) {
            // TODO: ここでページを初期化します。



            var _this = this;

            this._initSrcEvents();

            appUtil.loadCcurrencyInfoAsync(function () { _this._onCurrencyInfoLoaded(); }, null);
        },

        _initSrcEvents: function () {
            var _this = this;
            var $src = $("#srcValue");
            var user = appUtil.userData;

            $("#srcValue").val(user.srcValue);

            $src.data('oldVal', user.srcValue);
            $src.bind("propertychange keyup input past", function () {
                var $this = $(this);
                var srcVal = $this.val();

                if ($this.data('oldVal') != srcVal) {
                    $this.data('oldVal', srcVal);

                    //appUtil.debug(srcVal);
                    _this._validateSrcValue(false);
                }
            });

            $src.focusout(function () {
                _this._validateSrcValue(true);
            });

            var $names = $("#srcNames");
            $names.change(function () {
                var $sel = $(this);
                var srcId = $sel.val();
                _this._validateSrcValue(false);
                appUtil.debug(srcId);
                $("#srcFlag").css("background-image",
                            "url(/images/flags/" + srcId + ".svg)")
            });
        },

        _recalcTimer: null,

        _validateSrcValue: function (reset) {
            var _this = this;
            var $src = $("#srcValue");
            var srcVal = $src.val();
            var user = appUtil.userData;

            var numStr = srcVal.replace(/[^.0-9]/g, "");

            var newValue = 0;

            if (!numStr) {
                newValue = 0;
            } else {
                newValue = parseFloat(numStr);
            }

            if (reset) {
                $src.val(newValue);
                $src.data('oldVal', newValue);
            }

            var $sel = $("#srcNames");
            var srcId = $sel.val();


            if (user.srcValue != newValue || srcId != user.srcId) {
                user.srcId = srcId;
                user.srcValue = newValue;
                clearTimeout(this._recalcTimer);
                this._recalcTimer = setTimeout(function () {
                    appUtil.saveUserData();
                    _this._recalc();
                }, 1000);
            }
            appUtil.debug(numStr);
        },

        _onCurrencyInfoLoaded: function () {
            this._rebuildSrc();
            this._rebuildDst();
            this._initAddNames();
            this._setAddNames();

            this._recalc();
        },

        _recalc: function () {
            var $tiles = $("#tiles");
            var items = appUtil.currencyInfo;
            var user = appUtil.userData;

            appUtil.debug("RECALC: " + user.srcId + " " + user.srcValue);

            $(".currencyTile", $tiles).each(function () {
                var $tile = $(this);
                var currencyId = $tile.data("currencyId");


                var val = appUtil.calcWithCurrentSource(currencyId, 3);
                $(".dstValue", $tile).text(val);
            });
        },

        _rebuildSrc: function () {
            var $select = $("#srcNames");
            var items = appUtil.currencyInfo;
            var user = appUtil.userData;

            $("#srcValue").val(user.srcValue);

            $("#srcFlag").css("background-image",
                            "url(/images/flags/" + user.srcId + ".svg)")

            $select.empty();
            for (var i in items) {
                var item = items[i];
                $select.append($("<option value='" + item.id + "'>" + "(" + item.id + ") " + item.name + "</option>"));
            }

            $select.val(user.srcId);
        },

        _rebuildDst: function () {
            var $tiles = $("#tiles");
            var $addTile = $("#addtile");

            $(".currencyTile", $tiles).remove();

            var items = appUtil.currencyInfo;
            var user = appUtil.userData;

            for (var i in user.dstIds) {
                var id = user.dstIds[i];

                for (var j in items) {
                    var item = items[j];
                    if (id == item.id) {
                        this._appendDstTile(item);
                        break;
                    }
                }
            }
            /*
            <div class="tile">
                        <div class="dstValue">123.456789</div>
                        <div class="dstName">トリニダード・トバコ・ドル (JPY)</div>
                        <div class="dstFlag"></div>
                    </div>
            */
        },

        _appendDstTile: function (item) {
            var $addTile = $("#addtile");

            var $tile = $("<div/>").addClass("tile").addClass("currencyTile").data("currencyId", item.id);
            $("<div/>").addClass("dstValue").appendTo($tile);
            $("<div/>").addClass("dstName").text("(" + item.id + ") " + item.name).appendTo($tile);
            $("<div/>").addClass("dstFlag").css("background-image",
                "url(/images/flags/" + item.id + ".svg)").appendTo($tile);

            $tile.insertBefore($addTile);

            this._initTileEvent($tile);
        },

        _initTileEvent: function ($tile) {

            $tile.attr("draggable", "true");

            $tile.bind("dragstart", function (e) {

                //appUtil.debug(e);
                $(this).css("background-color", "red");

            });

            $tile.bind("dragend", function (e) {

                //appUtil.debug(e);
                $(this).css("background-color", "");

            });

        },

        _initAddNames: function () {
            var $sel = $("#addNames");
            var _this = this;

            $sel.change(function () {
                _this.onAddNameChanged($(this).val());
            });
        },

        onAddNameChanged: function (newId) {

            appUtil.debug(newId);
            if ("default" == newId) {
                return;
            }
            var items = appUtil.currencyInfo;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (newId == item.id) {
                    this._appendDstTile(item);
                    appUtil.addDstId(newId);
                    break;
                }
            }
            this._setAddNames();
            this._recalc();
        },

        _setAddNames: function () {
            var $sel = $("#addNames");

            $("option.name", $sel).remove();

            var items = appUtil.currencyInfo;
            var user = appUtil.userData;

            var appended = 0;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                var found = false;
                for (var j = 0; j < user.dstIds.length; j++) {
                    var _id = user.dstIds[j];
                    if (item.id == _id) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    continue;
                }

                $sel.append($("<option value='" + item.id + "' class='name'>" + "(" + item.id + ") " + item.name + "</option>"));
                appended++;
            }

            $sel.val("default");

            $("#addtile").css("display", appended ? "display" : "none");
        }
    });
})();
