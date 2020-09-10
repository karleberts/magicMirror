"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var webSocket_1 = require("rxjs/webSocket");
var WebSocketCtor = ((typeof WebSocket !== 'undefined' && WebSocket) ||
    (typeof window !== 'undefined' && window && window.WebSocket)) || require('ws');
var defaultSerializer;
defaultSerializer = function (data) {
    return JSON.stringify(data);
};
var RxWebsocketSubject = /** @class */ (function (_super) {
    __extends(RxWebsocketSubject, _super);
    function RxWebsocketSubject(url, reconnectInterval, /// pause between connections
    reconnectAttempts, /// number of connection attempts, 0 will try forever
    serializer) {
        if (reconnectInterval === void 0) { reconnectInterval = 5000; }
        if (reconnectAttempts === void 0) { reconnectAttempts = 0; }
        if (serializer === void 0) { serializer = defaultSerializer; }
        var _this = _super.call(this) || this;
        _this.serializer = serializer;
        _this._buffer = [];
        _this._isConnected = false;
        /// connection status
        _this.connectionStatus = new rxjs_1.Observable(function (observer) { return _this.connectionObserver = observer; }).pipe(operators_1.share(), operators_1.distinctUntilChanged());
        /// config for WebSocketSubject
        /// except the url, here is closeObserver and openObserver to update connection status
        _this.wsSubjectConfig = {
            url: url,
            WebSocketCtor: WebSocketCtor,
            closeObserver: {
                next: function () {
                    _this.socket = null;
                    _this._isConnected = false;
                    _this.connectionObserver.next(false);
                }
            },
            openObserver: {
                next: function () {
                    _this._isConnected = true;
                    _this.connectionObserver.next(true);
                    setTimeout(_this._flushBuffer.bind(_this), 1000);
                }
            }
        };
        /// we connect
        _this.connect();
        /// we follow the connection status and run the reconnect while losing the connection
        _this.connectionStatus.subscribe(function (isConnected) {
            if (!_this.reconnectionObservable && typeof isConnected == "boolean" && !isConnected) {
                _this.reconnect();
            }
        });
        return _this;
    }
    RxWebsocketSubject.prototype.connect = function () {
        var _this = this;
        this.socket = webSocket_1.webSocket(this.wsSubjectConfig);
        this.socket.subscribe(function (msg) {
            _this.next(msg); /// when receiving a message, we just send it to our Subject
        }, function (error) {
            console.error(error);
            if (!_this.socket) {
                /// in case of an error with a loss of connection, we restore it
                _this.reconnect();
            }
        });
    };
    /// reconnection
    RxWebsocketSubject.prototype.reconnect = function () {
        var _this = this;
        this.reconnectionObservable = rxjs_1.interval(this.reconnectInterval).pipe(operators_1.takeWhile(function (v, index) {
            if (_this.socket) {
                return false;
            }
            return _this.reconnectAttempts === 0 || index < _this.reconnectAttempts;
        }));
        this.reconnectionObservable.subscribe(function () { return _this.connect(); }, null, function () {
            /// if the reconnection attempts are failed, then we call complete of our Subject and status
            _this.reconnectionObservable = null;
            if (!_this.socket) {
                _this.complete();
                _this.connectionObserver.complete();
            }
        });
    };
    /// sending the message
    RxWebsocketSubject.prototype.send = function (msg) {
        if (this._isConnected) {
            this.socket.next(msg);
        }
        else {
            this._buffer.push(msg);
        }
    };
    //called when reconnected
    RxWebsocketSubject.prototype._flushBuffer = function () {
        var _this = this;
        if (this._buffer.length) {
            this._buffer.forEach(function (msg) { return _this.send(msg); });
            this._buffer = [];
        }
    };
    return RxWebsocketSubject;
}(rxjs_1.Subject));
exports.default = RxWebsocketSubject;
;
//# sourceMappingURL=websocketSubject.js.map