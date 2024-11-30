import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import prettyMilliseconds from "pretty-ms"

import type { Metric } from "@/lib/types"

import CopyButton from "@/components/CopyButton"
import Null from "@/components/Null"
import { HidePunctuation } from "@/components/StylePunctuation"
import ArrowDown from "@/components/svgs/arrow-down.svg"
import BookOpen from "@/components/svgs/book-open.svg"
import Box from "@/components/svgs/box.svg"
import Clock from "@/components/svgs/clock.svg"
import Cpu from "@/components/svgs/cpu.svg"
import DollarSign from "@/components/svgs/dollar-sign.svg"
import Hash from "@/components/svgs/hash.svg"
import Layers from "@/components/svgs/layers.svg"
import ProofCircle from "@/components/svgs/proof-circle.svg"
import TrendingUp from "@/components/svgs/trending-up.svg"
import { Button } from "@/components/ui/button"
import {
  HeroBody,
  HeroDivider,
  HeroItem,
  HeroItemLabel,
  HeroSection,
  HeroTitle,
} from "@/components/ui/hero"
import {
  MetricBox,
  MetricInfo,
  MetricLabel,
  MetricValue,
} from "@/components/ui/metric"

import { cn } from "@/lib/utils"

import { timestampToEpoch, timestampToSlot } from "@/lib/beaconchain"
import { getBlockValueType } from "@/lib/blocks"
import { intervalToReadable, renderTimestamp } from "@/lib/date"
import { getMetadata } from "@/lib/metadata"
import { formatNumber } from "@/lib/number"
import {
  getAvgCostPerMegaCycle,
  getAvgCostPerMegaGas,
  getAvgCostPerTx,
  getProofsAvgCost,
  getProofsAvgLatency,
} from "@/lib/proofs"
import { createClient } from "@/utils/supabase/client"

const supabase = createClient()

type BlockDetailsPageProps = {
  params: Promise<{ block: number }>
}

export async function generateMetadata({
  params,
}: BlockDetailsPageProps): Promise<Metadata> {
  const { block } = await params

  const { data, error } = await supabase
    .from("blocks")
    .select("*, proofs(*)")
    .eq(getBlockValueType(block), block)
    .single()

  return getMetadata({
    title: `Block ${error ? block : data.block_number}`,
  })
}

export default async function BlockDetailsPage({
  params,
}: BlockDetailsPageProps) {
  const { block } = await params

  const { data, error } = await supabase
    .from("blocks")
    .select("*, proofs(*)")
    .eq(getBlockValueType(block), block)
    .single()

  const { data: teams } = await supabase.from("teams").select("*")

  if (!data || error || !teams) notFound()

  const {
    timestamp,
    block_number,
    gas_used,
    total_fees,
    transaction_count,
    proofs,
    hash,
  } = data

  // TODO: Add proper descriptions
  const performanceItems: Metric[] = [
    {
      label: "Total proofs",
      description: "The total number of proofs generated by this prover.",
      value: formatNumber(proofs.length),
    },
    {
      label: "Avg latency",
      description: "The average time it takes to generate a proof.",
      value: formatNumber(getProofsAvgLatency(proofs), {
        style: "unit",
        unit: "second",
        unitDisplay: "narrow",
        maximumFractionDigits: 0,
      }),
    },
    {
      label: "Gas used",
      description: "The total gas used to generate all proofs.",
      value: formatNumber(gas_used),
    },
    {
      label: "Transaction count",
      description: "The total number of transactions in this block.",
      value: formatNumber(transaction_count),
    },
  ]

  const avgCostPerProof = getProofsAvgCost(proofs)

  const blockFeeMetrics: Metric[] = [
    {
      label: "total fees (gwei)",
      description: "The total fees collected in this block.",
      value: formatNumber(total_fees),
    },
    {
      label: "avg cost / proof",
      description: "The average cost of generating a proof.",
      value: formatNumber(avgCostPerProof, {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "cost / mega gas",
      description: "The cost of generating a proof per million gas.",
      value: formatNumber(getAvgCostPerMegaGas(avgCostPerProof, gas_used), {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "cost / mega cycle",
      description: "The cost of generating a proof per million cycles.",
      value: formatNumber(getAvgCostPerMegaCycle(proofs), {
        style: "currency",
        currency: "USD",
      }),
    },
    {
      label: "cost / transaction",
      description: "The cost of generating a proof per transaction.",
      value: formatNumber(getAvgCostPerTx(avgCostPerProof, transaction_count), {
        style: "currency",
        currency: "USD",
      }),
    },
  ]

  return (
    <div className="space-y-20">
      <HeroSection>
        <HeroTitle>
          <Box strokeWidth="1" className="text-6xl text-primary" />
          <h1 className="font-mono">
            <p className="text-sm font-normal md:text-lg">Block Height</p>
            <p className="text-3xl font-semibold tracking-wide">
              {block_number}
            </p>
          </h1>
        </HeroTitle>

        <HeroDivider />

        <HeroBody>
          <HeroItem>
            <HeroItemLabel>
              <Clock /> Time Stamp
            </HeroItemLabel>
            {renderTimestamp(timestamp)}
          </HeroItem>

          <div className="grid grid-cols-3 gap-6">
            <HeroItem>
              <HeroItemLabel>
                <Cpu /> Gas used
              </HeroItemLabel>
              <HidePunctuation>{formatNumber(gas_used)}</HidePunctuation>
            </HeroItem>

            <HeroItem>
              <HeroItemLabel>
                <Layers /> Slot
              </HeroItemLabel>
              <HidePunctuation>
                {formatNumber(timestampToSlot(timestamp))}
              </HidePunctuation>
            </HeroItem>

            <HeroItem>
              <HeroItemLabel>
                <BookOpen /> Epoch
              </HeroItemLabel>
              <HidePunctuation>
                {formatNumber(timestampToEpoch(timestamp))}
              </HidePunctuation>
            </HeroItem>
          </div>

          <HeroItem>
            <HeroItemLabel>
              <Hash /> Hash
            </HeroItemLabel>
            <div className="flex gap-2">
              <div className="truncate">{hash}</div>
              <CopyButton message={hash} />
            </div>
          </HeroItem>
        </HeroBody>
      </HeroSection>

      <div className="space-y-8">
        <section>
          <h2 className="flex items-center gap-2 text-lg font-normal text-primary">
            <TrendingUp /> Zero-knowledge proofs
          </h2>
          <div className="grid grid-cols-2 gap-x-8 sm:flex sm:flex-wrap">
            {performanceItems.map(({ label, description, value }, idx) => (
              <MetricBox key={idx}>
                <MetricLabel>
                  {label}
                  <MetricInfo>{description}</MetricInfo>
                </MetricLabel>
                <MetricValue>{value}</MetricValue>
              </MetricBox>
            ))}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-lg font-normal text-primary">
            <DollarSign /> Block fees
          </h2>
          <div className="grid grid-cols-2 gap-x-8 sm:flex sm:flex-wrap">
            {blockFeeMetrics.map(({ label, description, value }, idx) => (
              <MetricBox key={idx}>
                <MetricLabel>
                  {label}
                  <MetricInfo>{description}</MetricInfo>
                </MetricLabel>
                <MetricValue>{value}</MetricValue>
              </MetricBox>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-normal text-primary">
          <ProofCircle /> Proofs
        </h2>

        {proofs.map(
          ({
            proof_id,
            prover_duration,
            proof_latency,
            proving_cost,
            proving_cycles,
            user_id,
          }) => {
            const team = teams.find((t) => t.user_id === user_id)
            return (
              <div
                className={cn(
                  "grid grid-flow-dense grid-cols-4 grid-rows-3",
                  "sm:grid-rows-2",
                  "md:grid-cols-6-auto md:grid-rows-1"
                )}
                key={proof_id}
              >
                <div
                  className={cn(
                    "relative flex h-full items-center",
                    "col-span-3 col-start-1 row-span-1 row-start-1",
                    "sm:col-span-2 sm:col-start-1 sm:row-span-1 sm:row-start-1",
                    "md:col-span-1 md:col-start-1 md:row-span-1 md:row-start-1"
                  )}
                >
                  {team?.team_name && (
                    <Link
                      href={"/prover/" + team?.team_id}
                      className="text-2xl"
                    >
                      {team?.team_name}
                    </Link>
                  )}
                </div>
                <Button
                  variant="outline"
                  className={cn(
                    "ms-auto h-8 w-8 min-w-fit gap-2 self-center text-2xl text-primary",
                    "col-span-1 col-start-4 row-span-1 row-start-1",
                    "sm:col-span-2 sm:col-start-3 sm:row-span-1 sm:row-start-1",
                    "md:col-span-1 md:col-start-6 md:row-span-1 md:row-start-1"
                  )}
                >
                  <ArrowDown />
                  <span className="hidden text-nowrap text-xs font-bold sm:block md:hidden lg:block">
                    Download proof
                  </span>
                </Button>
                <MetricBox
                  className={cn(
                    "col-span-2 col-start-1 row-span-1 row-start-2",
                    "sm:col-span-1 sm:col-start-1 sm:row-span-1 sm:row-start-2",
                    "md:col-span-1 md:col-start-2 md:row-span-1 md:row-start-1"
                  )}
                >
                  <MetricLabel>
                    Time to proof
                    <MetricInfo>
                      The time it took to generate this proof, from when the
                      proving began to when it was complete.
                      <br />
                      (hours : minutes : seconds)
                    </MetricInfo>
                  </MetricLabel>
                  <MetricValue
                    title={
                      prover_duration
                        ? intervalToReadable(prover_duration as string)
                        : ""
                    }
                  >
                    {(prover_duration as string) || <Null />}
                  </MetricValue>
                </MetricBox>
                <MetricBox
                  className={cn(
                    "col-span-2 col-start-3 row-span-1 row-start-2",
                    "sm:col-span-1 sm:col-start-2 sm:row-span-1 sm:row-start-2",
                    "md:col-span-1 md:col-start-3 md:row-span-1 md:row-start-1"
                  )}
                >
                  <MetricLabel>
                    Latency
                    <MetricInfo>
                      Time delay from when a block is published, to when proof
                      has been posted
                      <br />
                      (seconds)
                    </MetricInfo>
                  </MetricLabel>
                  <MetricValue>
                    {proof_latency ? (
                      prettyMilliseconds(proof_latency)
                    ) : (
                      <Null />
                    )}
                  </MetricValue>
                </MetricBox>
                <MetricBox
                  className={cn(
                    "col-span-2 col-start-1 row-span-1 row-start-3",
                    "sm:col-span-1 sm:col-start-3 sm:row-span-1 sm:row-start-2",
                    "md:col-span-1 md:col-start-4 md:row-span-1 md:row-start-1"
                  )}
                >
                  <MetricLabel>
                    <span className="normal-case">{team?.team_name}</span> zk
                    <span className="uppercase">VM</span> cycles
                    <MetricInfo>
                      The number of cycles used by the prover to generate the
                      proof.
                    </MetricInfo>
                  </MetricLabel>
                  <MetricValue
                    title={proving_cycles ? formatNumber(proving_cycles) : ""}
                  >
                    {proving_cycles ? (
                      formatNumber(proving_cycles, {
                        notation: "compact",
                        compactDisplay: "short",
                        maximumSignificantDigits: 4,
                      })
                    ) : (
                      <Null />
                    )}
                  </MetricValue>
                </MetricBox>
                <MetricBox
                  className={cn(
                    "col-span-2 col-start-3 row-span-1 row-start-3",
                    "sm:col-span-1 sm:col-start-4 sm:row-span-1 sm:row-start-2",
                    "md:col-span-1 md:col-start-5 md:row-span-1 md:row-start-1",
                    "sm:max-md:text-end"
                  )}
                >
                  <MetricLabel className="sm:max-md:justify-end">
                    Proving cost
                    <MetricInfo>
                      The cost of generating this proof.
                      <br />
                      (USD)
                    </MetricInfo>
                  </MetricLabel>
                  <MetricValue>
                    {proving_cost ? (
                      formatNumber(proving_cost, {
                        style: "currency",
                        currency: "USD",
                      })
                    ) : (
                      <Null />
                    )}
                  </MetricValue>
                </MetricBox>
              </div>
            )
          }
        )}
      </section>
    </div>
  )
}
