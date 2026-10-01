#!/bin/sh
# Xcode Cloud post-clone hook for the React Native iOS app.
# It runs in the repository root before Xcode resolves Pods and archives.
set -eu

: "${CI_PRIMARY_REPOSITORY_PATH:?This script must run in Xcode Cloud.}"
: "${CI_BUILD_NUMBER:?CI_BUILD_NUMBER is required for automatic versioning.}"
: "${ENH_API_HOST:?Configure ENH_API_HOST in the Xcode Cloud workflow.}"
: "${ENH_API_PATH:?Configure ENH_API_PATH in the Xcode Cloud workflow.}"

cd "$CI_PRIMARY_REPOSITORY_PATH"

# React Native 0.84 requires Node >= 22.11. Use Homebrew so the build does
# not depend on the Node or Ruby versions preinstalled on the Xcode image.
brew install node@22 ruby@3.4
export PATH="$(brew --prefix node@22)/bin:$(brew --prefix ruby@3.4)/bin:$PATH"

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 11) ? 0 : 1)'

# Gemfile.lock pins the CocoaPods dependency graph. Install it with a
# Homebrew Ruby 3.4 rather than the legacy macOS system Ruby or Ruby 4.
gem install bundler -v 2.3.3 --no-document
bundle config set --local deployment true
bundle config set --local path vendor/bundle
bundle install --jobs 4 --retry 3

# .env is intentionally ignored by Git. Xcode Cloud injects these workflow
# environment variables; neither values nor credentials are committed.
printf 'API_HOST=%s\nAPI_PATH=%s\n' "$ENH_API_HOST" "$ENH_API_PATH" > .env

npm ci

# Each Xcode Cloud build receives a unique CI_BUILD_NUMBER. agvtool updates
# both configurations so every TestFlight upload has a new CFBundleVersion.
(
  cd ios
  agvtool new-version -all "$CI_BUILD_NUMBER"
  bundle exec pod install --deployment
)
