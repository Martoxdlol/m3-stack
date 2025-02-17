# m3-Stack

m3-stack is a library with a set of tools and utilities to build a web app with "single page app" with react
and backend with nodejs.

It provides great defaults for creating a new app, bundling backend and frontend code, deploying to providers like Vercel.
It also provides many importable modules to help you build your app faster.

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

Simple SPA stack for building a web app with react.

Will include:

- React
- TailwindCSS
- BetterAuth
- Hono
- tRPC
- Drizzle ORM

# `better-auth` Setup

1. Run:

```bash
npx @better-auth/cli generate
```

2. Copy output schema to the `src/db/schema/auth.ts` file. You can add things or change things. Be careful to not break important things.
