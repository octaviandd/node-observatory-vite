/** @format */
import { BaseCard } from "./base-card"

type Props = {
  item: any
}

export default function ExceptionCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      content={item.content.message}
      file={item.content.file}
      line={item.content.line}
      package={item.content.type}
      linkPath={`/exception/${item.uuid}`}
    />
  )
}