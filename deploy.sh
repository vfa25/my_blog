#!/usr/bin/env sh
set -e

npm run build
zip -r ./dist.zip ./dist

git add .
npm run commit

read -p "Will deploy - are you sure? (y/n)" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Deploying..."

  git push origin master
  npm run prd:deploy

fi
