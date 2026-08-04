export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#FAFAFA] tracking-tight">
          DPLOY
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#111113] py-8 px-4 shadow-xl border border-[#27272A] sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
