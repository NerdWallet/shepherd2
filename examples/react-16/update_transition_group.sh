#!/bin/bash

if ! grep react-addons-css-transition-group package.json > /dev/null
then
  exit 0
fi

set -e

npm uninstall react-addons-css-transition-group
npm install react-transition-group@1

git grep -l react-addons-css-transition-group | \
  grep -e '\.jsx\?$' | \
  xargs sed -i '' 's/react-addons-css-transition-group/react-transition-group/g'
