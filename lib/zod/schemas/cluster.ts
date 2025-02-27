import z from ".."

import { AwsInstancePricingSchema } from "./aws-instance-pricing"

export const ClusterSchema = z.object({
  id: z.number().nullable(),
  nickname: z.string(),
  description: z.string().optional().nullable(),
  hardware: z.string().optional().nullable(),
  cycle_type: z.string().optional().nullable(),
  proof_type: z.string().optional().nullable(),
  cluster_configuration: z.array(
    z.object({
      instance_type_id: z.number(),
      instance_count: z.number(),
      aws_instance_pricing: AwsInstancePricingSchema.nullable(),
    })
  ),
})

export type Cluster = z.infer<typeof ClusterSchema>

const baseClusterSchema = z.object({
  nickname: z.string().max(50).openapi({
    description: "Human-readable name. Main display name in the UI",
    example: "ZKnight-01",
  }),
  description: z.string().max(200).optional().openapi({
    description: "Description of the cluster",
    example: "Primary RISC-V prover",
  }),
  hardware: z.string().max(200).optional().openapi({
    description: "Technical specifications",
    example: "RISC-V Prover",
  }),
  cycle_type: z.string().max(50).optional().openapi({
    description: "Type of cycle",
    example: "SP1",
  }),
  proof_type: z.string().max(50).optional().openapi({
    description:
      "Proof system used to generate proofs. (e.g., Groth16 or PlonK)",
    example: "Groth16",
  }),
})

export const createClusterSchema = baseClusterSchema.extend({
  configuration: z
    .array(
      z.object({
        instance_type: z.string().openapi({
          description: "Instance type from AWS pricing list",
          example: "c5.xlarge",
        }),
        instance_count: z.number().openapi({
          description: "Number of instances of this type",
          example: 10,
        }),
      })
    )
    .describe("Cluster configuration"),
})

export const singleMachineSchema = baseClusterSchema.extend({
  instance_type: z.string().openapi({
    description: "Instance type from AWS pricing list",
    example: "c5.xlarge",
  }),
})
