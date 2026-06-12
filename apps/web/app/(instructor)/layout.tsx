import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import { InstructorSidebar } from "@/components/shared/instructor-sidebar";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = user.publicMetadata?.role as string | undefined;
  if (role !== "instructor" && role !== "admin") redirect("/");

  return (
    <>
      <Navbar />
      <div className="premium-shell flex min-h-screen">
        <InstructorSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </>
  );
}
