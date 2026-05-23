import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudGuard",
  description: "AWS Cloud Security Posture Management",
};

type Props = {
  children: React.ReactNode;
};

export default function AccountLayout({ children }: Props) {
  return children;
}
