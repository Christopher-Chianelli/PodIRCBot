const net = require('net');

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
if (botConfigs.length === 0) {
    crash("botConfigs is empty");
}

for (const botConfig of botConfigs) {
    var errors = verifyBotConfig(botConfig);
    if (errors.length > 0) {
        crash(`botConfig ${JSON.stringify(botConfig)} is missing the ` +
            `following properties: ${JSON.stringify(errors)}.`);
    }
}

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
            socket.emit('line', backlog.substring(0, n))
            backlog = backlog.substring(n + 1)
            n = backlog.indexOf('\n')
        }
    });
    socket.on('line', (line) => {
        try {
            const dataJson = JSON.parse(line);
            if (dataJson && typeof dataJson === "object") {
                console.log(dataJson);
                sendEventToSocket(socket, dataJson);
            }
            else {
                throw new Error('JSON is not an object');
            }
        } catch (e) {
            console.log("Got invalid JSON: " + line);
        }
    });

    console.log("New Connection!");
    socketList.push(socket);
    var msg = {
        type: "channel",
        bot: "MyBot",
        channel: "#thefoobar",
        msg: "Hello world"
    };
    sendEventToSocket(socket, msg);
});

server.on('listening', () => {
    console.log('TCP Server Started');
});
server.listen(parseInt(process.env.IRC_PROXY_SERVICE_PORT));
