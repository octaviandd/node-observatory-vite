/** @format */
import { BaseCard } from "./base-card";

type Props = {
  item: any;
};

export default function LogCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.level.toUpperCase()}
      content={item.content.message}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/log/${item.uuid}`}
      package={item.content.package}
    />
  );
}
