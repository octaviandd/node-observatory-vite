/** @format */
import { BaseCard } from "./base-card"

type Props = {
  view: any
}

export default function ViewCard({ view }: Props) {
  const duration = Number(view.content.duration)
  const formattedDuration = duration > 999 
    ? `${(duration / 1000).toFixed(2)}s` 
    : `${duration}ms`

  return (
    <BaseCard
      date={view.created_at}
      metadata={formattedDuration}
      content={view.content.data}
      file={view.content.file}
      line={view.content.line}
      linkPath={`/view/${view.uuid}`}
    />
  )
}
