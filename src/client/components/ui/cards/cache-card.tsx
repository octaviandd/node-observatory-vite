/** @format */

import { BaseCard } from "./base-card"

type Props = {
  item: any
}

export default function CacheCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      content={{
        key: item.content.key,
        value: item.content.value
      }}
      file={item.content.file}
      line={item.content.line}
      package={item.content.package}
      linkPath={`/cache/${item.uuid}`}
    />
  )
}
