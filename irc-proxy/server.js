const net = require('net');
const Irc = require('irc-framework');

function verifyBotConfig(botConfig) {
    var out = [];
    if (botConfig.botName === "undefined") {
        out.push("botName: string");
    }
    if (botConfig.botChannels === "undefined") {
        out.push("botChannels: string[]");
    }
    return out;
}

function sendEventToSocket(socket, myEvent) {
    socket.write(JSON.stringify(myEvent) + "\n");
}

function crash(msg) {
    console.log(msg);
    process.exit(1);
}

var ircServer = process.env.ircServer;
var ircPort = process.env.ircPort;

if (process.env.botConfigs === undefined) {
    crash("botConfigs is undefined");
}

var botConfigs = JSON.parse(process.env.botConfigs);

if (ircServer === undefined) {
    crash("ircServer is undefined");
}
if (ircPort === undefined) {
    crash("ircPort is undefined");
}
if (botConfigs.length === 1) {
    crash("botConfigs is empty");
}

var bots = new Map();
for (const botConfig of botConfigs.slice(1)) {
    var errors = verifyBotConfig(botConfig);
    if (errors.length > 0) {
        crash(`botConfig ${JSON.stringify(botConfig)} is missing the ` +
            `following properties: ${JSON.stringify(errors)}.`);
    }
    
    if (bots.has(botConfig.botName)) {
        var botInfo = bots.get(botConfig.botName);
        botConfig.botChannels.filter(c => botInfo.botChannels.indexOf(c) === -1).forEach(c => botInfo.botChannels.push(c));
    }
    else {
        bots.set(botConfig.botName, botConfig);
    }
}

var socketList = [];
bots.forEach(botConfig => {
    var bot = new Irc.Client();
    bot.use((c, rawEvents, parsedEvents) => {
        parsedEvents.use((command, event, client, next) => {
            // Two commands are sent for channels and private messages:
            // message and privmsg, and it always happens
            if (command !== "privmsg") {
                const type = (command === "message")? (event.target === botConfig.botName)? "privateMessage" : "channelMsg"  : command;
                const myEvent = {
                    ...event,
                    bot: botConfig.botName,
                    type: type
                };
                socketList.forEach(socket => {
                    sendEventToSocket(socket, myEvent);
                });
            }
            next();
        });
    });
    bot.connect({
        host: ircServer,
        port: ircPort,
        nick: botConfig.botName,
        username: botConfig.botName,
        gecos: botConfig.botName
    });

    bot.on('registered', () => {
        console.log(`Bot ${botConfig.botName} has registered`);
        botConfig.botChannels.forEach(channel => bot.join(channel));
    });

});

const server = net.createServer(function(socket) {
    var backlog = '';
    socket.on('close', () => {
        var index = socketList.indexOf(socket);
        if (index > -1) {
            socketList.splice(index, 1);
        }
    });
    socket.on('data', (data) => {
        backlog += data
        var n = backlog.indexOf('\n')
        // got a \n? emit one or more 'line' events
        while (~n) {
            var line = backlog.substring(0, n);
            try {
                const dataJson = JSON.parse(line);
                if (dataJson && typeof dataJson === "object") {
                    socket.emit('service-command', dataJson);
                }
                else {
                    throw new Error('JSON is not an object');
                }
            } catch (e) {
                console.log("Got invalid JSON: " + line);
            }
            backlog = backlog.substring(n + 1)
            n = backlog.indexOf('\n')
        }
    });
    socket.on('service-command', (command) => {
        console.log("Got command " + JSON.stringify(command) + " from " + socket.remoteAddress);
    });
    socketList.push(socket);
});

server.on('listening', () => {
    console.log('TCP Server Started');
});
server.listen(parseInt(process.env.IRC_PROXY_SERVICE_PORT));
