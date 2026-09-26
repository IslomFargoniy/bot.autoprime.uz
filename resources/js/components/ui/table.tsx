import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-800 shadow-xs"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-xs text-left", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-gray-50/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-gray-100 dark:divide-gray-700/60 [&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-3 text-left align-middle font-semibold text-gray-600 dark:text-gray-300 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700 dark:text-gray-200",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function TableEmpty({
  icon: Icon,
  title,
  description,
  colSpan = 10,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode
  title: string
  description?: string
  colSpan?: number
  action?: React.ReactNode
}) {
  const renderIcon = () => {
    if (!Icon) return null
    if (React.isValidElement(Icon)) return Icon
    const Component = Icon as React.ComponentType<{ className?: string }>
    return <Component className="w-8 h-8 text-gray-400 dark:text-gray-500" />
  }

  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          {renderIcon()}
          <p className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{title}</p>
          {description && (
            <p className="text-gray-400 dark:text-gray-500 text-[11px] max-w-sm">
              {description}
            </p>
          )}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </td>
    </tr>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
}
