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
    for json_message in sys.stdin:
        event = json.loads(json_message)
        eventHandler = eventHandlers.get(event.type, lambda: None);
        eventHandler(event)
