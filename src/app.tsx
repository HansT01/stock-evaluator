import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import { cn } from './utils/cn'

import '@fontsource/inter/100.css'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import './app.css'

const themes = ['slate', 'chocolate', 'orchid']

export default function App() {
  return (
    <div class={cn('dark:dark bg-background text-background-fg', 'slate')}>
      <Router root={(props) => <Suspense>{props.children}</Suspense>}>
        <FileRoutes />
      </Router>
    </div>
  )
}
