FROM python:3.7-alpine
RUN apk add --no-cache socat

RUN mkdir /app
COPY requirements.txt /app
WORKDIR /app
RUN pip install -r requirements.txt
COPY . .

CMD sh run.sh
