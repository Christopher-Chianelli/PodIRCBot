FROM python:3.7-alpine
RUN apk add --no-cache socat

COPY . /app
WORKDIR /app

RUN pip install -r requirements.txt
CMD sh run.sh
