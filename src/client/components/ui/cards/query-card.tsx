/** @format */

import { BaseCard } from "./base-card"

type Props = {
  item: any
}

export default function QueryCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={`${Number(item.content.duration).toFixed(2)}ms`}
      content={item.content.sql}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/query/${item.uuid}`}
      language="sql"
      package={item.content.package}
    />
  )
}
