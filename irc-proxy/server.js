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

function crash(msg) {
    console.log(msg);
    //process.exit(1);
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
	socket.on('connect', () => {
        socketList.push(socket);
    });
    socket.on('close', () => {
        var index = socketList.indexOf(socket);
        if (index > -1) {
            socketList.splice(index, 1);
        }
    });
    socket.on('data', (data) => {
        const dataString = data.toString('utf8');
        console.log(dataString);
        socket.write(dataString);
    });
});

server.listen(8888, '127.0.0.1');
console.log('TCP Server Started');
