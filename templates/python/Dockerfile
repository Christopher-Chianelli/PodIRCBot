FROM python:3.7-alpine
RUN apk add --no-cache netcat-openbsd

COPY . /app
WORKDIR /app

RUN pip install -r requirements.txt

CMD ["nc", "-c" "python main.py", "irc-proxy", "8888"]
