//import createConnection from "typeorm";

var express = require("express");
var app = express();
var amqp = require('amqplib/callback_api');
var fs = require('fs');

//page localhost:5002/
//app.get("/", function(req, res) {
//  res.send("Hello W0rld!");
//});

amqp.connect('amqp://rabbitmq', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'logging';
    var msg = "Logging service started now";

    channel.assertQueue(queue, {
      durable: false
    });

    console.log("Logger started logging logs to log them in the log.");

    channel.consume(queue, (msg) => {
      console.log("Received: " + msg.content);
      // this appendFile doesn't work
      fs.appendFile('message-log.txt', msg.content, (error2) => {
        if (error2) throw error2;
        console.log('The file was appended!');
      });
      //This appendFileSync neither
      fs.appendFileSync("message-log.txt", msg.content);
    });
  });
});

app.listen(3000, function() {
  console.log("Example app listening on port 3000!");
});
