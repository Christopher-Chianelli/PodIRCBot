import sys, json

def respond(event, msg):
    command = {
        "type": event.get("type"),
        "bot": event.get("bot"),
        "channel": event.get("channel"),
        "msg": msg
    }
    print(json.dumps(command))

def log(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
