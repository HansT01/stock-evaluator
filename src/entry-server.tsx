// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server'

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang='en'>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta
            name='description'
            content="Quickly evaluate a stock's intrinsic value based solely on its financials, against its market price."
          />
          <title>Stock Evaluator</title>
          <link rel='icon' href='/favicon.ico' />
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin='' />
          {assets}
        </head>
        <body>
          <div id='app'>{children}</div>
          {scripts}
          {/* Cloudflare Web Analytics */}
          <script
            defer
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "9b2e95677fb14a94b3b1af022ea3e1d9"}'
          />
        </body>
      </html>
    )}
  />
))
