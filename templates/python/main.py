import sys, json, PodIRCBot
from types import SimpleNamespace as Namespace

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
        event = json.loads(json_message, object_hook=lambda d: Namespace(**d))
        eventHandler = eventHandlers.get(event.type, lambda e: None)
        eventHandler(event)
