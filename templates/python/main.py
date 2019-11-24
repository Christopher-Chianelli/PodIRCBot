import sys, json, PodIRCBot

def onChannelMsg(event):
    pass

def onPrivateMsg(event):
    pass

def onUserJoin(event):
    pass

eventHandlers = {
    "channelMsg": onChannelMsg,
    "privateMsg": onPrivateMsg,
    "userJoin": onUserJoin
}

if __name__ == "__main__":
    PodIRCBot.log("Service is waiting for messages")
    for json_message in sys.stdin:
        PodIRCBot.log("Got event: " + json_message)
        event = json.loads(json_message)
        eventHandler = eventHandlers.get(event.get("type"), lambda e: None);
        eventHandler(event)
