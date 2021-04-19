# Little

A minimalistic connect-like web framework. Automatically works out of the box
with [Deno Deploy](https://deno.com/deploy), Native HTTP(S) and Deno's standard
http(s) server.

## Usage

```ts
// Imports
import App from "https://deno.land/x/little/mod.ts";

// Create a new application.
const app = new App();

// Add middlewares to the application.
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(
    `${ctx.method} ${ctx.response?.status ?? "???"} ${ctx.url} ${Date.now() -
      start}ms`,
  );
});

app.use(async (ctx) => {
  await ctx.respond(new Response("Hello"));
});

// Automatically detect environment.
const strategy = app.detect({
  // Define listen options,
  // just incase the script
  // isn't running on Deno
  // Deploy.
  port: 3000,
  hostname: "0.0.0.0",
});

// Print the server strategy.
console.log("Using strategy", strategy);
```

```sh
deployctl run example.ts
# Using strategy deploy
```

```sh
deno run --unstable --allow-net example.ts
# Using strategy native
```

```sh
deno run --allow-net example.ts
# Using strategy std
```
