# Backend for Messaging App

## Things Learned

- `tsc --init` will setup a default `tsconfig.json` file that has all the possible options included with comments next to each one describing what they do. Great way to learn about how tsconfig.json really works
- Prestart/prebuild scripts in `package.json` allowing something like this where you run one command but under the hood it does 4

```js
    "prebuild": "tslint -c tslint.json -p tsconfig.json --fix",
    "build": "tsc",
    "prestart": "npm run build",
    "start": "node ."
```

- The difference between `app.listen()` and `server.listen()` when building an Express app

## Resources Used

- Express Typescript start example
  https://developer.okta.com/blog/2018/11/15/node-express-typescript

- fix weird "npm WARN lifecycle The node binary used for scripts" issue
  https://stackoverflow.com/questions/51293566/how-to-include-the-path-for-the-node-binary-npm-was-executed-with

- The Twelve Factor App ("store config in the environment")
  https://12factor.net/config

- Ultimate Guide to NodeJS logging
  https://www.loggly.com/ultimate-guide/node-logging-basics/

- WebSocket + Express + TypeScript
  https://medium.com/factory-mind/websocket-node-js-express-step-by-step-using-typescript-725114ad5fe4

- App.listen vs server.listen (Express)
  https://stackoverflow.com/questions/17696801/express-js-app-listen-vs-server-listen


    ## Considerations
    WebSocket vs. Socket.IO
