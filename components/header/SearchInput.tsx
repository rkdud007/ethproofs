"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useDebounceValue, useEventListener } from "usehooks-ts"
import { isHash } from "viem"
import { useQuery } from "@tanstack/react-query"

import { BlockBase } from "@/lib/types"

import Magnifier from "@/components/svgs/magnifier.svg"
import { Input } from "@/components/ui/input"

import { cn } from "@/lib/utils"

import { useContainerQuery } from "@/hooks/useContainerQuery"
import useSearchKeyboardShortcuts from "@/hooks/useSearchKeyboardShortcuts"

const DEBOUNCE = 250 // ms delay before querying database
const PLACEHOLDER = "Search by block number or hash"
const k = 6.5

const SearchInput = ({
  className,
  onSubmit,
}: React.HTMLAttributes<HTMLInputElement> & { onSubmit?: () => void }) => {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [deferredQuery] = useDebounceValue(query, DEBOUNCE)

  const { data: blockMatch, isLoading } = useQuery<
    (BlockBase & { proofs: { proof_status: string }[] }) | null
  >({
    queryKey: ["blocks", deferredQuery],
    queryFn: async () => {
      const response = await fetch(`/api/blocks/search?query=${deferredQuery}`)
      return response.json()
    },
    enabled: !!deferredQuery,
  })

  const handleSubmit = () => {
    setQuery("")
    if (!onSubmit) return
    onSubmit()
  }

  useEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !blockMatch) return
    const path = `/block/${blockMatch[isHash(query) ? "hash" : "block_number"]}`
    handleSubmit()
    router.push(path)
  })

  const { inputRef } = useSearchKeyboardShortcuts()

  const { isLarge, containerRef } = useContainerQuery(PLACEHOLDER.length * k)

  const placeholder = isLarge ? PLACEHOLDER : PLACEHOLDER.split(" ")[0]

  return (
    <div ref={containerRef} className={cn("relative z-0 w-full", className)}>
      <Input
        ref={inputRef}
        type="search"
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        value={query}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 end-0 flex items-center pe-4 lg:m-0",
          !!query.length && "hidden"
        )}
      >
        <Magnifier className="text-primary" />
      </div>
      {!!query.length && (
        <div className="absolute inset-x-0 top-0 -z-10 flex h-fit flex-col rounded-b-2xl rounded-t-3xl border border-primary bg-background bg-gradient-to-b from-white/[0.06] to-white/[0.12] px-2 pb-2 pt-[3.5rem] lg:m-0">
          {blockMatch ? (
            <Link
              href={`/block/${blockMatch[isHash(query) ? "hash" : "block_number"]}`}
              className="rounded-lg border border-primary-light bg-background-active p-2"
              onClick={handleSubmit}
            >
              <div className="flex justify-between">
                <span className="block text-sm text-primary">
                  <span className="font-body">Block: </span>
                  {blockMatch.block_number}
                </span>
                <span className="block text-sm text-primary">
                  <span className="font-body">Proofs:</span>{" "}
                  {
                    blockMatch.proofs.filter((p) => p.proof_status === "proved")
                      .length
                  }
                  <span className="text-xs text-body-secondary">
                    /{blockMatch.proofs.length}
                  </span>
                </span>
              </div>
              <span className="block text-sm text-primary">
                <span className="font-body">Hash: </span>
                <span className="block truncate">{blockMatch.hash}</span>
              </span>
            </Link>
          ) : (
            <div className="rounded-lg border border-primary-light bg-background-active p-2">
              {isLoading ? "Loading" : "No results"}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchInput
