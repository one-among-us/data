FROM python:3.11-alpine

WORKDIR /app
COPY requirements.txt /app

# Since alpine doesn't have stable opencc yet, we need to add its testing repo.
# The opencc binary in the testing repo didn't include a libopencc.so.1 file but did include libopencc.so.1.1,
# So linking is necessary
RUN pip install -r requirements.txt \
    && echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && apk add --no-cache 'opencc@testing=1.1.4-r0' git \
    && ln -s "/usr/lib/libopencc.so.1.1.3" "/usr/lib/libopencc.so.1" \
    && git config --global --add safe.directory /app
