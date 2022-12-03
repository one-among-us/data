FROM python:3.11-alpine

WORKDIR /app
COPY requirements.txt /app

# Since alpine doesn't have stable opencc yet, we need to add its testing repo.
# The opencc binary in the testing repo didn't include a libopencc.so.1 file but did include libopencc.so.1.1,
# So linking is necessary
RUN pip install -r requirements.txt \
    && echo "@testing https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && apk add --no-cache opencc@testing git \
    && ln -s $(find / -name "libopencc.so.1*" -print -quit) /usr/lib/libopencc.so.1 \
