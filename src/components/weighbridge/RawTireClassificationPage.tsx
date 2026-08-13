"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";

type Props = {
  ticketId: string;
};

/** Shortcut เดิม — คัดแยกอยู่บนหน้าตั๋วแล้ว */
export default function RawTireClassificationPage({ ticketId }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/receiving/${ticketId}`);
  }, [router, ticketId]);

  return <PageLoading />;
}
