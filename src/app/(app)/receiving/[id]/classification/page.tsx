import RawTireClassificationPage from "@/components/weighbridge/RawTireClassificationPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReceivingClassificationPage({ params }: Props) {
  const { id } = await params;
  return <RawTireClassificationPage ticketId={id} />;
}
