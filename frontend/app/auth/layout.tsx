import Link from "next/link";

export default function AuthLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-4">
         <Link href="/" className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">
               DPLOY
            </h1>
         </Link>
         {children}
      </div>
   );
}
