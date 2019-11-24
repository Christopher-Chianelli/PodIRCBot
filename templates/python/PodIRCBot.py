def respond(event, msg):
    command = {
        "bot": event.bot,
        "channel": event.channel,
        "msg", msg
    }
    print(command)
