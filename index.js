"use strict";
require("winston-daily-rotate-file");
const expressWinston = require("express-winston");
const {transports, createLogger,format} = require('winston');
const SlackHook = require('winston-slack-webhook-transport');
const moment = require('moment');

const slackWebHook = "https://hooks.slack.com/services/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"
const ignoredRoutes = {
    "where": [
      "/",
      "/favicon.ico",
      "/v1/countries",
    ],
    "like": ["/v1/search"]
};


const myFormat = format.printf(({ level, message, timestamp }) => {
    return `${moment(new Date(timestamp)).format("DD-MM-YYYY HH:mm:s")} ${level.toUpperCase()}: ${message}`;
});


module.exports = function (app) {    
    expressWinston.requestWhitelist.push("body");
    expressWinston.responseWhitelist.push("body");
    // expressWinston.responseWhitelist.push("_headers");
    expressWinston.bodyBlacklist.push(
        "password",
        "key",
        "iv",
        "secret",
        "token"
    );
    
    app.use(
    expressWinston.logger({
        ignoredRoutes: ignoredRoutes.where,
        expressFormat: true,
        //baseMeta:{time:new Date()}, // add new key to data
        skip: function (req, res) {
        for (let item of ignoredRoutes.like) {
            let regex = new RegExp(item, 'i');
            if ((req.url.match(regex))) {
            return true;
            }
        }
        return false;
        },
        transports: [
        new transports.DailyRotateFile({
            dirname: "./logs",
            filename: "access-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "1g",
            //maxFiles: "30d",
            eol: `\r\n\r\n***************************************************************************************\r\n\r\n`,
        })
        ]
    }));
};

const logger =  createLogger({
    format: format.combine(
    format.timestamp(),
    myFormat,
    //format.colorize()
    ),
    exceptionHandlers: [
    new transports.File({filename: './logs/exceptions.log',}),
    new transports.Console({colorize:true,prettyPrint:true})
    ],
    transports: [
    new transports.File({
        filename: './logs/error.log',
        level: 'error',
    }),
    new transports.File({
        filename: './logs/activity.log',
        level: 'info',
    }),
    new SlackHook({
        webhookUrl: slackWebHook,
        level: 'error',
        formatter: (info) => ({
          //text: `${process.argv[1].match(/[\w-]+\.js/gi)}`, 
          text: `${info.level.toUpperCase()} : ${new Date(info.timestamp)}`, 
          attachments: [
            {
              text: `${info.message}`
            }
          ],
        })
      })
    ]
});



if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console())
}


module.exports.logger = logger;

