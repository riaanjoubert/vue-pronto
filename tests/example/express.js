// @ts-check
"use strict";
const {ProntoVueify, ProntoWebpack} = require("../../lib");

/**
 * @typedef VueOptionsType
 * @prop {String} title
 * @prop {Object} head
 * @prop {Object[]} head.scripts
 * @prop {Object[]} head.metas
 * @prop {Object[]} head.styles
 * @prop {Object} template
 */

/**
 * @typedef ConfigObjectType
 * @prop {{max: number, maxAge: number}} cacheOptions - cacheoptions for LRU cache
 * @prop {String} rootPath
 * @prop {String} vueVersion
 * @prop {VueOptionsType} head
 * @prop {Object | boolean} webpack
 */

/**
 * Middleware Init function for ExpressVue
 * @param {ConfigObjectType} options
 * @returns {Function}
 */
function init(options, renderer) {
    //Make new object
    let Renderer = {};
    if (renderer) {
        Renderer = renderer;
    } else {
        Renderer = new ProntoVueify(options);
    }

    /**
     * @param {Object} req
     * @param {Object} req.vueOptions
     * @param {Object} res
     * @param {Function} res.renderVue
     * @param {Function} res.set
     * @param {Function} res.write
     * @param {Function} res.end
     * @param {Function} res.send
     * @param {Function} next
     */
    function expressVueMiddleware(req, res, next) {
        /**
         * @param {NodeJS.ReadableStream} stream
         */
        function StreamToClient(stream) {
            stream.on("data", /** @param {String} chunk */function(chunk) {
                return res.write(chunk);
            });
            stream.on("end", function() {
                return res.end();
            });
        }

        /**
         * @param {Error} error
         */
        function ErrorToClient(error) {
            console.error(error);
            res.send(error);
        }

        req.vueOptions = {
            title: "",
            head: {
                scripts: [],
                styles: [],
                metas: [],
            },
        };
        /**
         * Res RenderVUE function
         * @param {String} componentPath
         * @param {Object} [data={}]
         * @param {Object} [vueOptions={}]
         */
        res.renderVue = function(componentPath, data = {}, vueOptions = {}) {
            res.set("Content-Type", "text/html");
            Renderer.RenderToStream(componentPath, data, vueOptions)
                .then(StreamToClient)
                .catch(ErrorToClient);
        };

        return next();
    }

    //Middleware init
    return expressVueMiddleware;
}

function use(expressApp, options) {
    const renderer = new ProntoWebpack(options);
    const expressVue = init(options, renderer);
    expressApp.use(expressVue);

    expressApp.get(
        "/expressvue/bundles/:bundlename",
        function(req, res, next) {
            renderer.getBundleFile(req.params.bundlename)
            .then(bundle => {
                res.send(bundle);
            })
            .catch(error => {
                res.status(404);
                res.send("file not found");
            });

        },
    );
}

module.exports.init = init;
module.exports.use = use;
