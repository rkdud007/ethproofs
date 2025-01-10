import { revalidateTag } from "next/cache"
import { ZodError } from "zod"

import { base64ToHex } from "@/lib/utils"

import { db } from "@/db"
import { blocks, programs, proofBinaries, proofs } from "@/db/schema"
import { withAuth } from "@/lib/auth/with-auth"
import { fetchBlockData } from "@/lib/blocks"
import { provedProofSchema } from "@/lib/zod/schemas/proof"

// TODO: refactor code to use baseProofHandler and abstract out the logic

export const POST = withAuth(async ({ request, user, timestamp }) => {
  const payload = await request.json()

  // TODO: remove when we go to production, this is a temporary log to debug the payload
  console.log("payload", payload)

  // validate payload schema
  let proofPayload
  try {
    proofPayload = provedProofSchema.parse(payload)
  } catch (error) {
    console.error("proof payload invalid", error)
    if (error instanceof ZodError) {
      return new Response(`Invalid payload: ${error.message}`, {
        status: 400,
      })
    }

    return new Response("Invalid payload", {
      status: 400,
    })
  }

  const { block_number, cluster_id, verifier_id, proof, ...restProofPayload } =
    proofPayload

  // validate block_number exists
  console.log("validating block_number", block_number)
  const block = await db.query.blocks.findFirst({
    columns: {
      block_number: true,
    },
    where: (blocks, { eq }) => eq(blocks.block_number, block_number),
  })

  // if block is new (not in db), fetch block data from block explorer and create block record
  if (!block) {
    console.log("block not found, fetching block data", block_number)
    let blockData
    try {
      blockData = await fetchBlockData(block_number)
    } catch (error) {
      console.error("error fetching block data", error)
      return new Response("Block not found", {
        status: 500,
      })
    }

    try {
      // create block
      console.log("creating block", block_number)
      await db.insert(blocks).values({
        block_number,
        gas_used: Number(blockData.gasUsed),
        transaction_count: blockData.txsCount,
        timestamp: new Date(Number(blockData.timestamp) * 1000).toISOString(),
        hash: blockData.hash,
      })

      // invalidate blocks cache
      revalidateTag("blocks")
    } catch (error) {
      console.error("error creating block", error)
      return new Response("Internal server error", { status: 500 })
    }
  }

  // get cluster uuid from cluster_id
  const cluster = await db.query.clusters.findFirst({
    columns: {
      id: true,
    },
    where: (clusters, { and, eq }) =>
      and(eq(clusters.index, cluster_id), eq(clusters.team_id, user.id)),
  })

  if (!cluster) {
    console.error("cluster not found", cluster_id)
    return new Response("Cluster not found", { status: 404 })
  }

  // create or get program id if it exists
  let programId: number | undefined
  if (verifier_id) {
    const existingProgram = await db.query.programs.findFirst({
      columns: {
        id: true,
      },
      where: (programs, { eq }) => eq(programs.verifier_id, verifier_id),
    })

    programId = existingProgram?.id

    if (!existingProgram) {
      console.info("no program found, creating program")

      try {
        const [program] = await db
          .insert(programs)
          .values({
            verifier_id,
          })
          .returning()

        programId = program?.id
      } catch (error) {
        console.error("error creating program", error)
      }
    }
  }

  const proofHex = base64ToHex(proof)

  // add proof
  const dataToInsert = {
    ...restProofPayload,
    block_number,
    cluster_id: cluster.id,
    program_id: programId,
    proof_status: "proved",
    proved_timestamp: timestamp,
    size_bytes: Buffer.byteLength(proofHex, "hex"),
    team_id: user.id,
  }

  console.log("adding proved proof", dataToInsert)

  try {
    const newProof = await db.transaction(async (tx) => {
      const [newProof] = await tx
        .insert(proofs)
        .values(dataToInsert)
        .onConflictDoUpdate({
          target: [proofs.block_number, proofs.cluster_id],
          set: {
            ...dataToInsert,
          },
        })
        .returning({ proof_id: proofs.proof_id })

      // add proof binary
      await tx
        .insert(proofBinaries)
        .values({
          proof_id: newProof.proof_id,
          proof_binary: `\\x${proofHex}`,
        })
        .onConflictDoUpdate({
          target: [proofBinaries.proof_id],
          set: {
            proof_binary: `\\x${proofHex}`,
          },
        })

      return newProof
    })

    // invalidate proofs cache
    revalidateTag("proofs")

    // return the generated proof_id
    return Response.json(newProof)
  } catch (error) {
    console.error("error adding proof", error)
    return new Response("Internal server error", { status: 500 })
  }
})
