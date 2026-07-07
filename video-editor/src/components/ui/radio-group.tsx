"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
                      className,
                      ...props
                    }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(
        "group/radio-group flex w-fit items-center rounded-md bg-transparent dark:bg-input/30 border border-input p-[1px] gap-1",
        className
      )}
      {...props}
    />
  )
}

function RadioGroupItem({
                          className,
                          children,
                          ...props
                        }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "h-full inline-flex items-center justify-center rounded-sm text-sm font-normal transition-all outline-none px-3",
        "min-w-0 flex-1 shrink-0",
        "text-muted-foreground",
        "data-[state=checked]:bg-input data-[state=checked]:text-secondary-foreground data-[state=checked]:shadow-xs",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }