import { type Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Metric } from "@/lib/types"

import LearnMore from "@/components/LearnMore"
import GitHub from "@/components/svgs/github.svg"
import Globe from "@/components/svgs/globe.svg"
import ProofCircle from "@/components/svgs/proof-circle.svg"
import TrendingUp from "@/components/svgs/trending-up.svg"
import XLogo from "@/components/svgs/x-logo.svg"
import DataTable from "@/components/ui/data-table"
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

import { FALLBACK_PROVER_LOGO_SRC, SITE_NAME } from "@/lib/constants"

import { columns } from "./columns"

import { getMetadata } from "@/lib/metadata"
import { formatNumber } from "@/lib/number"
import { getHost } from "@/lib/url"
import { createClient } from "@/utils/supabase/client"

type ProverPageProps = {
  params: Promise<{ machineId: number }>
}

export async function generateMetadata({
  params,
}: ProverPageProps): Promise<Metadata> {
  const { machineId } = await params

  const supabase = createClient()

  const { data: machine, error: machineError } = await supabase
    .from("prover_machines")
    .select("*")
    .eq("machine_id", machineId)
    .single()

  if (machineError || !machine)
    return { title: `Prover not found - ${SITE_NAME}` }

  return getMetadata({ title: `${machine.machine_name}` })
}

export default async function ProverPage({ params }: ProverPageProps) {
  const { machineId } = await params

  const supabase = createClient()

  const { data: machine, error: machineError } = await supabase
    .from("prover_machines")
    .select("*")
    .eq("machine_id", machineId)
    .single()

  const { data: proofs, error: proofError } = await supabase
    .from("proofs")
    .select("*")
    .eq("prover_machine_id", machineId)

  if (!machine || machineError || !proofs?.length || proofError)
    return notFound()

  // TODO: Dummy profile—Get prover profile info
  const profile = {
    contact: {
      url: "https://succinct.xyz",
      twitter: "succinctLabs",
      github: "succinctlabs",
    },
  }

  const totalProofs = proofs.length
  const avgZkVMCyclesPerProof = proofs.reduce(
    (acc, proof) => acc + (proof.proving_cycles as number),
    0
  )
  const proverTotalFees = proofs.reduce(
    (acc, proof) => acc + (proof.proving_cost as number),
    0
  )
  const avgCostPerProof = proverTotalFees / totalProofs

  const performanceItems: Metric[] = [
    {
      label: "Total proofs",
      description: "The total number of proofs generated by this prover.", // TODO: Add proper descriptions
      value: formatNumber(totalProofs),
    },
    {
      label: "Avg zkVM cycles per proof",
      description:
        "The average number of zkVM cycles required to generate a proof.", // TODO: Add proper descriptions
      value: formatNumber(avgZkVMCyclesPerProof),
    },
    {
      label: "Prover total fees",
      description:
        "The total fees accumulated by the prover for generating proofs.", // TODO: Add proper descriptions
      value: formatNumber(proverTotalFees, {
        style: "currency",
        currency: "USD",
        notation: "compact",
      }),
    },
    {
      label: "Avg cost per proof",
      description: "The average cost incurred for generating a single proof.", // TODO: Add proper descriptions
      value: formatNumber(avgCostPerProof, {
        style: "currency",
        currency: "USD",
      }),
    },
  ]

  return (
    <div className="space-y-20">
      <HeroSection>
        <HeroTitle className="h-20 items-center gap-6">
          <div className="relative h-20 w-56">
            <Image
              src={machine.logo_url || FALLBACK_PROVER_LOGO_SRC}
              alt={`${machine.machine_name || "Prover"} logo`}
              fill
              sizes="100vw"
              className="object-contain object-left"
            />
          </div>
          <h1 className="font-mono text-3xl font-semibold">
            {machine.machine_name}
          </h1>
        </HeroTitle>

        <HeroDivider />

        <HeroBody>
          <HeroItem className="hover:underline">
            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={profile.contact.url}
            >
              <HeroItemLabel className="text-body">
                <Globe className="text-body-secondary" />
                {getHost(profile.contact.url)}
              </HeroItemLabel>
            </Link>
          </HeroItem>
          <HeroItem className="hover:underline">
            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={new URL(
                profile.contact.twitter,
                "https://x.com/"
              ).toString()}
            >
              <HeroItemLabel className="text-body">
                <XLogo className="text-body-secondary" /> @
                {profile.contact.twitter}
              </HeroItemLabel>
            </Link>
          </HeroItem>
          <HeroItem className="hover:underline">
            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={new URL(
                profile.contact.github,
                "https://github.com"
              ).toString()}
            >
              <HeroItemLabel className="text-body">
                <GitHub className="text-body-secondary" />
                {profile.contact.github}
              </HeroItemLabel>
            </Link>
          </HeroItem>
        </HeroBody>
      </HeroSection>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-normal text-primary">
          <TrendingUp /> Prover performance
        </h2>
        <div className="flex flex-wrap gap-x-8">
          {performanceItems.map(({ label, description, value }) => (
            <MetricBox key={label}>
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
          <ProofCircle /> Proofs
        </h2>
        {/* TODO: Data table of proofs for prover */}
        <DataTable
          // className="" // TODO: Style data table
          columns={columns}
          data={proofs}
        />
      </section>

      <LearnMore />
    </div>
  )
}
