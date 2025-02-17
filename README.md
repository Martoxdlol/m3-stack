# m3-Stack

m3-stack is a library with a set of tools and utilities to build, bundle and deploy web apps with react
and backend with nodejs.

It provides great defaults for creating a new app, bundling backend and frontend code, deploying to providers like Vercel.
It also provides many importable modules to help you build your app faster.

## Features

- Automatic zero config for
  - `drizzle-orm` and `drizzle-kit`
  - `better-auth`
  - `vite`
  - `PGLite` for instant local development
- Zero config for bundling frontend and backend
- Optional backend and frontend bundling
- Easy deploy to Vercel
- Optimized build output

## Message for a Human

I started this project recently, but in the process I've learnt a lot (more than what already knew) about build tools, cjs, esm,
frameworks and more.

It is not my first time trying to build a stack, a useful library or a framework. It won't be the last.

## SPA vs. NextJS like framework

This stack is not a framework like NextJS. It is a set of tools and utilities to help you build a web app with react.
This stack can also be used as backend only, or frontend only.

### Why not NextJS?

NextJS is a great framework, but it is not the only way to build a web app. This stack is a different approach to building a web app.
NextJS has some limitations.

### Control

NextJS is very limited in the control you can have over the backend. You can't control how your
server starts or how it listens to requests. You can't use websockets. NextJS middleware is very limited.
You also can't control how scripts, code or stuff is loaded into the client.

### Client side routing

NextJS with app-router requires you to hit the server for every route change. This makes
your app inevitably slower. You can't force a route to be client only
(even if root component is marker as 'use client'). You don't have control over routing at all.

There are many use cases when you want client side routing. Specially if you want your app to
be more responsive and with a native feeling. If your app needs to run offline it is much easier
to cache a single bundle and use client side routing than to cache every possible page with nextjs.

### Simplicity

A single frontend script and a single backend entrypoint it is much simpler than a a complex model
of server and client components, server and client layouts and all the complex stuff of frameworks like NextJS.

### Hosting

To be fair, NextJS isn't as bad to host. But, still it has its limitations and complexities to self host. With
a simple backend and frontend app it is as easy to start the server and serve static files. You can still host
a m3-stack app with Vercel or Netlify and get the benefits of serverless/edge and static files CDN.

### Costs

NextJS is unarguably more expensive to host than a simple nodejs server. In nextjs the server needs to process every
page request. And it get worse if you need to server render a lot of big react pages. With a SPA you only process
backend requests for api which in many cases is cached by the client (for example when using react-query)

### Local first

A SPA is a better fit for local first apps. Having more control over client and backend code allows you to
build a better local experience.

### Why do use NextJS?

NextJS is great for many use cases. It is a great framework for building a web app with server side rendering.
For blog, news, or any type of public static content it is a great choice. It has also faster first load times
and a lot of cool features like image optimization, static site generation, incremental static regeneration, etc.

NextJS has definitely better SEO and performance for public content. You can also build super complex giant apps
and probably achieve most or even all of the things you can do with a SPA. If you choose to use NextJS (or an alternative)
you will be totally fine, and even much better in many cases.

## Docs

**THIS IS A WORK IN PROGRESS**

### Create a new app

```bash
npx m3-stack create my-app
```

### Building app

Build frontend and backend.

```bash
npx m3-stack build
```

Output package can be found in dist folder. You can just copy the output and run it with node.
You don't need to install any dependencies to run bundled app.

It will automatically search for server entrypoint to bundle it.

Default paths:

- server.{ts,js,tsx,jsx}
- src/server.{ts,js,tsx,jsx}
- src/server/index.{ts,js,tsx,jsx}
- src/server/main.{ts,js,tsx,jsx}
- server/main.{ts,js,tsx,jsx}
- server/index.{ts,js,tsx,jsx}

It will automatically search for index html and `public/` dir to bundle client code.

Example dir structure:

```
my-app/
  public/
    index.html (with a script pointing to client/main.tsx)
  src/
    server/
      main.ts
    client/
      main.tsx
```

### Developing app

```bash
npx m3-stack dev
```

It will start a dev server for frontend and backend. It will watch for changes and rebuild automatically.
For the frontend, it will serve index.html on all routes.

For the backend, it will server the backend at '/api'. You can add more routes in config to be served from backend directly.
For example '/blog/(.\*)' can be served from backend instead of client app.

### Starter template

Include:

- React
- TailwindCSS
- BetterAuth
- Hono
- tRPC
- Drizzle ORM

### `better-auth` Setup

If you use your own implementation check better auth docs. On how to generate schema. I personally recommend using `drizzle-orm` which comes
by default with this stack.

**Using m3-stack defaults**

1. Add your auth instance to config file.

```ts
// m3-stack.config.ts
import { createConfig } from "m3-stack/config";
import { createAuth } from "./src/auth";
import { createDb, schema } from "./src/db";

const db = createDb();

export default createConfig({
    ...
    drizzleSchema: schema,
    betterAuth: createAuth({ db }),
    ...
})
```

2. Run:

```bash
npx m3-stack better-auth generate
```

3. Copy output schema to the `src/db/schema/auth.ts` file (or where you put your `drizzle-orm` schema).
   You can add columns to the schema but be careful to not break important things.
