/** @format */
import { BaseCard } from "./base-card"

type Props = {
  item: any
}

export default function NotificationCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.method.toUpperCase()}
      content={item.content.event}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/notification/${item.uuid}`}
    />
  )
}
