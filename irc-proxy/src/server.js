const net = require('net');
const Irc = require('irc-framework');
const RequestBalancer = require('smart-request-balancer');

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

function cleanupNick(nick) {
    const indexOfFirstNormalChar = nick.search(/[^_\W]/);
    if (indexOfFirstNormalChar === -1) {
        return nick;
    }
    const nickWithoutPrefix = nick.slice(indexOfFirstNormalChar);
    const indexOfFirstSpecialChar = nickWithoutPrefix.search(/\W|_/);
    return nickWithoutPrefix.slice(0, (indexOfFirstSpecialChar !== -1)? indexOfFirstSpecialChar : undefined);
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
var seenMessageSet = new Set();
var botJoinQueue = new RequestBalancer({
    overall: { // Overall queue rates and limits
        rate: 2, // bot joins
        limit: 1 // per seconds
    },
    ignoreOverallOverheat: false
});

bots.forEach(botConfig => {
    var bot = new Irc.Client({
        auto_reconnect: true,
        auto_reconnect_wait: 4000,
        auto_reconnect_max_retries: 3,
    });
    botConfig.bot = bot;
    bot.use((c, rawEvents, parsedEvents) => {
        parsedEvents.use((command, event, client, next) => {
            // Two commands are sent for channels and private messages:
            // message and privmsg, and it always happens
            if (command !== "privmsg") {
                const type = (command === "message")? (event.target === botConfig.botName)? "privateMessage" : "channelMsg"  : command;
                if (command === "message") {
                    const messageKey = event.nick + "\n" + event.message + "\n" + event.target + "\n" + Math.floor(event.time / 100);
                    if (!seenMessageSet.has(messageKey)) {
                        seenMessageSet.add(messageKey);
                        const prefix = (bots.get(event.nick) === undefined)? "" : "bot-"
                        const myEvent = {
                            bot: botConfig.botName,
                            type: prefix + type,
                            event
                        };
                        socketList.forEach(socket => {
                            try {
                                sendEventToSocket(socket, myEvent);
                            }
                            catch(err) {
                                console.log(err)
                            }
                        });
                        setTimeout(() => { seenMessageSet.delete(messageKey); }, 2000);
                    }
                }
            }
            next();
        });
    });

    botJoinQueue.request(retry => {
        return new Promise((resolve, reject) => {
            bot.connect({
                host: ircServer,
                port: ircPort,
                nick: botConfig.botName,
                username: botConfig.botName,
                gecos: botConfig.botName
            });
            resolve(0);
        });
    }, 0);

    bot.on('registered', () => {
        console.log(`Bot ${botConfig.botName} has registered`);
        botConfig.botChannels.forEach(channel => bot.join(channel));
    });

    bot.on('invite', e => {
        console.log(`${botConfig.botName} was invited to ${e.channel}.`);
        if (botConfig.botChannels.indexOf(e.channel) !== -1) {
            console.log(`${e.channel} in channelList; joining.`);
            bot.join(e.channel);
        }
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
    var queue = new RequestBalancer({
        overall: { // Overall queue rates and limits
            rate: 5, // messages sent
            limit: 2 // per seconds
        },
        ignoreOverallOverheat: false
    });
    socket.on('service-command', (command) => {
        queue.request(retry => {
            return new Promise((resolve, reject) => {
                bots.get(command.bot).bot[command.command](...command.params);
                resolve(0);
            });
        }, 0);
    });
    socketList.push(socket);
});

server.on('listening', () => {
    console.log('TCP Server Started');
});
server.listen(parseInt(process.env.IRC_PROXY_SERVICE_PORT));
