/** @format */

import { BaseCard } from "./base-card"

type Props = {
  item: any
}

export default function JobCard({ item }: Props) {
  const content = {
    id: item.job_id,
    queue: item.content.queue,
    status: item.content.status,
    method: item.content.method,
  }

  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.duration}
      content={content}
      file={item.content.file}
      line={item.content.line}
      package={item.content.package ?? "bull"}
      linkPath={`/job/${item.uuid}`}
    />
  )
}
