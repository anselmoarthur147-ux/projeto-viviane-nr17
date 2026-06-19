import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GESTÃO DE AÇÕES ERGONÔMICAS - NR 17" },
      {
        name: "description",
        content:
          "GESTÃO DE AÇÕES ERGONÔMICAS - NR 17. Painel executivo SUMITOMO com filtros por área, status, risco e prazo, conectado em tempo real à planilha oficial.",
      },
      { name: "author", content: "Labor Health" },
      { property: "og:title", content: "GESTÃO DE AÇÕES ERGONÔMICAS - NR 17" },
      {
        property: "og:description",
        content:
          "Painel Executivo - SUMITOMO. GESTÃO DE AÇÕES ERGONÔMICAS - NR 17.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GESTÃO DE AÇÕES ERGONÔMICAS - NR 17" },
      { name: "twitter:description", content: "Painel Executivo - SUMITOMO. GESTÃO DE AÇÕES ERGONÔMICAS - NR 17." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3813a5a6-35cf-455a-982f-6b307c89d192/id-preview-bd935808--83cd8990-754e-4ca9-929b-bf8de9bad80e.lovable.app-1776966940591.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3813a5a6-35cf-455a-982f-6b307c89d192/id-preview-bd935808--83cd8990-754e-4ca9-929b-bf8de9bad80e.lovable.app-1776966940591.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
