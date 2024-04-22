import { Router } from '@solidjs/router'
import { FileRoutes } from '@solidjs/start/router'
import { Suspense } from 'solid-js'
import './app.css'
import { cn } from './utils/cn'

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
