//import createConnection from "typeorm";

var express = require('express')
var app = express()
var amqp = require('amqplib/callback_api')
var fs = require('fs')
const path = require('path')

const logPath = process.env.LOGPATH || ''
const logFile = process.env.LOGFILE || 'message-log.txt'

const fullLogFilePath = path.join(logPath, logFile)

fs.appendFileSync(fullLogFilePath, `[START] ${new Date().toISOString()}\n`)

amqp.connect('amqp://rabbitmq', function(error0, connection) {
  if (error0) {
    throw error0
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1
    }
    var queue = 'logging'
    var msg = 'Logging service started now'
    channel.assertQueue(queue, {
      durable: false,
    })

    console.log('Logger started logging logs to log them in the log.')

    channel.consume(queue, msg => {
      console.log('Received: ' + msg.content)

      /**
       * This works fine, it's just writing the
       * file inside the docker container.
       *
       * I added a variable for the filename
       * so it's easier to configure and not
       * to typo
       *
       * also added the new line in the beginning
       * of a log message with a timestamp
       */
      fs.appendFileSync(
        fullLogFilePath,
        `\n[${msg.fields.routingKey}] ${new Date().toISOString()} ${
          msg.content
        }`,
      )
    })
  })
})

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})
