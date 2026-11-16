# Easync

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Deployment

The production frontend is served from `https://ia.unimas.my/easync/`, so the production
configuration in `angular.json` sets `baseHref: "/easync/"`. That makes every asset reference
(`fabric.min.js`, `icons.svg`, `easync-logo.png`, `favicon.ico`, lazy chunks) and every router
link resolve under the `/easync/` prefix.

```bash
npm run build          # defaultConfiguration is production
```

Upload the contents of `dist/easync/browser/` to the web root of `https://ia.unimas.my/easync/`
(do not upload the `dist/easync/browser` directory itself, only its files).

The web server must serve `index.html` for unknown paths under `/easync/`, otherwise deep links
such as `/easync/diagrams/6` return 404 on refresh. For Apache:

```apache
Alias /easync /var/www/easync
<Directory /var/www/easync>
    FallbackResource /easync/index.html
</Directory>
```

For Nginx:

```nginx
location /easync/ {
    alias /var/www/easync/;
    try_files $uri $uri/ /easync/index.html;
}
```

The SPA talks to the API at `https://rekapi.unimas.my/easync` (see `src/app/core/api.config.ts`).
A different backend can be selected without rebuilding by defining the config before the bundle
loads in `index.html`:

```html
<script>
  window.__EASYNC_CONFIG__ = { apiBaseUrl: 'https://rekapi.unimas.my/easync' };
</script>
```

The backend must list `https://ia.unimas.my` in its CORS `allowed-origins` and use
`https://ia.unimas.my/easync` as `frontend-url` so the OAuth handoff redirects back into the SPA.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## User manual

The end-user guide is a standalone page at [`public/manual.html`](public/manual.html), so a build
publishes it to `dist/easync/browser/manual.html` and it is served at
`https://ia.unimas.my/easync/manual.html` (locally: `http://localhost:4200/manual.html`). The app
links to it with the relative URL `manual.html`, which resolves under the `/easync/` base href.
Links live on the sign-in card and in the projects top bar (book icon, opens in a new tab).
