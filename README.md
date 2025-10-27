
-----------BACKEND CHANGES
Application.yml
add url http://localhost:3000 in CORS_ALLOWED_ORIGINS

SecurityConfiguration.java
    add import
        import com.google.cloud.storage.HttpMethod;

in securityFilterChain
    add this after permit all
            .permitAll()
            .requestMatchers(String.valueOf(HttpMethod.OPTIONS), "/**").permitAll()
            .anyRequest().authenticated()

in corsConfigurationSource
    add this
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));



Open terminal in project directory and run 
npm install

once done run 
npm run dev 
to start the server

 
Right now sidebar contains only order and delivery zones for demo
Check components/Sidebar.tsx

For baseurl check file service/apiService.ts






## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


