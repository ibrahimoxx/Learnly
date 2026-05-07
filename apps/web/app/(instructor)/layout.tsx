import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[--color-surface]">{children}</main>
    </>
  );
}
