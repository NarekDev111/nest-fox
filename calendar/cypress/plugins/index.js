"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_dev_server_1 = require("@cypress/vite-dev-server");
module.exports = function (on, config) {
    on('dev-server:start', function (options) { return (0, vite_dev_server_1.devServer)(options); });
    return config;
};
