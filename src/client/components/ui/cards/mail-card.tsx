/** @format */
import { BaseCard } from "./base-card";

type Props = {
  item: any;
};

export default function MailCard({ item }: Props) {
  return (
    <BaseCard
      date={item.created_at}
      metadata={item.content.package ?? "nodemailer"}
      content={{
        from: item.content.from,
        to: item.content.to
      }}
      file={item.content.file}
      line={item.content.line}
      linkPath={`/mail/${item.uuid}`}
    />
  );
}
