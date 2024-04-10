import { JSX, ParentComponent } from 'solid-js'
import { cn } from '~/utils/cn'

export const Table: ParentComponent<JSX.HTMLAttributes<HTMLTableElement>> = (props) => {
  return (
    <table
      {...props}
      class={cn('table-fixed rounded-lg border border-primary bg-background font-mono text-background-fg', props.class)}
    >
      {props.children}
    </table>
  )
}

export const TableHeader: ParentComponent<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  return (
    <thead {...props} class={cn('', props.class)}>
      {props.children}
    </thead>
  )
}

export const TableBody: ParentComponent<JSX.HTMLAttributes<HTMLTableSectionElement>> = (props) => {
  return (
    <tbody {...props} class={cn('', props.class)}>
      {props.children}
    </tbody>
  )
}

export const TableRow: ParentComponent<JSX.HTMLAttributes<HTMLTableRowElement>> = (props) => {
  return (
    <tr {...props} class={cn('', props.class)}>
      {props.children}
    </tr>
  )
}

export const TableHead: ParentComponent<JSX.ThHTMLAttributes<HTMLTableCellElement>> = (props) => {
  return (
    <th {...props} class={cn('border border-primary px-3 py-2 font-bold', props.class)}>
      {props.children}
    </th>
  )
}

export const TableCell: ParentComponent<JSX.TdHTMLAttributes<HTMLTableCellElement>> = (props) => {
  return (
    <td {...props} class={cn('border border-primary px-3 py-2', props.class)}>
      {props.children}
    </td>
  )
}
