#!/usr/bin/env bash

cd dist

# Download web tarball
curl -L "https://github.com/one-among-us/web/tarball/gh-pages" --output web.tgz

# Extract tarball
tar -xf web.tgz --strip-components=1

# Replace data host url to "/"
sed -i 's/"https:\/\/data.one-among.us"/window.location.origin/g' ./**/*.js

