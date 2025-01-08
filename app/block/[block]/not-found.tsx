import Box from "@/components/svgs/box.svg"
import { ButtonLink } from "@/components/ui/button"
import { Divider } from "@/components/ui/divider"
import Link from "@/components/ui/link"

import { SITE_REPO } from "@/lib/constants"

export default async function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Box className="size-40 stroke-[0.5px] text-body-secondary" />
      <h1 className="mb-4 font-mono text-3xl text-primary">
        No block found with proofs
      </h1>
      <p className="text-lg">
        This block does not have proofs or was not proven by any of our
        supported providers
      </p>
      <p className="text-lg">
        If this a bug please report on our{" "}
        <Link href={new URL(SITE_REPO, "https://github.com").toString()}>
          GitHub
        </Link>{" "}
        repo
      </p>
      <Divider className="my-6" />
      <ButtonLink href="/" variant="outline" size="lg">
        Back to homepage
      </ButtonLink>
    </div>
  )
}
