import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import Header from '../components/Header';
import appCss from '../styles/index.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Quran Verse Identifier',
      },
      {
        name: 'description',
        content: 'Identify Quran verses from audio or text recordings',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
          <Header />
          <main className="flex-grow flex flex-col">
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
