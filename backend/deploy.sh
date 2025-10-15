#!/bin/bash

# PlantGenius Backend Deployment Script
# Usage: ./deploy.sh [railway|render|heroku]

set -e

PLATFORM=${1:-railway}

echo "🚀 Deploying PlantGenius Backend to $PLATFORM..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one from .env.example"
    exit 1
fi

case $PLATFORM in
  railway)
    echo "📦 Deploying to Railway..."
    railway up
    echo "✅ Deployed to Railway"
    echo "🔗 URL: Check Railway dashboard"
    ;;

  render)
    echo "📦 Deploying to Render..."
    echo "⚠️  Manual deployment required:"
    echo "   1. Go to https://render.com"
    echo "   2. Create new Web Service"
    echo "   3. Connect GitHub repo"
    echo "   4. Set root directory to 'backend'"
    echo "   5. Add environment variables"
    ;;

  heroku)
    echo "📦 Deploying to Heroku..."

    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "❌ Heroku CLI not installed"
        echo "Install: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi

    # Create app if it doesn't exist
    APP_NAME="plantgenius-api-$(date +%s)"
    heroku create $APP_NAME

    # Add MongoDB
    heroku addons:create mongodbatlas:free -a $APP_NAME

    # Set environment variables
    echo "Setting environment variables..."
    heroku config:set JWT_SECRET=$(openssl rand -base64 32) -a $APP_NAME
    heroku config:set NODE_ENV=production -a $APP_NAME

    # Deploy
    git subtree push --prefix backend heroku master

    echo "✅ Deployed to Heroku"
    echo "🔗 URL: https://$APP_NAME.herokuapp.com"
    ;;

  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Usage: ./deploy.sh [railway|render|heroku]"
    exit 1
    ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo "Don't forget to:"
echo "  1. Set all environment variables"
echo "  2. Update mobile app's MONGODB_API_URL"
echo "  3. Test the API with: curl <url>/health"
