# ![alt text](https://github.githubassets.com/images/icons/emoji/unicode/1f510.png) nextjs-base-project

Example showing a custom sign-in page using NextAuth.js with Two Factor Authentication using [TOTP algorithm](https://en.wikipedia.org/wiki/Time-based_one-time_password).

## 📦 Technologies
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fedson-k%2Fnextjs-base-project%2Fmain%2Fpackage.json&query=%24.dependencies.next&label=NextJS)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fedson-k%2Fnextjs-base-project%2Fmain%2Fpackage.json&query=%24.dependencies%5B'next-auth'%5D&label=Next-Auth)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fedson-k%2Fnextjs-base-project%2Fmain%2Fpackage.json&query=%24.dependencies%5B'react'%5D&label=ReactJS)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fedson-k%2Fnextjs-base-project%2Fmain%2Fpackage.json&query=%24.dependencies%5B'%40chakra-ui%2Freact'%5D&label=%40chakra-ui%2Freact)


## DEMO
[https://nextjs-base-project.edsonk.com.br/](https://nextjs-base-project.edsonk.com.br/)

## Features
- Users can manage 2FA
- Enforce 2FA during login
- First class integration with NextAuth.js
- reCAPTCHA
- OTP

## 🚀 Getting Started

First, run the development server:

1. Install dependencies

```bash
$ npm Install
```

2. Start dev server

```bash
$ npm run dev
# or
$ yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛡 NextAuth.js

You will find more examples under https://next-auth.js.org/.

## reCAPTCHA
Create your reCAPTCHA key at http://www.google.com/recaptcha/admin

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
