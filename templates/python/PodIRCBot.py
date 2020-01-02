import sys, json

def respond(event, msg):
    command = {
        "command": "say",
        "bot": event.bot,
        "params": [event.event.target, msg]
    }
    print(json.dumps(command))

def log(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)
