import { usePathname } from "next/navigation";

export default function PathName() {
  const pathname = usePathname();
  const firstSegment = pathname.split("/").filter(Boolean)[1] ?? "";
  return firstSegment;
}
