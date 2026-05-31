import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import { StudentSidebar } from "@/components/shared/student-sidebar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-[--color-surface]">
        <StudentSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
