import type { Proof } from "@/lib/types"

import Box from "@/components/svgs/box.svg"
import BoxDashed from "@/components/svgs/box-dashed.svg"

import { cn } from "@/lib/utils"

import { MetricInfo } from "./ui/metric"

import { isCompleted } from "@/lib/proofs"

type ProofStatusProps = React.HTMLAttributes<HTMLDivElement> & {
  proofs: Proof[]
}
const ProofStatus = ({ proofs, className, ...props }: ProofStatusProps) => {
  const completedProofs = proofs.filter(isCompleted)
  const provingProofs = proofs.filter((p) => p.proof_status === "proving")
  const queuedProofs = proofs.filter((p) => p.proof_status === "queued")

  return (
    <div
      className={cn("flex items-center gap-3 font-mono", className)}
      {...props}
    >
      <div className="flex items-center gap-1">
        <MetricInfo
          trigger={
            <div className="flex flex-nowrap items-center gap-1">
              <Box className="text-primary" />
              <span className="block">{completedProofs.length}</span>
            </div>
          }
        >
          <span className="!font-body text-body">
            Number of completed proofs that have been published for this block
          </span>
        </MetricInfo>
      </div>
      <div className="flex items-center gap-1">
        <MetricInfo
          trigger={
            <div className="flex flex-nowrap items-center gap-1">
              <BoxDashed className="text-primary" />
              <span className="block">{provingProofs.length}</span>
            </div>
          }
        >
          <span className="!font-body text-body">
            Number of provers currently generating proofs for this block
          </span>
        </MetricInfo>
      </div>
      <div className="flex items-center gap-1">
        <MetricInfo
          trigger={
            <div className="flex flex-nowrap items-center gap-1">
              <Box className="text-body-secondary" />
              <span className="block">{queuedProofs.length}</span>
            </div>
          }
        >
          <span className="!font-body text-body">
            Number of provers who have indicated intent to prove this block
          </span>
        </MetricInfo>
      </div>
    </div>
  )
}

export default ProofStatus
