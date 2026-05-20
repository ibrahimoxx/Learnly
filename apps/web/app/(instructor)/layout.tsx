import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "instructor" && role !== "admin") redirect("/");

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[--color-surface]">{children}</main>
    </>
  );
}
