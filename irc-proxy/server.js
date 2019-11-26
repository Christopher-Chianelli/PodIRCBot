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

bots.forEach(botConfig => {
    console.log(`Server: ${ircServer}, Port: ${ircPort}`);

    var bot = new Irc.Client();
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
var socketList = [];
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

    console.log("New Connection!");
    var myEvent = {
        type: "channelMsg",
        bot: "Bot",
        channel: "#channel",
        msg: "Hi from the server!"
    };
    sendEventToSocket(socket, myEvent);
    socketList.push(socket);
});

server.on('listening', () => {
    console.log('TCP Server Started');
});
server.listen(parseInt(process.env.IRC_PROXY_SERVICE_PORT));
