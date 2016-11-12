# DataFire

DataFire is an open source integration framework. It is built on top of open standards such as
RSS and [Open API](https://github.com/OAI/OpenAPI-Specification), and can be run locally, on
AWS Lambda, on the [Serverless](https://github.com/serverless/serverless) framework, or on
[DataFire.io](https://datafire.io)

DataFire natively supports over
[250 public APIs](https://github.com/APIs-guru/openapi-directory) including:

&bull; Slack &bull; GitHub &bull; Twilio &bull; Trello &bull; Spotify &bull;
Instagram &bull; Gmail &bull; Google Analytics &bull; YouTube &bull;

as well as common databases, RSS feeds, and [custom integrations](docs/Integrations.md).

## Installation
> Be sure to install DataFire both globally and as a project dependency.

```
npm install -g bobby-brennan/datafire
npm install --save bobby-brennan/datafire
```

## Examples
* [Quickstart](examples/quickstart)
* [Authentication](examples/authentication)
* [Error Handling](examples/error_handling)
* [News Headlines](examples/headlines) - Send yourself a daily e-mail with headlines from NPR, CNN, and NYTimes

## Exploring Integrations
![Exploing Integrations](./docs/explore.gif)

## Commands
> Run `datafire --help` or `datafire <command> --help` for more info

```bash
datafire list -a   # View all available integrations
datafire list      # View installed integrations

datafire integrate gmail   # Add integrations by name (or a substring)

datafire describe gmail                                # Show info and operations
datafire describe gmail -o gmail.users.messages.list   # Show operation details
datafire describe gmail -o "GET /{userId}/messages"    # Alternative operation name

datafire authenticate gmail   # Store credentials for later use

# Make a test call to the API
datafire call github -o "GET /users"
# Use stored credentials with --as
datafire call github -o "GET /user" --as account_alias
# Pass parameters with --params.foo
datafire call github -i "GET /users/{username}" --params.username karpathy

# Run a flow
datafire run ./getMessages.js  
```

## Writing Flows
> See [Flows.md](./docs/Flows.md) for the full documentation

### Quickstart
> You can view this flow in the [examples directory](./examples/quickstart).

This quick tutorial will fetch stories from Hacker News, get the details
for the top story, then store the results to a local file.

First, let's create a new folder and add the Hacker News integration:
```
mkdir hacker_news_flow
cd hacker_news_flow
datafire integrate hacker_news
```

Now we can create a Flow. Edit `./getTopStory.js`:
```js
const datafire = require('datafire');
const fs = require('fs');
const hacker_news = datafire.Integration.new('hacker_news');

const flow = module.exports =
      new datafire.Flow('copyStory', 'Copies the top HN story to a local file');

flow
  .step('stories', {
    do: hacker_news.getStories(),
    params: {storyType: 'top'},
  })

  .step('story_details', {
    do: hacker_news.getItem(),
    params: data => {
      return {itemID: data.stories[0]}
    }
  })

  .step('write_file', {
    do: data => {
      fs.writeFileSync('./story.json', JSON.stringify(data.story_details, null, 2));
    }
  });
```

Now let's run it:
```
datafire run -f ./getTopStory.js
```
You should see `story.json` in your current directory.

## Authentication
> See [Authentication.md](./docs/Authentication.md) for the full documentation

DataFire can store authentication details for multiple accounts for each integration,
and supports basic authentication (username/password), API keys, and OAuth 2.0.

## Running Flows
> See [RunningFlows.md](./docs/RunningFlows.md) for the full documentation

Once you've written a flow, you have a number of options for running it:

* Manually on the command line
* On a schedule with cron
* On AWS Lambda
* Inside a Serverless project
* On [DataFire.io](https://datafire.io)

Lamdba, Serverless, and DataFire all offer ways to run your flow
either on a schedule or in response to HTTP requests (webhooks).

Read [RunningFlows.md](docs/RunningFlows.md) to learn more.
